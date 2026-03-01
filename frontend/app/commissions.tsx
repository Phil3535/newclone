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

interface CommissionSummary {
  rep_id: string;
  period: string;
  deals_count: number;
  total_deal_value: number;
  current_tier: {
    name: string;
    base_rate: number;
    bonus_per_deal: number;
    deals_range: string;
  };
  next_tier: {
    deals_needed: number;
    name: string;
  } | null;
  breakdown: {
    base_commission: number;
    tier_bonus: number;
    milestone_bonuses: {
      first_deal: number;
      five_deals: number;
      ten_deals: number;
    };
  };
  total_earned: number;
  paid_amount: number;
  pending_amount: number;
  projected_yearly: number;
}

interface CommissionTier {
  tier: number;
  deals_range: string;
  base_rate: number;
  bonus_per_deal: number;
}

interface HistoryEntry {
  period: string;
  month_name: string;
  deals_count: number;
  total_earned: number;
}

export default function CommissionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tiers' | 'history'>('overview');
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [tiers, setTiers] = useState<CommissionTier[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const currentRepId = '301b2e32-f221-48df-a8c1-bfae3a76c4c6'; // Default rep ID

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, tiersRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/commissions/summary/${currentRepId}`),
        fetch(`${API_URL}/api/commissions/tiers`),
        fetch(`${API_URL}/api/commissions/history/${currentRepId}?limit=6`)
      ]);
      
      const summaryData = await summaryRes.json();
      const tiersData = await tiersRes.json();
      const historyData = await historyRes.json();
      
      setSummary(summaryData);
      setTiers(tiersData);
      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTierColor = (tier: number) => {
    const colors = ['#64748b', '#3b82f6', '#f59e0b', '#22c55e'];
    return colors[tier - 1] || colors[0];
  };

  const renderOverview = () => {
    if (!summary) return null;

    const progressToNextTier = summary.next_tier 
      ? ((summary.current_tier.deals_range.split('-')[1] === '∞' ? 100 : 
          (summary.deals_count / parseInt(summary.current_tier.deals_range.split('-')[1])) * 100))
      : 100;

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Total Earned Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Earned This Month</Text>
          <Text style={styles.heroValue}>{formatCurrency(summary.total_earned)}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{summary.deals_count}</Text>
              <Text style={styles.heroStatLabel}>Deals</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{formatCurrency(summary.total_deal_value)}</Text>
              <Text style={styles.heroStatLabel}>Deal Value</Text>
            </View>
          </View>
        </View>

        {/* Current Tier Card */}
        <View style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <View style={[styles.tierBadge, { backgroundColor: getTierColor(parseInt(summary.current_tier.name.split(' ')[1])) }]}>
              <Text style={styles.tierBadgeText}>{summary.current_tier.name}</Text>
            </View>
            <Text style={styles.tierRate}>{summary.current_tier.base_rate}% + ${summary.current_tier.bonus_per_deal}/deal</Text>
          </View>
          
          {summary.next_tier && summary.next_tier.deals_needed > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(progressToNextTier, 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {summary.next_tier.deals_needed} more deals to reach {summary.next_tier.name}
              </Text>
            </View>
          )}
        </View>

        {/* Breakdown Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Commission Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base Commission</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(summary.breakdown.base_commission)}</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Tier Bonus ({summary.deals_count} × ${summary.current_tier.bonus_per_deal})</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(summary.breakdown.tier_bonus)}</Text>
          </View>
          
          <View style={styles.breakdownDivider} />
          <Text style={styles.breakdownSubtitle}>Milestone Bonuses</Text>
          
          <View style={styles.milestoneRow}>
            <View style={styles.milestoneItem}>
              <Ionicons 
                name={summary.breakdown.milestone_bonuses.first_deal > 0 ? "checkmark-circle" : "ellipse-outline"} 
                size={20} 
                color={summary.breakdown.milestone_bonuses.first_deal > 0 ? "#22c55e" : "#64748b"} 
              />
              <Text style={styles.milestoneLabel}>First Deal</Text>
              <Text style={styles.milestoneValue}>$500</Text>
            </View>
            <View style={styles.milestoneItem}>
              <Ionicons 
                name={summary.breakdown.milestone_bonuses.five_deals > 0 ? "checkmark-circle" : "ellipse-outline"} 
                size={20} 
                color={summary.breakdown.milestone_bonuses.five_deals > 0 ? "#22c55e" : "#64748b"} 
              />
              <Text style={styles.milestoneLabel}>5 Deals</Text>
              <Text style={styles.milestoneValue}>$1,000</Text>
            </View>
            <View style={styles.milestoneItem}>
              <Ionicons 
                name={summary.breakdown.milestone_bonuses.ten_deals > 0 ? "checkmark-circle" : "ellipse-outline"} 
                size={20} 
                color={summary.breakdown.milestone_bonuses.ten_deals > 0 ? "#22c55e" : "#64748b"} 
              />
              <Text style={styles.milestoneLabel}>10 Deals</Text>
              <Text style={styles.milestoneValue}>$2,500</Text>
            </View>
          </View>
        </View>

        {/* Projections Card */}
        <View style={styles.projectionsCard}>
          <Text style={styles.projectionsTitle}>Projections</Text>
          <View style={styles.projectionRow}>
            <View style={styles.projectionItem}>
              <Text style={styles.projectionValue}>{formatCurrency(summary.projected_yearly)}</Text>
              <Text style={styles.projectionLabel}>Yearly (at this pace)</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  const renderTiers = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.tiersHeader}>Commission Tiers</Text>
      <Text style={styles.tiersSubheader}>Close more deals to unlock higher commission rates!</Text>
      
      {tiers.map((tier, index) => {
        const isCurrentTier = summary?.current_tier.name === `Tier ${tier.tier}`;
        return (
          <View 
            key={tier.tier} 
            style={[
              styles.tierDetailCard, 
              isCurrentTier && styles.tierDetailCardActive
            ]}
          >
            <View style={styles.tierDetailHeader}>
              <View style={[styles.tierDetailBadge, { backgroundColor: getTierColor(tier.tier) }]}>
                <Text style={styles.tierDetailBadgeText}>Tier {tier.tier}</Text>
              </View>
              {isCurrentTier && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </View>
            
            <View style={styles.tierDetailContent}>
              <View style={styles.tierDetailRow}>
                <Text style={styles.tierDetailLabel}>Deals Required</Text>
                <Text style={styles.tierDetailValue}>{tier.deals_range}</Text>
              </View>
              <View style={styles.tierDetailRow}>
                <Text style={styles.tierDetailLabel}>Base Rate</Text>
                <Text style={[styles.tierDetailValue, { color: '#22c55e' }]}>{tier.base_rate}%</Text>
              </View>
              <View style={styles.tierDetailRow}>
                <Text style={styles.tierDetailLabel}>Bonus Per Deal</Text>
                <Text style={[styles.tierDetailValue, { color: '#f59e0b' }]}>${tier.bonus_per_deal}</Text>
              </View>
            </View>
          </View>
        );
      })}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.historyHeader}>Earnings History</Text>
      
      {history.map((entry, index) => (
        <View key={entry.period} style={styles.historyCard}>
          <View style={styles.historyLeft}>
            <Text style={styles.historyMonth}>{entry.month_name}</Text>
            <Text style={styles.historyDeals}>{entry.deals_count} deals closed</Text>
          </View>
          <View style={styles.historyRight}>
            <Text style={styles.historyAmount}>{formatCurrency(entry.total_earned)}</Text>
          </View>
        </View>
      ))}

      {history.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="cash-outline" size={48} color="#64748b" />
          <Text style={styles.emptyText}>No commission history yet</Text>
          <Text style={styles.emptySubtext}>Close your first deal to start earning!</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading commissions...</Text>
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
          <Text style={styles.title}>Commission Tracker</Text>
          <Text style={styles.subtitle}>Track your earnings</Text>
        </View>
        <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons name="stats-chart" size={18} color={activeTab === 'overview' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tiers' && styles.activeTab]}
          onPress={() => setActiveTab('tiers')}
        >
          <Ionicons name="trophy" size={18} color={activeTab === 'tiers' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'tiers' && styles.activeTabText]}>Tiers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="time" size={18} color={activeTab === 'history' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'tiers' && renderTiers()}
      {activeTab === 'history' && renderHistory()}
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f1a2e',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#f59e0b20',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  tabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#f59e0b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  heroCard: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  heroLabel: {
    color: '#0a1628',
    fontSize: 14,
    opacity: 0.8,
  },
  heroValue: {
    color: '#0a1628',
    fontSize: 42,
    fontWeight: '800',
    marginVertical: 8,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    color: '#0a1628',
    fontSize: 18,
    fontWeight: '700',
  },
  heroStatLabel: {
    color: '#0a1628',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#0a162850',
  },
  tierCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tierBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  tierRate: {
    color: '#94a3b8',
    fontSize: 14,
  },
  progressSection: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  breakdownTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  breakdownLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  breakdownValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#1e3a5f',
    marginVertical: 12,
  },
  breakdownSubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneItem: {
    alignItems: 'center',
    flex: 1,
  },
  milestoneLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  milestoneValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  projectionsCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
  },
  projectionsTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  projectionRow: {
    flexDirection: 'row',
  },
  projectionItem: {
    flex: 1,
    alignItems: 'center',
  },
  projectionValue: {
    color: '#22c55e',
    fontSize: 28,
    fontWeight: '700',
  },
  projectionLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  tiersHeader: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  tiersSubheader: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 20,
  },
  tierDetailCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  tierDetailCardActive: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  tierDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierDetailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierDetailBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  currentBadge: {
    marginLeft: 8,
    backgroundColor: '#22c55e20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
  },
  tierDetailContent: {
    gap: 8,
  },
  tierDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierDetailLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  tierDetailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  historyHeader: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  historyLeft: {},
  historyMonth: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyDeals: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  historyRight: {},
  historyAmount: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
});
