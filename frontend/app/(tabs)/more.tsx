import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { forecastApi, ledgerApi, complianceApi, partnersApi } from '../../src/services/api';

interface MonthlyForecast {
  month: string;
  predicted_leads: number;
  predicted_appointments: number;
  predicted_installs: number;
  predicted_revenue: number;
  confidence: number;
}

interface Forecast {
  territory_name: string;
  forecast_period: string;
  monthly_forecasts: MonthlyForecast[];
  total_predicted_revenue: number;
  growth_rate: number;
  best_month: string;
  worst_month: string;
  ai_insights: string;
}

interface LedgerSummary {
  total_revenue: number;
  total_commissions: number;
  total_partner_payouts: number;
  total_expenses: number;
  net_revenue: number;
  transaction_count: number;
  chain_valid: boolean;
}

interface ComplianceStatus {
  total_permits: number;
  pending_permits: number;
  approved_permits: number;
  rejected_permits: number;
  expiring_soon: number;
  compliance_rate: number;
}

export default function MoreScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [forecastRes, ledgerRes, complianceRes] = await Promise.all([
        forecastApi.getOverall(6),
        ledgerApi.getSummary(),
        complianceApi.getStatus(),
      ]);
      setForecast(forecastRes.data);
      setLedgerSummary(ledgerRes.data);
      setCompliance(complianceRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
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
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
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
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Advanced Features</Text>
            <Text style={styles.subtitle}>Enterprise Tools & Analytics</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* AI Lead Hunter Banner */}
        <TouchableOpacity
          style={styles.leadHunterBanner}
          onPress={() => router.push('/lead-hunter')}
        >
          <View style={styles.leadHunterIcon}>
            <Ionicons name="search" size={28} color="#ffffff" />
          </View>
          <View style={styles.leadHunterContent}>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
            <Text style={styles.leadHunterTitle}>AI Lead Hunter</Text>
            <Text style={styles.leadHunterSubtitle}>
              Auto-discover new builds, property listings & hot leads to knock!
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#22c55e" />
        </TouchableOpacity>

        {/* Elite Tools Banner */}
        <TouchableOpacity
          style={[styles.leadHunterBanner, { backgroundColor: '#1e1b4b', borderColor: '#6366f1' }]}
          onPress={() => router.push('/elite-tools')}
          data-testid="elite-tools-banner"
        >
          <View style={[styles.leadHunterIcon, { backgroundColor: '#6366f1' }]}>
            <Ionicons name="diamond" size={28} color="#ffffff" />
          </View>
          <View style={styles.leadHunterContent}>
            <View style={[styles.newBadge, { backgroundColor: '#fbbf24' }]}>
              <Text style={[styles.newBadgeText, { color: '#000' }]}>ELITE</Text>
            </View>
            <Text style={styles.leadHunterTitle}>Sales Power Tools</Text>
            <Text style={styles.leadHunterSubtitle}>
              Deal Stacker, Payment Calc, Proposals & Upsell AI
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#6366f1" />
        </TouchableOpacity>

        {/* Quick Tools Section */}
        <Text style={styles.sectionLabel}>Quick Tools</Text>
        <View style={styles.quickToolsGrid}>
          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/calculator')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="calculator" size={24} color="#22c55e" />
            </View>
            <Text style={styles.quickToolTitle}>Solar Calculator</Text>
            <Text style={styles.quickToolSubtitle}>Estimate savings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/assistant')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="sparkles" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.quickToolTitle}>AI Assistant</Text>
            <Text style={styles.quickToolSubtitle}>Sales coaching</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/achievements')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="trophy" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.quickToolTitle}>Achievements</Text>
            <Text style={styles.quickToolSubtitle}>Badges & rewards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/route-optimizer')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#06b6d420' }]}>
              <Ionicons name="navigate" size={24} color="#06b6d4" />
            </View>
            <Text style={styles.quickToolTitle}>Route Optimizer</Text>
            <Text style={styles.quickToolSubtitle}>Plan your day</Text>
          </TouchableOpacity>
        </View>

        {/* AR Scanners Section */}
        <Text style={styles.sectionLabel}>AR Tools</Text>
        <View style={styles.quickToolsGrid}>
          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/ar-roof-scanner')}
            data-testid="ar-roof-scanner-btn"
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="scan" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.quickToolTitle}>AR Roof Scanner</Text>
            <Text style={styles.quickToolSubtitle}>Measure roofs instantly</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/ar-business-card')}
            data-testid="ar-business-card-btn"
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="card" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.quickToolTitle}>Card Scanner</Text>
            <Text style={styles.quickToolSubtitle}>Instant lead creation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/qr-leads')}
            data-testid="qr-leads-btn"
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="qr-code" size={24} color="#22c55e" />
            </View>
            <Text style={styles.quickToolTitle}>QR Leads</Text>
            <Text style={styles.quickToolSubtitle}>Track shared estimates</Text>
          </TouchableOpacity>
        </View>

        {/* WOW Features Section */}
        <Text style={styles.sectionLabel}>Power Tools</Text>
        <View style={styles.quickToolsGrid}>
          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/proposals')}
            data-testid="proposals-btn"
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="document-text" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.quickToolTitle}>AI Proposals</Text>
            <Text style={styles.quickToolSubtitle}>Generate & share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/lead-import-export')}
            data-testid="lead-import-export-btn"
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="cloud-upload" size={24} color="#22c55e" />
            </View>
            <Text style={styles.quickToolTitle}>Import/Export</Text>
            <Text style={styles.quickToolSubtitle}>Bulk lead ops</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/voice-notes')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#14b8a620' }]}>
              <Ionicons name="recording" size={24} color="#14b8a6" />
            </View>
            <Text style={styles.quickToolTitle}>Voice Notes</Text>
            <Text style={styles.quickToolSubtitle}>Quick memos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/commissions')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="cash" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.quickToolTitle}>Commissions</Text>
            <Text style={styles.quickToolSubtitle}>Track earnings</Text>
          </TouchableOpacity>
        </View>

        {/* Legendary Features Section */}
        <Text style={styles.sectionLabel}>Legendary Tools</Text>
        <View style={styles.quickToolsGrid}>
          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/team-chat')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#ec489920' }]}>
              <Ionicons name="chatbubbles" size={24} color="#ec4899" />
            </View>
            <Text style={styles.quickToolTitle}>Team Chat</Text>
            <Text style={styles.quickToolSubtitle}>Real-time messaging</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/training-videos')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#a855f720' }]}>
              <Ionicons name="videocam" size={24} color="#a855f7" />
            </View>
            <Text style={styles.quickToolTitle}>Training Videos</Text>
            <Text style={styles.quickToolSubtitle}>Learn & grow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/competitor-comparison')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#ef444420' }]}>
              <Ionicons name="git-compare" size={24} color="#ef4444" />
            </View>
            <Text style={styles.quickToolTitle}>Competitors</Text>
            <Text style={styles.quickToolSubtitle}>Win more deals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolCard}
            onPress={() => router.push('/testimonials')}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#eab30820' }]}>
              <Ionicons name="star" size={24} color="#eab308" />
            </View>
            <Text style={styles.quickToolTitle}>Testimonials</Text>
            <Text style={styles.quickToolSubtitle}>Customer stories</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Section */}
        <Text style={styles.sectionLabel}>Admin</Text>
        <TouchableOpacity
          style={styles.leaderboardBanner}
          onPress={() => router.push('/admin-dashboard')}
          data-testid="admin-dashboard-btn"
        >
          <View style={styles.leaderboardContent}>
            <View style={[styles.liveIndicator, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
            </View>
            <Text style={styles.leaderboardTitle}>Admin Dashboard</Text>
            <Text style={styles.leaderboardSubtitle}>Company analytics & user management</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.leaderboardBanner}
          onPress={() => router.push('/branding')}
          data-testid="branding-btn"
        >
          <View style={styles.leaderboardContent}>
            <View style={[styles.liveIndicator, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="color-palette" size={16} color="#22c55e" />
            </View>
            <Text style={styles.leaderboardTitle}>Brand Settings</Text>
            <Text style={styles.leaderboardSubtitle}>Customize logo, colors & white-label</Text>
          </View>
          <View style={styles.businessBadge}>
            <Text style={styles.businessBadgeText}>Business+</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#22c55e" />
        </TouchableOpacity>

        {/* Subscription Section */}
        <TouchableOpacity
          style={styles.subscriptionBanner}
          onPress={() => router.push('/subscription')}
          data-testid="subscription-btn"
        >
          <View style={styles.subscriptionIcon}>
            <Ionicons name="diamond" size={28} color="#ffffff" />
          </View>
          <View style={styles.subscriptionContent}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>UPGRADE</Text>
            </View>
            <Text style={styles.subscriptionTitle}>Subscription Plans</Text>
            <Text style={styles.subscriptionSubtitle}>
              Unlock premium features & boost your sales!
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#8b5cf6" />
        </TouchableOpacity>

        {/* Referral Program Banner */}
        <TouchableOpacity
          style={styles.referralBanner}
          onPress={() => router.push('/referrals')}
          data-testid="referrals-btn"
        >
          <View style={styles.referralIcon}>
            <Ionicons name="gift" size={28} color="#ffffff" />
          </View>
          <View style={styles.referralContent}>
            <View style={styles.referralBadge}>
              <Text style={styles.referralBadgeText}>EARN FREE</Text>
            </View>
            <Text style={styles.referralTitle}>Referral Program</Text>
            <Text style={styles.referralSubtitle}>
              Give 1 month, get 1 month free!
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#22c55e" />
        </TouchableOpacity>

        {/* Competition Section */}
        <Text style={styles.sectionLabel}>Competition</Text>
        <TouchableOpacity
          style={styles.leaderboardBanner}
          onPress={() => router.push('/live-leaderboard')}
        >
          <View style={styles.leaderboardContent}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.leaderboardTitle}>Live Leaderboard</Text>
            <Text style={styles.leaderboardSubtitle}>See real-time rankings & celebrate wins!</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#f59e0b" />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Enterprise Features</Text>

        {/* Forecast Section */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => setActiveSection(activeSection === 'forecast' ? null : 'forecast')}
        >
          <View style={styles.featureHeader}>
            <View style={[styles.featureIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="trending-up" size={24} color="#3b82f6" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Predictive Forecasting</Text>
              <Text style={styles.featureSubtitle}>AI-powered revenue predictions</Text>
            </View>
            <Ionicons
              name={activeSection === 'forecast' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#64748b"
            />
          </View>
          
          {activeSection === 'forecast' && forecast && (
            <View style={styles.expandedContent}>
              <View style={styles.forecastHeader}>
                <Text style={styles.forecastPeriod}>{forecast.forecast_period} Outlook</Text>
                <View style={[
                  styles.growthBadge,
                  { backgroundColor: forecast.growth_rate >= 0 ? '#22c55e20' : '#ef444420' }
                ]}>
                  <Ionicons
                    name={forecast.growth_rate >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={forecast.growth_rate >= 0 ? '#22c55e' : '#ef4444'}
                  />
                  <Text style={[
                    styles.growthText,
                    { color: forecast.growth_rate >= 0 ? '#22c55e' : '#ef4444' }
                  ]}>
                    {forecast.growth_rate >= 0 ? '+' : ''}{forecast.growth_rate}%
                  </Text>
                </View>
              </View>
              
              <View style={styles.forecastTotal}>
                <Text style={styles.forecastTotalLabel}>Predicted Revenue</Text>
                <Text style={styles.forecastTotalValue}>
                  {formatCurrency(forecast.total_predicted_revenue)}
                </Text>
              </View>

              <View style={styles.forecastMonths}>
                {forecast.monthly_forecasts.slice(0, 4).map((month, index) => (
                  <View key={index} style={styles.monthItem}>
                    <Text style={styles.monthName}>{month.month.split(' ')[0].slice(0, 3)}</Text>
                    <View style={styles.monthBar}>
                      <View
                        style={[
                          styles.monthBarFill,
                          {
                            height: `${Math.min(100, (month.predicted_revenue / (forecast.total_predicted_revenue / 6)) * 100)}%`,
                            backgroundColor: month.month === forecast.best_month ? '#22c55e' : '#3b82f6'
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.monthValue}>{formatCurrency(month.predicted_revenue)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.insightBox}>
                <Ionicons name="bulb" size={16} color="#f59e0b" />
                <Text style={styles.insightText}>{forecast.ai_insights}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Blockchain Ledger Section */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => setActiveSection(activeSection === 'ledger' ? null : 'ledger')}
        >
          <View style={styles.featureHeader}>
            <View style={[styles.featureIcon, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="link" size={24} color="#8b5cf6" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Blockchain Ledger</Text>
              <Text style={styles.featureSubtitle}>Immutable transaction records</Text>
            </View>
            <Ionicons
              name={activeSection === 'ledger' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#64748b"
            />
          </View>

          {activeSection === 'ledger' && ledgerSummary && (
            <View style={styles.expandedContent}>
              <View style={styles.ledgerStatus}>
                <View style={[
                  styles.chainStatus,
                  { backgroundColor: ledgerSummary.chain_valid ? '#22c55e20' : '#ef444420' }
                ]}>
                  <Ionicons
                    name={ledgerSummary.chain_valid ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={ledgerSummary.chain_valid ? '#22c55e' : '#ef4444'}
                  />
                  <Text style={[
                    styles.chainStatusText,
                    { color: ledgerSummary.chain_valid ? '#22c55e' : '#ef4444' }
                  ]}>
                    Chain {ledgerSummary.chain_valid ? 'Valid' : 'Invalid'}
                  </Text>
                </View>
                <Text style={styles.transactionCount}>
                  {ledgerSummary.transaction_count} transactions
                </Text>
              </View>

              <View style={styles.ledgerStats}>
                <View style={styles.ledgerStatItem}>
                  <Text style={styles.ledgerStatLabel}>Total Revenue</Text>
                  <Text style={[styles.ledgerStatValue, { color: '#22c55e' }]}>
                    {formatCurrency(ledgerSummary.total_revenue)}
                  </Text>
                </View>
                <View style={styles.ledgerStatItem}>
                  <Text style={styles.ledgerStatLabel}>Commissions</Text>
                  <Text style={[styles.ledgerStatValue, { color: '#f59e0b' }]}>
                    {formatCurrency(ledgerSummary.total_commissions)}
                  </Text>
                </View>
                <View style={styles.ledgerStatItem}>
                  <Text style={styles.ledgerStatLabel}>Partner Payouts</Text>
                  <Text style={[styles.ledgerStatValue, { color: '#8b5cf6' }]}>
                    {formatCurrency(ledgerSummary.total_partner_payouts)}
                  </Text>
                </View>
                <View style={styles.ledgerStatItem}>
                  <Text style={styles.ledgerStatLabel}>Net Revenue</Text>
                  <Text style={[styles.ledgerStatValue, { color: '#3b82f6' }]}>
                    {formatCurrency(ledgerSummary.net_revenue)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Compliance Section */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => setActiveSection(activeSection === 'compliance' ? null : 'compliance')}
        >
          <View style={styles.featureHeader}>
            <View style={[styles.featureIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Compliance Tracker</Text>
              <Text style={styles.featureSubtitle}>Permits & regulatory status</Text>
            </View>
            <Ionicons
              name={activeSection === 'compliance' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#64748b"
            />
          </View>

          {activeSection === 'compliance' && compliance && (
            <View style={styles.expandedContent}>
              <View style={styles.complianceRate}>
                <View style={styles.complianceCircle}>
                  <Text style={styles.compliancePercent}>{compliance.compliance_rate}%</Text>
                  <Text style={styles.complianceLabel}>Compliant</Text>
                </View>
              </View>

              <View style={styles.permitStats}>
                <View style={styles.permitStatItem}>
                  <View style={[styles.permitDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.permitStatLabel}>Pending</Text>
                  <Text style={styles.permitStatValue}>{compliance.pending_permits}</Text>
                </View>
                <View style={styles.permitStatItem}>
                  <View style={[styles.permitDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.permitStatLabel}>Approved</Text>
                  <Text style={styles.permitStatValue}>{compliance.approved_permits}</Text>
                </View>
                <View style={styles.permitStatItem}>
                  <View style={[styles.permitDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.permitStatLabel}>Rejected</Text>
                  <Text style={styles.permitStatValue}>{compliance.rejected_permits}</Text>
                </View>
              </View>

              {compliance.expiring_soon > 0 && (
                <View style={styles.expiringAlert}>
                  <Ionicons name="warning" size={16} color="#f59e0b" />
                  <Text style={styles.expiringText}>
                    {compliance.expiring_soon} permit(s) expiring within 30 days
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Partner Portal Section */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => setActiveSection(activeSection === 'partner' ? null : 'partner')}
        >
          <View style={styles.featureHeader}>
            <View style={[styles.featureIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="briefcase" size={24} color="#f59e0b" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Partner/Investor Portal</Text>
              <Text style={styles.featureSubtitle}>ROI tracking & territory performance</Text>
            </View>
            <Ionicons
              name={activeSection === 'partner' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#64748b"
            />
          </View>

          {activeSection === 'partner' && (
            <View style={styles.expandedContent}>
              <View style={styles.partnerFeatures}>
                <View style={styles.partnerFeatureItem}>
                  <Ionicons name="pie-chart" size={20} color="#3b82f6" />
                  <Text style={styles.partnerFeatureText}>Real-time ROI Dashboard</Text>
                </View>
                <View style={styles.partnerFeatureItem}>
                  <Ionicons name="map" size={20} color="#22c55e" />
                  <Text style={styles.partnerFeatureText}>Territory Performance</Text>
                </View>
                <View style={styles.partnerFeatureItem}>
                  <Ionicons name="cash" size={20} color="#f59e0b" />
                  <Text style={styles.partnerFeatureText}>Revenue Share Tracking</Text>
                </View>
                <View style={styles.partnerFeatureItem}>
                  <Ionicons name="document-text" size={20} color="#8b5cf6" />
                  <Text style={styles.partnerFeatureText}>Monthly Reports</Text>
                </View>
              </View>

              <View style={styles.partnerCTA}>
                <Text style={styles.partnerCTAText}>
                  Partner portal provides investors with secure access to territory performance, 
                  installation tracking, and revenue share calculations.
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <Text style={styles.quickStatsTitle}>System Status</Text>
          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStatItem}>
              <Ionicons name="cloud-done" size={20} color="#22c55e" />
              <Text style={styles.quickStatLabel}>API Status</Text>
              <Text style={styles.quickStatValue}>Online</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Ionicons name="chatbubbles" size={20} color="#3b82f6" />
              <Text style={styles.quickStatLabel}>SMS Service</Text>
              <Text style={styles.quickStatValue}>Active</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Ionicons name="flash" size={20} color="#f59e0b" />
              <Text style={styles.quickStatLabel}>AI Scoring</Text>
              <Text style={styles.quickStatValue}>Ready</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // AI Lead Hunter Banner
  leadHunterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  leadHunterIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  leadHunterContent: {
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  leadHunterTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  leadHunterSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  subscriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  subscriptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  subscriptionContent: {
    flex: 1,
  },
  proBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  proBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  businessBadge: {
    backgroundColor: '#22c55e20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  businessBadgeText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '700',
  },
  subscriptionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  subscriptionSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  referralIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  referralContent: {
    flex: 1,
  },
  referralBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  referralBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  referralTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  referralSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  quickToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    marginBottom: 24,
    gap: 12,
  },
  quickToolCard: {
    width: '47%',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  quickToolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickToolTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickToolSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  leaderboardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  leaderboardContent: {
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    color: '#ef4444',
    fontWeight: '700',
    letterSpacing: 1,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  leaderboardSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  featureCard: {
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  featureSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  forecastPeriod: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  forecastTotal: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forecastTotalLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  forecastTotalValue: {
    color: '#22c55e',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  forecastMonths: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  monthItem: {
    alignItems: 'center',
  },
  monthName: {
    color: '#64748b',
    fontSize: 10,
    marginBottom: 8,
  },
  monthBar: {
    width: 24,
    height: 60,
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  monthBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  monthValue: {
    color: '#94a3b8',
    fontSize: 9,
    marginTop: 4,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f59e0b10',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  insightText: {
    color: '#f59e0b',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  ledgerStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  chainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  chainStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionCount: {
    color: '#64748b',
    fontSize: 12,
  },
  ledgerStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ledgerStatItem: {
    width: '47%',
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 8,
  },
  ledgerStatLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  ledgerStatValue: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  complianceRate: {
    alignItems: 'center',
    marginVertical: 16,
  },
  complianceCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22c55e20',
    borderWidth: 3,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compliancePercent: {
    color: '#22c55e',
    fontSize: 24,
    fontWeight: 'bold',
  },
  complianceLabel: {
    color: '#22c55e',
    fontSize: 11,
  },
  permitStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  permitStatItem: {
    alignItems: 'center',
  },
  permitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  permitStatLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  permitStatValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  expiringAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b10',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  expiringText: {
    color: '#f59e0b',
    fontSize: 12,
  },
  partnerFeatures: {
    marginTop: 16,
    gap: 12,
  },
  partnerFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerFeatureText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  partnerCTA: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  partnerCTAText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  quickStats: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  quickStatsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: '#0f1a2e',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  quickStatLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 6,
  },
  quickStatValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
