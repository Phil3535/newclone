import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useOfflineStore,
  syncPendingActions,
  getPendingActions,
  getCachedLeads,
  getCachedAppointments,
  getCachedTerritories,
  cacheLeads,
  cacheAppointments,
  cacheTerritories,
  checkNetworkStatus,
  clearOfflineData,
  OfflineAction,
} from '../src/services/offline';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface CacheStats {
  leads: number;
  appointments: number;
  territories: number;
  pendingActions: number;
}

export default function OfflineModeScreen() {
  const router = useRouter();
  const { isOnline, isSyncing, lastSyncTime, pendingActionsCount } = useOfflineStore();
  const [autoSync, setAutoSync] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    leads: 0,
    appointments: 0,
    territories: 0,
    pendingActions: 0,
  });
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [downloadingData, setDownloadingData] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    const [leads, appointments, territories, actions] = await Promise.all([
      getCachedLeads(),
      getCachedAppointments(),
      getCachedTerritories(),
      getPendingActions(),
    ]);

    setCacheStats({
      leads: leads?.length || 0,
      appointments: appointments?.length || 0,
      territories: territories?.length || 0,
      pendingActions: actions.length,
    });
    setPendingActions(actions);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkNetworkStatus();
    await loadCacheStats();
    setRefreshing(false);
  }, []);

  const downloadDataForOffline = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need to be online to download data for offline use.');
      return;
    }

    setDownloadingData(true);
    try {
      // Fetch all data from API
      const [leadsRes, appointmentsRes, territoriesRes] = await Promise.all([
        fetch(`${API_URL}/api/leads?limit=500`),
        fetch(`${API_URL}/api/appointments?limit=200`),
        fetch(`${API_URL}/api/territories`),
      ]);

      const leads = await leadsRes.json();
      const appointments = await appointmentsRes.json();
      const territories = await territoriesRes.json();

      // Cache all data
      await Promise.all([
        cacheLeads(Array.isArray(leads) ? leads : []),
        cacheAppointments(Array.isArray(appointments) ? appointments : []),
        cacheTerritories(Array.isArray(territories) ? territories : []),
      ]);

      await loadCacheStats();
      Alert.alert('Success', 'Data downloaded for offline use!');
    } catch (error) {
      console.error('Error downloading data:', error);
      Alert.alert('Error', 'Failed to download data. Please try again.');
    } finally {
      setDownloadingData(false);
    }
  };

  const syncNow = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need to be online to sync pending changes.');
      return;
    }

    if (pendingActionsCount === 0) {
      Alert.alert('No Changes', 'There are no pending changes to sync.');
      return;
    }

    try {
      const result = await syncPendingActions({
        createLead: async (data) => {
          const res = await fetch(`${API_URL}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          return res.json();
        },
        updateLead: async (id, data) => {
          const res = await fetch(`${API_URL}/api/leads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          return res.json();
        },
        createAppointment: async (data) => {
          const res = await fetch(`${API_URL}/api/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          return res.json();
        },
        updateAppointment: async (id, data) => {
          const res = await fetch(`${API_URL}/api/appointments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          return res.json();
        },
      });

      await loadCacheStats();
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${result.success} changes.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`
      );
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Failed', 'An error occurred while syncing. Please try again.');
    }
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Offline Data',
      'This will delete all cached data and pending changes. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearOfflineData();
            await loadCacheStats();
            Alert.alert('Cleared', 'All offline data has been cleared.');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'CREATE_LEAD':
        return 'person-add';
      case 'UPDATE_LEAD':
        return 'person';
      case 'CREATE_APPOINTMENT':
        return 'calendar';
      case 'UPDATE_APPOINTMENT':
        return 'calendar-outline';
      default:
        return 'sync';
    }
  };

  return (
    <SafeAreaView style={styles.container} data-testid="offline-mode-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Offline Mode</Text>
          <Text style={styles.subtitle}>Work without internet</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
      >
        {/* Connection Status */}
        <View style={[styles.statusCard, isOnline ? styles.onlineCard : styles.offlineCard]}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={isOnline ? 'wifi' : 'cloud-offline'}
              size={32}
              color={isOnline ? '#22c55e' : '#ef4444'}
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={styles.statusText}>
              {isOnline
                ? 'Connected to the internet'
                : 'Working in offline mode'}
            </Text>
          </View>
          {isSyncing && (
            <ActivityIndicator size="small" color="#f59e0b" />
          )}
        </View>

        {/* Sync Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Status</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Last Sync</Text>
                <Text style={styles.infoValue}>{formatDate(lastSyncTime)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Pending Changes</Text>
                <Text style={[styles.infoValue, pendingActionsCount > 0 && styles.pendingValue]}>
                  {pendingActionsCount}
                </Text>
              </View>
            </View>

            {/* Auto Sync Toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Auto-sync when online</Text>
                <Text style={styles.toggleDescription}>
                  Automatically sync changes when connected
                </Text>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: '#1e3a5f', true: '#f59e0b40' }}
                thumbColor={autoSync ? '#f59e0b' : '#64748b'}
              />
            </View>
          </View>
        </View>

        {/* Cached Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cached Data</Text>
          <View style={styles.cacheGrid}>
            <View style={styles.cacheItem}>
              <Ionicons name="people" size={24} color="#3b82f6" />
              <Text style={styles.cacheCount}>{cacheStats.leads}</Text>
              <Text style={styles.cacheLabel}>Leads</Text>
            </View>
            <View style={styles.cacheItem}>
              <Ionicons name="calendar" size={24} color="#22c55e" />
              <Text style={styles.cacheCount}>{cacheStats.appointments}</Text>
              <Text style={styles.cacheLabel}>Appointments</Text>
            </View>
            <View style={styles.cacheItem}>
              <Ionicons name="map" size={24} color="#f59e0b" />
              <Text style={styles.cacheCount}>{cacheStats.territories}</Text>
              <Text style={styles.cacheLabel}>Territories</Text>
            </View>
            <View style={styles.cacheItem}>
              <Ionicons name="sync" size={24} color="#a855f7" />
              <Text style={styles.cacheCount}>{cacheStats.pendingActions}</Text>
              <Text style={styles.cacheLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Changes</Text>
            {pendingActions.slice(0, 5).map((action) => (
              <View key={action.id} style={styles.actionItem}>
                <View style={styles.actionIcon}>
                  <Ionicons name={getActionIcon(action.type) as any} size={18} color="#f59e0b" />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionType}>
                    {action.type.replace('_', ' ').toLowerCase()}
                  </Text>
                  <Text style={styles.actionTime}>
                    {new Date(action.timestamp).toLocaleString()}
                  </Text>
                </View>
                {action.retryCount > 0 && (
                  <View style={styles.retryBadge}>
                    <Text style={styles.retryText}>Retry {action.retryCount}</Text>
                  </View>
                )}
              </View>
            ))}
            {pendingActions.length > 5 && (
              <Text style={styles.moreText}>
                +{pendingActions.length - 5} more pending changes
              </Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={downloadDataForOffline}
            disabled={downloadingData || !isOnline}
          >
            {downloadingData ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="cloud-download" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Download Data for Offline</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.syncButton,
              (!isOnline || pendingActionsCount === 0) && styles.disabledButton,
            ]}
            onPress={syncNow}
            disabled={!isOnline || pendingActionsCount === 0 || isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="sync" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>
                  Sync Now ({pendingActionsCount} pending)
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={clearCache}
          >
            <Ionicons name="trash" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Clear Offline Data</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb" size={20} color="#f59e0b" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Offline Mode Tips</Text>
            <Text style={styles.tipsText}>
              {'\u2022'} Download data before going to areas with poor coverage{'\n'}
              {'\u2022'} Changes made offline will sync automatically when back online{'\n'}
              {'\u2022'} View leads, appointments, and territories without internet{'\n'}
              {'\u2022'} Add notes and update leads even when offline
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  onlineCard: {
    backgroundColor: '#22c55e15',
    borderColor: '#22c55e40',
  },
  offlineCard: {
    backgroundColor: '#ef444415',
    borderColor: '#ef444440',
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0f1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  pendingValue: {
    color: '#f59e0b',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cacheGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cacheItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  cacheCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
  },
  cacheLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  actionTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  retryBadge: {
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
  },
  moreText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  syncButton: {
    backgroundColor: '#22c55e',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#f59e0b30',
  },
  tipsContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 20,
  },
});
