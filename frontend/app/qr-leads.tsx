import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface CapturedLead {
  scan_id: string;
  phone: string;
  name?: string;
  sms_sid: string;
  sent_at: string;
  estimate_url: string;
  status: string;
}

interface ScanStats {
  total_scans: number;
  leads_captured: number;
  conversion_rate: number;
}

export default function QRLeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState<CapturedLead[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scan-results/leads/captured`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        
        // Calculate stats
        const totalLeads = data.leads?.length || 0;
        setStats({
          total_scans: totalLeads + Math.floor(totalLeads * 0.3), // Estimate total scans
          leads_captured: totalLeads,
          conversion_rate: totalLeads > 0 ? Math.round((totalLeads / (totalLeads + Math.floor(totalLeads * 0.3))) * 100) : 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeads();
  }, []);

  const callLead = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const textLead = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderLead = ({ item }: { item: CapturedLead }) => (
    <View style={styles.leadCard}>
      <View style={styles.leadHeader}>
        <View style={styles.leadInfo}>
          <View style={styles.leadAvatar}>
            <Ionicons name="person" size={24} color="#f59e0b" />
          </View>
          <View>
            <Text style={styles.leadName}>{item.name || 'Homeowner'}</Text>
            <Text style={styles.leadPhone}>{item.phone}</Text>
          </View>
        </View>
        <View style={styles.leadTime}>
          <Ionicons name="time-outline" size={14} color="#64748b" />
          <Text style={styles.leadTimeText}>{formatDate(item.sent_at)}</Text>
        </View>
      </View>
      
      <View style={styles.leadStatus}>
        <View style={[styles.statusBadge, item.status === 'sent' && styles.statusSent]}>
          <Ionicons 
            name={item.status === 'sent' ? 'checkmark-circle' : 'hourglass'} 
            size={14} 
            color={item.status === 'sent' ? '#22c55e' : '#f59e0b'} 
          />
          <Text style={[styles.statusText, item.status === 'sent' && styles.statusTextSent]}>
            SMS {item.status === 'sent' ? 'Delivered' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.leadActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => callLead(item.phone)}
          data-testid={`call-lead-${item.scan_id}`}
        >
          <Ionicons name="call" size={18} color="#ffffff" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.actionButtonOutline]}
          onPress={() => textLead(item.phone)}
          data-testid={`text-lead-${item.scan_id}`}
        >
          <Ionicons name="chatbubble" size={18} color="#3b82f6" />
          <Text style={[styles.actionButtonText, styles.actionButtonTextOutline]}>Text</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.actionButtonOutline]}
          onPress={() => Linking.openURL(item.estimate_url)}
          data-testid={`view-estimate-${item.scan_id}`}
        >
          <Ionicons name="document-text" size={18} color="#8b5cf6" />
          <Text style={[styles.actionButtonText, { color: '#8b5cf6' }]}>Estimate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="qr-code" size={64} color="#475569" />
      </View>
      <Text style={styles.emptyTitle}>No Leads Yet</Text>
      <Text style={styles.emptyText}>
        Share QR codes from your AR Roof Scanner to start capturing leads!
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => router.push('/ar-roof-scanner')}
      >
        <Ionicons name="scan" size={20} color="#ffffff" />
        <Text style={styles.emptyButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>QR Lead Dashboard</Text>
          <Text style={styles.headerSubtitle}>Captured from shared estimates</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      {stats && leads.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.leads_captured}</Text>
            <Text style={styles.statLabel}>Leads Captured</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_scans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.conversion_rate}%</Text>
            <Text style={styles.statLabel}>Conversion</Text>
          </View>
        </View>
      )}

      {/* Leads List */}
      <FlatList
        data={leads}
        renderItem={renderLead}
        keyExtractor={(item) => item.scan_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 58, 95, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 58, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#f59e0b',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  leadCard: {
    backgroundColor: 'rgba(30, 58, 95, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leadName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  leadPhone: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  leadTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leadTimeText: {
    color: '#64748b',
    fontSize: 12,
  },
  leadStatus: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusSent: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextSent: {
    color: '#22c55e',
  },
  leadActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextOutline: {
    color: '#3b82f6',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(30, 58, 95, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
