import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { analyticsApi, repsApi } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import StatCard from '../../src/components/StatCard';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface PerformanceData {
  total_leads: number;
  total_appointments: number;
  completed_appointments: number;
  total_installations: number;
  leads_by_status: Record<string, number>;
  appointment_completion_rate: number;
}

interface RevenueData {
  total_revenue: number;
  total_commission: number;
  total_installations: number;
  by_territory: Record<string, number>;
}

interface LeaderboardEntry {
  rep_id: string;
  rep_name: string;
  revenue: number;
  deals_closed: number;
  appointments_completed: number;
  rank: number;
}

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const { currentRepId, currentRep } = useStore();
  const { t } = useLanguage();
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [performanceRes, revenueRes, leaderboardRes] = await Promise.all([
        analyticsApi.getPerformance(),
        analyticsApi.getRevenue(),
        repsApi.getLeaderboard(),
      ]);
      setPerformanceData(performanceRes.data);
      setRevenueData(revenueRes.data);
      setLeaderboard(leaderboardRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      </SafeAreaView>
    );
  }

  const leadStatuses = performanceData?.leads_by_status || {};
  const totalLeads = Object.values(leadStatuses).reduce((sum, val) => sum + val, 0);

  // Calculate funnel percentages
  const funnelData = [
    { label: 'New', value: leadStatuses.new || 0, color: '#3b82f6' },
    { label: 'Contacted', value: leadStatuses.contacted || 0, color: '#8b5cf6' },
    { label: 'Qualified', value: leadStatuses.qualified || 0, color: '#f59e0b' },
    { label: 'Appointment', value: leadStatuses.appointment_set || 0, color: '#22c55e' },
    { label: 'Won', value: leadStatuses.closed_won || 0, color: '#10b981' },
    { label: 'Lost', value: leadStatuses.closed_lost || 0, color: '#ef4444' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header} data-testid="analytics-header">
          <Text style={styles.title} data-testid="analytics-title">{t('analytics.title')}</Text>
          <Text style={styles.subtitle}>{t('analytics.subtitle')}</Text>
        </View>

        {/* Revenue Overview */}
        <View style={styles.section} data-testid="revenue-overview-section">
          <Text style={styles.sectionTitle}>{t('analytics.revenue_overview')}</Text>
          <View style={styles.revenueCard} data-testid="revenue-overview-card">
            <View style={styles.revenueMain}>
              <Ionicons name="trending-up" size={32} color="#22c55e" />
              <Text style={styles.revenueLabel}>{t('analytics.total_revenue')}</Text>
              <Text style={styles.revenueValue} data-testid="total-revenue-value">
                {formatCurrency(revenueData?.total_revenue || 0)}
              </Text>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueStats}>
              <View style={styles.revenueStat}>
                <Text style={styles.revenueStatValue} data-testid="total-commission-value">
                  {formatCurrency(revenueData?.total_commission || 0)}
                </Text>
                <Text style={styles.revenueStatLabel}>{t('analytics.commission')}</Text>
              </View>
              <View style={styles.revenueStat}>
                <Text style={styles.revenueStatValue} data-testid="total-installations-value">
                  {revenueData?.total_installations || 0}
                </Text>
                <Text style={styles.revenueStatLabel}>{t('analytics.installations')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.section} data-testid="key-metrics-section">
          <Text style={styles.sectionTitle}>{t('analytics.key_metrics')}</Text>
          <View style={styles.metricsGrid}>
            <StatCard
              title={t('dashboard.total_leads')}
              value={performanceData?.total_leads || 0}
              icon="people"
              color="#3b82f6"
            />
            <StatCard
              title={t('calendar.appointments')}
              value={performanceData?.total_appointments || 0}
              icon="calendar"
              color="#f59e0b"
            />
          </View>
          <View style={styles.metricsGrid}>
            <StatCard
              title={t('analytics.completion_rate')}
              value={`${performanceData?.appointment_completion_rate || 0}%`}
              icon="checkmark-circle"
              color="#22c55e"
            />
            <StatCard
              title={t('analytics.installations')}
              value={performanceData?.total_installations || 0}
              icon="construct"
              color="#8b5cf6"
            />
          </View>
        </View>

        {/* Sales Funnel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('analytics.sales_funnel')}</Text>
          <View style={styles.funnelCard}>
            {funnelData.map((item, index) => {
              const percentage = totalLeads > 0 ? (item.value / totalLeads) * 100 : 0;
              const barWidth = Math.max(20, percentage);
              
              return (
                <View key={item.label} style={styles.funnelItem}>
                  <View style={styles.funnelLabelContainer}>
                    <View style={[styles.funnelDot, { backgroundColor: item.color }]} />
                    <Text style={styles.funnelLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.funnelBarContainer}>
                    <View
                      style={[
                        styles.funnelBar,
                        { width: `${barWidth}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.funnelValue}>{item.value}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('analytics.top_performers')}</Text>
            <Ionicons name="trophy" size={20} color="#f59e0b" />
          </View>
          {leaderboard.slice(0, 5).map((entry, index) => (
            <View key={entry.rep_id} style={styles.leaderboardItem}>
              <View style={[
                styles.rankBadge,
                index === 0 && styles.rankGold,
                index === 1 && styles.rankSilver,
                index === 2 && styles.rankBronze,
              ]}>
                <Text style={styles.rankText}>{entry.rank}</Text>
              </View>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>{entry.rep_name}</Text>
                <View style={styles.leaderboardMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="briefcase" size={12} color="#64748b" />
                    <Text style={styles.metaText}>{entry.deals_closed} {t('dashboard.deals')}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar" size={12} color="#64748b" />
                    <Text style={styles.metaText}>{entry.appointments_completed} {t('dashboard.appts')}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.leaderboardRevenue}>
                <Text style={styles.revenueAmount}>{formatCurrency(entry.revenue)}</Text>
                <Text style={styles.revenueSubtext}>{t('analytics.revenue')}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Performance Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('analytics.ai_insights')}</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <Ionicons name="bulb" size={24} color="#f59e0b" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{t('analytics.insight_title')}</Text>
              <Text style={styles.insightText}>
                {t('analytics.insight_text')}
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <Ionicons name="location" size={24} color="#22c55e" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Hot Territory Alert</Text>
              <Text style={styles.insightText}>
                Coastal Zone has the highest close rate at 25%. 
                Consider focusing more resources there.
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <Ionicons name="time" size={24} color="#3b82f6" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Optimal Contact Time</Text>
              <Text style={styles.insightText}>
                Data shows leads respond best between 10am-12pm and 4pm-6pm. 
                Schedule calls during these windows.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  revenueCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  revenueMain: {
    alignItems: 'center',
    marginBottom: 20,
  },
  revenueLabel: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
  revenueValue: {
    color: '#22c55e',
    fontSize: 40,
    fontWeight: 'bold',
    marginTop: 4,
  },
  revenueDivider: {
    height: 1,
    backgroundColor: '#1e3a5f',
    marginBottom: 16,
  },
  revenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  revenueStat: {
    alignItems: 'center',
  },
  revenueStatValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  revenueStatLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  funnelCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  funnelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  funnelLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  funnelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  funnelLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  funnelBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  funnelBar: {
    height: '100%',
    borderRadius: 12,
  },
  funnelValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankGold: {
    backgroundColor: '#f59e0b',
  },
  rankSilver: {
    backgroundColor: '#94a3b8',
  },
  rankBronze: {
    backgroundColor: '#cd7f32',
  },
  rankText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  leaderboardMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#64748b',
    fontSize: 11,
  },
  leaderboardRevenue: {
    alignItems: 'flex-end',
  },
  revenueAmount: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  revenueSubtext: {
    color: '#64748b',
    fontSize: 10,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
});
