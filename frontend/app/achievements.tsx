import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  BADGES,
  Badge,
  DailyChallenge,
  UserStats,
  loadUserStats,
  loadUnlockedBadges,
  generateDailyChallenges,
  calculateLevel,
} from '../src/services/gamificationService';

export default function AchievementsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [statsData, badges] = await Promise.all([
      loadUserStats(),
      loadUnlockedBadges(),
    ]);
    setStats(statsData);
    setUnlockedBadges(badges);
    setChallenges(generateDailyChallenges());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const levelData = stats ? calculateLevel(stats.xp) : { level: 1, currentXp: 0, xpToNextLevel: 1000 };
  const xpProgress = (levelData.currentXp / levelData.xpToNextLevel) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Achievements</Text>
          <Text style={styles.subtitle}>Track Your Progress</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Level Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelBadge}>
            <Ionicons name="star" size={32} color="#f59e0b" />
            <Text style={styles.levelNumber}>{levelData.level}</Text>
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>Level {levelData.level}</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${xpProgress}%` }]} />
            </View>
            <Text style={styles.xpText}>
              {levelData.currentXp} / {levelData.xpToNextLevel} XP
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color="#f97316" />
            <Text style={styles.statValue}>{stats?.streak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{unlockedBadges.length}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="ribbon" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{stats?.longestStreak || 0}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>

        {/* Daily Challenges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Challenges</Text>
            <Ionicons name="time" size={20} color="#f59e0b" />
          </View>
          {challenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeCard}>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDesc}>{challenge.description}</Text>
                <View style={styles.challengeProgress}>
                  <View style={styles.challengeBar}>
                    <View
                      style={[
                        styles.challengeFill,
                        { width: `${(challenge.current / challenge.target) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.challengeCount}>
                    {challenge.current}/{challenge.target}
                  </Text>
                </View>
              </View>
              <View style={styles.challengeXp}>
                <Text style={styles.xpAmount}>+{challenge.xp}</Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgesGrid}>
            {BADGES.map((badge) => {
              const isUnlocked = unlockedBadges.includes(badge.id);
              return (
                <View
                  key={badge.id}
                  style={[styles.badgeCard, !isUnlocked && styles.badgeCardLocked]}
                >
                  <View
                    style={[
                      styles.badgeIcon,
                      { backgroundColor: isUnlocked ? `${badge.color}20` : '#1e3a5f' },
                    ]}
                  >
                    <Ionicons
                      name={badge.icon as any}
                      size={24}
                      color={isUnlocked ? badge.color : '#64748b'}
                    />
                  </View>
                  <Text style={[styles.badgeName, !isUnlocked && styles.badgeNameLocked]}>
                    {badge.name}
                  </Text>
                  <Text style={styles.badgeDesc}>{badge.description}</Text>
                  {!isUnlocked && badge.target && (
                    <View style={styles.badgeProgress}>
                      <View style={styles.badgeBar}>
                        <View style={[styles.badgeFill, { width: '0%' }]} />
                      </View>
                      <Text style={styles.badgeProgressText}>0/{badge.target}</Text>
                    </View>
                  )}
                </View>
              );
            })}
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
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  levelBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  levelNumber: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  xpBar: {
    height: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  challengeCard: {
    flexDirection: 'row',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  challengeDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  challengeProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  challengeBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#1e3a5f',
    borderRadius: 3,
    overflow: 'hidden',
  },
  challengeFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  challengeCount: {
    fontSize: 12,
    color: '#64748b',
    width: 40,
  },
  challengeXp: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  xpAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
  },
  xpLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  badgeNameLocked: {
    color: '#64748b',
  },
  badgeDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  badgeProgress: {
    marginTop: 8,
  },
  badgeBar: {
    height: 4,
    backgroundColor: '#1e3a5f',
    borderRadius: 2,
    overflow: 'hidden',
  },
  badgeFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  badgeProgressText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});
