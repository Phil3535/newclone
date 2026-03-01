import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import StatCard from '../../src/components/StatCard';
import { analyticsApi, repsApi, appointmentsApi, seedApi } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface DashboardStats {
  total_leads: number;
  qualified_leads: number;
  appointments_today: number;
  appointments_this_week: number;
  revenue_this_month: number;
  revenue_target: number;
  deals_closed_this_month: number;
  conversion_rate: number;
  top_territory: string | null;
}

interface LeaderboardEntry {
  rep_id: string;
  rep_name: string;
  revenue: number;
  deals_closed: number;
  appointments_completed: number;
  rank: number;
}

interface Appointment {
  id: string;
  lead_name: string;
  lead_address: string;
  scheduled_time: string;
  status: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { currentRepId, setCurrentRepId, setCurrentRep, loadSavedRepId } = useStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (repId: string) => {
    try {
      const [statsRes, leaderboardRes, appointmentsRes] = await Promise.all([
        analyticsApi.getDashboard(repId),
        repsApi.getLeaderboard(),
        appointmentsApi.getToday(repId),
      ]);
      
      setStats(statsRes.data);
      setLeaderboard(leaderboardRes.data);
      setTodayAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, []);

  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);
      await loadSavedRepId();
      
      // Get all reps to select one
      const repsRes = await repsApi.getAll();
      
      if (repsRes.data.length === 0) {
        // Seed the database if empty
        await seedApi.seed();
        const newRepsRes = await repsApi.getAll();
        if (newRepsRes.data.length > 0) {
          const rep = newRepsRes.data[0];
          setCurrentRepId(rep.id);
          setCurrentRep(rep);
          await loadData(rep.id);
        }
      } else {
        // Use first rep or saved rep
        const savedRepId = useStore.getState().currentRepId;
        const rep = savedRepId 
          ? repsRes.data.find((r: any) => r.id === savedRepId) || repsRes.data[0]
          : repsRes.data[0];
        setCurrentRepId(rep.id);
        setCurrentRep(rep);
        await loadData(rep.id);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Error', 'Failed to initialize. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loadSavedRepId, setCurrentRepId, setCurrentRep, loadData]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const onRefresh = useCallback(async () => {
    if (!currentRepId) return;
    setRefreshing(true);
    await loadData(currentRepId);
    setRefreshing(false);
  }, [currentRepId, loadData]);

  const formatCurrency = (value: number) => {
    return `$${(value / 1000).toFixed(1)}K`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = stats ? Math.min(100, (stats.revenue_this_month / stats.revenue_target) * 100) : 0;

  const getGreetingKey = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'dashboard.greeting_morning';
    if (hour < 17) return 'dashboard.greeting_afternoon';
    return 'dashboard.greeting_evening';
  };

  return (
    <ImageBackground
      source={{ uri: 'https://customer-assets.emergentagent.com/job_ea12ba3d-28e3-4591-bf98-7eb6fef7d6b7/artifacts/n0gl0yn4_IMG_8501.jpeg' }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header} data-testid="dashboard-header">
            <View>
              <Text style={styles.greeting} data-testid="dashboard-greeting">{t(getGreetingKey())}</Text>
              <Text style={styles.title} data-testid="dashboard-title">Solar Empire</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.notificationBtn} data-testid="notification-button">
                <Ionicons name="notifications" size={22} color="#94a3b8" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>
          </View>

        {/* Revenue Progress */}
        <View style={styles.revenueCard} data-testid="revenue-card">
          <View style={styles.revenueHeader}>
            <View>
              <Text style={styles.revenueLabel}>{t('dashboard.monthly_revenue')}</Text>
              <Text style={styles.revenueValue} data-testid="revenue-value">
                {formatCurrency(stats?.revenue_this_month || 0)}
              </Text>
            </View>
            <View style={styles.targetContainer}>
              <Text style={styles.targetLabel}>{t('dashboard.target')}</Text>
              <Text style={styles.targetValue} data-testid="target-value">
                {formatCurrency(stats?.revenue_target || 5000)}
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText} data-testid="progress-text">
            {progressPercent.toFixed(0)}% {t('dashboard.of_target')}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title={t('dashboard.total_leads')}
            value={stats?.total_leads || 0}
            icon="people"
            color="#3b82f6"
          />
          <StatCard
            title={t('dashboard.qualified')}
            value={stats?.qualified_leads || 0}
            icon="checkmark-circle"
            color="#22c55e"
          />
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            title={t('dashboard.todays_appts')}
            value={stats?.appointments_today || 0}
            icon="calendar"
            color="#f59e0b"
          />
          <StatCard
            title={t('dashboard.conversion')}
            value={`${stats?.conversion_rate || 0}%`}
            icon="trending-up"
            color="#8b5cf6"
          />
        </View>

        {/* Today's Appointments */}
        <View style={styles.section} data-testid="todays-appointments-section">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.todays_appointments')}</Text>
            <TouchableOpacity onPress={() => router.push('/calendar')} data-testid="see-all-appointments-btn">
              <Text style={styles.seeAll}>{t('dashboard.see_all')}</Text>
            </TouchableOpacity>
          </View>
          {todayAppointments.length === 0 ? (
            <View style={styles.emptyCard} data-testid="no-appointments-card">
              <Ionicons name="calendar-outline" size={40} color="#1e3a5f" />
              <Text style={styles.emptyText}>{t('dashboard.no_appointments')}</Text>
            </View>
          ) : (
            todayAppointments.slice(0, 3).map((appt) => (
              <View key={appt.id} style={styles.appointmentCard} data-testid={`appointment-card-${appt.id}`}>
                <View style={styles.appointmentTime}>
                  <Text style={styles.timeText}>{formatTime(appt.scheduled_time)}</Text>
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentName}>{appt.lead_name}</Text>
                  <Text style={styles.appointmentAddress}>{appt.lead_address}</Text>
                </View>
                <View style={[styles.statusIndicator, 
                  { backgroundColor: appt.status === 'scheduled' ? '#f59e0b' : '#22c55e' }
                ]} />
              </View>
            ))
          )}
        </View>

        {/* Leaderboard */}
        <View style={styles.section} data-testid="leaderboard-section">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.leaderboard')}</Text>
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
                <Text style={styles.leaderboardStats}>
                  {entry.deals_closed} {t('dashboard.deals')} • {entry.appointments_completed} {t('dashboard.appts')}
                </Text>
              </View>
              <Text style={styles.leaderboardRevenue}>
                {formatCurrency(entry.revenue)}
              </Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quick_actions')}</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/leads')}>
              <Ionicons name="person-add" size={24} color="#3b82f6" />
              <Text style={styles.actionText}>{t('dashboard.new_lead')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/territories')}>
              <Ionicons name="map" size={24} color="#22c55e" />
              <Text style={styles.actionText}>{t('nav.territories')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/calendar')}>
              <Ionicons name="calendar" size={24} color="#f59e0b" />
              <Text style={styles.actionText}>{t('dashboard.schedule')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/analytics')}>
              <Ionicons name="analytics" size={24} color="#8b5cf6" />
              <Text style={styles.actionText}>{t('dashboard.reports')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 22, 40, 0.65)',
  },
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
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  greeting: {
    color: '#94a3b8',
    fontSize: 14,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  revenueCard: {
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  revenueLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  revenueValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  targetContainer: {
    alignItems: 'flex-end',
  },
  targetLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  targetValue: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  progressText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 12,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
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
  },
  seeAll: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  emptyText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 14,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  appointmentTime: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  timeText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  appointmentAddress: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
  leaderboardStats: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  leaderboardRevenue: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  actionText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
});
