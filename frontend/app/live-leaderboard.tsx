import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ConfettiCannon from 'react-native-confetti-cannon';
import { playCelebrationSound, getRandomMessage } from '../src/services/celebrationService';
import { repsApi } from '../src/services/api';

interface LeaderboardEntry {
  rank: number;
  rep_id: string;
  rep_name: string;
  revenue: number;
  deals_closed: number;
  appointments_completed: number;
  isYou?: boolean;
}

const { width } = Dimensions.get('window');

export default function LiveLeaderboardScreen() {
  const router = useRouter();
  const confettiRef = useRef<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { rank: 1, rep_id: '1', rep_name: 'Alex Johnson', revenue: 125000, deals_closed: 12, appointments_completed: 28, isYou: true },
    { rank: 2, rep_id: '2', rep_name: 'Sarah Miller', revenue: 118000, deals_closed: 11, appointments_completed: 25 },
    { rank: 3, rep_id: '3', rep_name: 'Mike Davis', revenue: 105000, deals_closed: 10, appointments_completed: 22 },
    { rank: 4, rep_id: '4', rep_name: 'Emily Brown', revenue: 95000, deals_closed: 9, appointments_completed: 20 },
    { rank: 5, rep_id: '5', rep_name: 'James Wilson', revenue: 88000, deals_closed: 8, appointments_completed: 18 },
  ]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const scaleAnims = useRef(leaderboard.map(() => new Animated.Value(1))).current;

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update someone's revenue
      const randomIndex = Math.floor(Math.random() * leaderboard.length);
      const newRevenue = Math.round(Math.random() * 5000);
      
      setLeaderboard(prev => {
        const updated = [...prev];
        updated[randomIndex] = {
          ...updated[randomIndex],
          revenue: updated[randomIndex].revenue + newRevenue,
        };
        // Re-sort by revenue
        updated.sort((a, b) => b.revenue - a.revenue);
        // Update ranks
        updated.forEach((entry, i) => entry.rank = i + 1);
        return updated;
      });

      // Animate the updated entry
      Animated.sequence([
        Animated.timing(scaleAnims[randomIndex], { toValue: 1.05, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnims[randomIndex], { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      // Occasionally show a deal closed celebration
      if (Math.random() > 0.7) {
        const winner = leaderboard[Math.floor(Math.random() * 3)];
        triggerCelebration(winner.rep_name);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const triggerCelebration = (name: string) => {
    setCelebrationMessage(`🔥 ${name} just closed a deal!`);
    setShowCelebration(true);
    playCelebrationSound('deal');
    confettiRef.current?.start();

    // Slide in notification
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowCelebration(false));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return { backgroundColor: '#ffd700', color: '#1e293b' };
      case 2: return { backgroundColor: '#c0c0c0', color: '#1e293b' };
      case 3: return { backgroundColor: '#cd7f32', color: '#1e293b' };
      default: return { backgroundColor: '#1e3a5f', color: '#ffffff' };
    }
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rankStyle = getRankStyle(item.rank);
    
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnims[index] || 1 }] }]}>
        <View style={[
          styles.leaderboardItem,
          item.isYou && styles.leaderboardItemYou,
        ]}>
          <View style={[styles.rankBadge, { backgroundColor: rankStyle.backgroundColor }]}>
            {item.rank <= 3 ? (
              <Ionicons name="trophy" size={16} color={rankStyle.color} />
            ) : (
              <Text style={[styles.rankText, { color: rankStyle.color }]}>{item.rank}</Text>
            )}
          </View>
          <View style={styles.repInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.repName}>{item.rep_name}</Text>
              {item.isYou && <Text style={styles.youBadge}>YOU</Text>}
            </View>
            <Text style={styles.repStats}>
              {item.deals_closed} deals • {item.appointments_completed} appts
            </Text>
          </View>
          <View style={styles.revenueContainer}>
            <Text style={styles.revenueValue}>{formatCurrency(item.revenue)}</Text>
            <View style={styles.liveDot} />
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ConfettiCannon
        ref={confettiRef}
        count={100}
        origin={{ x: width / 2, y: 0 }}
        autoStart={false}
        fadeOut
        explosionSpeed={350}
        fallSpeed={2500}
        colors={['#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444']}
      />

      {/* Celebration Banner */}
      <Animated.View style={[
        styles.celebrationBanner,
        { transform: [{ translateY: slideAnim }] }
      ]}>
        <Text style={styles.celebrationText}>{celebrationMessage}</Text>
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Live Leaderboard</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveGlow} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.celebrateButton}
          onPress={() => triggerCelebration('You')}
        >
          <Ionicons name="sparkles" size={24} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {/* Top 3 Podium */}
      <View style={styles.podium}>
        {/* 2nd Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumAvatar, styles.podiumSecond]}>
            <Ionicons name="trophy" size={24} color="#1e293b" />
          </View>
          <Text style={styles.podiumName}>{leaderboard[1]?.rep_name.split(' ')[0]}</Text>
          <Text style={styles.podiumRevenue}>{formatCurrency(leaderboard[1]?.revenue || 0)}</Text>
          <View style={[styles.podiumBar, styles.podiumBarSecond]} />
        </View>
        {/* 1st Place */}
        <View style={styles.podiumItem}>
          <View style={styles.crown}>
            <Ionicons name="flash" size={20} color="#ffd700" />
          </View>
          <View style={[styles.podiumAvatar, styles.podiumFirst]}>
            <Ionicons name="trophy" size={32} color="#1e293b" />
          </View>
          <Text style={styles.podiumName}>{leaderboard[0]?.rep_name.split(' ')[0]}</Text>
          <Text style={[styles.podiumRevenue, styles.podiumRevenueFirst]}>
            {formatCurrency(leaderboard[0]?.revenue || 0)}
          </Text>
          <View style={[styles.podiumBar, styles.podiumBarFirst]} />
        </View>
        {/* 3rd Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumAvatar, styles.podiumThird]}>
            <Ionicons name="trophy" size={20} color="#1e293b" />
          </View>
          <Text style={styles.podiumName}>{leaderboard[2]?.rep_name.split(' ')[0]}</Text>
          <Text style={styles.podiumRevenue}>{formatCurrency(leaderboard[2]?.revenue || 0)}</Text>
          <View style={[styles.podiumBar, styles.podiumBarThird]} />
        </View>
      </View>

      {/* Full Leaderboard */}
      <FlatList
        data={leaderboard}
        renderItem={renderItem}
        keyExtractor={(item) => item.rep_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  celebrationBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    zIndex: 100,
    alignItems: 'center',
  },
  celebrationText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  liveGlow: {
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
  celebrateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  crown: {
    marginBottom: 4,
  },
  podiumAvatar: {
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  podiumFirst: {
    width: 60,
    height: 60,
    backgroundColor: '#ffd700',
  },
  podiumSecond: {
    width: 50,
    height: 50,
    backgroundColor: '#c0c0c0',
  },
  podiumThird: {
    width: 44,
    height: 44,
    backgroundColor: '#cd7f32',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  podiumRevenue: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  podiumRevenueFirst: {
    fontSize: 14,
    color: '#ffd700',
    fontWeight: '700',
  },
  podiumBar: {
    width: '80%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  podiumBarFirst: {
    height: 80,
    backgroundColor: '#ffd70040',
  },
  podiumBarSecond: {
    height: 60,
    backgroundColor: '#c0c0c040',
  },
  podiumBarThird: {
    height: 40,
    backgroundColor: '#cd7f3240',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  leaderboardItemYou: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  repInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  youBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  repStats: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  revenueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginLeft: 8,
  },
});
