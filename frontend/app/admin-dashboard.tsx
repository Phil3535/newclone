import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardData {
  overview: {
    total_leads: number;
    new_leads_this_month: number;
    total_reps: number;
    total_territories: number;
    total_revenue: number;
    monthly_revenue: number;
    conversion_rate: number;
    closed_deals_count: number;
    closed_this_month: number;
  };
  lead_status_breakdown: Record<string, number>;
  top_performers: {
    id: string;
    name: string;
    deals: number;
    revenue: number;
  }[];
  territory_performance: {
    id: string;
    name: string;
    leads: number;
    closed: number;
    conversion: number;
  }[];
  recent_activity: {
    leads: { id: string; name: string; status: string; created_at: string }[];
    proposals: { id: string; customer: string; value: number; created_at: string }[];
  };
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/dashboard`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: '#3b82f6',
      contacted: '#f59e0b',
      qualified: '#8b5cf6',
      appointment_set: '#06b6d4',
      closed_won: '#22c55e',
      closed_lost: '#ef4444',
    };
    return colors[status] || '#64748b';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load dashboard</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Company Overview</Text>
        </View>
        <TouchableOpacity 
          onPress={() => { setRefreshing(true); fetchDashboard(); }} 
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={24} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="people" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.kpiValue}>{data.overview.total_leads}</Text>
            <Text style={styles.kpiLabel}>Total Leads</Text>
            <Text style={styles.kpiChange}>+{data.overview.new_leads_this_month} this month</Text>
          </View>
          
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            </View>
            <Text style={styles.kpiValue}>{data.overview.closed_deals_count}</Text>
            <Text style={styles.kpiLabel}>Closed Deals</Text>
            <Text style={styles.kpiChange}>+{data.overview.closed_this_month} this month</Text>
          </View>
          
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="cash" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(data.overview.total_revenue)}</Text>
            <Text style={styles.kpiLabel}>Total Revenue</Text>
            <Text style={styles.kpiChange}>{formatCurrency(data.overview.monthly_revenue)} this month</Text>
          </View>
          
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="trending-up" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.kpiValue}>{data.overview.conversion_rate}%</Text>
            <Text style={styles.kpiLabel}>Conversion Rate</Text>
            <Text style={styles.kpiChange}>{data.overview.total_reps} reps</Text>
          </View>
        </View>

        {/* Lead Status Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lead Pipeline</Text>
          <View style={styles.pipelineContainer}>
            {Object.entries(data.lead_status_breakdown).map(([status, count]) => (
              <View key={status} style={styles.pipelineItem}>
                <View style={styles.pipelineBar}>
                  <View 
                    style={[
                      styles.pipelineFill, 
                      { 
                        backgroundColor: getStatusColor(status),
                        width: `${Math.min((count / data.overview.total_leads) * 100, 100)}%`
                      }
                    ]} 
                  />
                </View>
                <View style={styles.pipelineInfo}>
                  <Text style={styles.pipelineStatus}>{status.replace(/_/g, ' ')}</Text>
                  <Text style={styles.pipelineCount}>{count}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Top Performers */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Performers</Text>
          {data.top_performers.slice(0, 5).map((rep, index) => (
            <View key={rep.id} style={styles.performerRow}>
              <View style={styles.performerRank}>
                <Text style={styles.performerRankText}>{index + 1}</Text>
              </View>
              <View style={styles.performerInfo}>
                <Text style={styles.performerName}>{rep.name}</Text>
                <Text style={styles.performerStats}>{rep.deals} deals</Text>
              </View>
              <Text style={styles.performerRevenue}>{formatCurrency(rep.revenue)}</Text>
            </View>
          ))}
        </View>

        {/* Territory Performance */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Territory Performance</Text>
          {data.territory_performance.slice(0, 5).map((territory) => (
            <View key={territory.id} style={styles.territoryRow}>
              <View style={styles.territoryInfo}>
                <Text style={styles.territoryName}>{territory.name}</Text>
                <Text style={styles.territoryStats}>
                  {territory.leads} leads • {territory.closed} closed
                </Text>
              </View>
              <View style={[styles.conversionBadge, { 
                backgroundColor: territory.conversion >= 20 ? '#22c55e20' : '#f59e0b20' 
              }]}>
                <Text style={[styles.conversionText, {
                  color: territory.conversion >= 20 ? '#22c55e' : '#f59e0b'
                }]}>
                  {territory.conversion}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          <Text style={styles.activitySubtitle}>Recent Leads</Text>
          {data.recent_activity.leads.map((lead) => (
            <View key={lead.id} style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: getStatusColor(lead.status) }]} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{lead.name}</Text>
                <Text style={styles.activityMeta}>{lead.status.replace(/_/g, ' ')}</Text>
              </View>
            </View>
          ))}

          <Text style={[styles.activitySubtitle, { marginTop: 16 }]}>Recent Proposals</Text>
          {data.recent_activity.proposals.map((proposal) => (
            <View key={proposal.id} style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: '#3b82f6' }]} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{proposal.customer}</Text>
                <Text style={styles.activityMeta}>{formatCurrency(proposal.value)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/lead-import-export')}
            >
              <Ionicons name="cloud-upload" size={24} color="#22c55e" />
              <Text style={styles.actionText}>Import Leads</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/proposals')}
            >
              <Ionicons name="document-text" size={24} color="#3b82f6" />
              <Text style={styles.actionText}>Proposals</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/team-chat')}
            >
              <Ionicons name="chatbubbles" size={24} color="#8b5cf6" />
              <Text style={styles.actionText}>Team Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/lead-hunter')}
            >
              <Ionicons name="search" size={24} color="#f59e0b" />
              <Text style={styles.actionText}>Lead Hunter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    color: '#f59e0b',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#0a1628',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  kpiLabel: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  kpiChange: {
    color: '#22c55e',
    fontSize: 11,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  pipelineContainer: {
    gap: 12,
  },
  pipelineItem: {},
  pipelineBar: {
    height: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  pipelineFill: {
    height: '100%',
    borderRadius: 4,
  },
  pipelineInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pipelineStatus: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  pipelineCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  performerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  performerRankText: {
    color: '#0a1628',
    fontSize: 12,
    fontWeight: '700',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  performerStats: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  performerRevenue: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '700',
  },
  territoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  territoryInfo: {},
  territoryName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  territoryStats: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  conversionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  conversionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activitySubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    color: '#ffffff',
    fontSize: 14,
  },
  activityMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  actionsCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: (SCREEN_WIDTH - 76) / 2,
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
