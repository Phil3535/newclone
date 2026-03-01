import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  months_earned: number;
  months_available: number;
  value_earned: number;
}

interface ReferralData {
  code: string;
  share_url: string;
  stats: ReferralStats;
  recent_referrals: any[];
  rewards: {
    per_referral: string;
    referee_bonus: string;
    description: string;
  };
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  referrals: number;
  months_earned: number;
  value_earned: number;
}

export default function ReferralsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReferralData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const currentUserId = '301b2e32-f221-48df-a8c1-bfae3a76c4c6';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [referralRes, leaderboardRes] = await Promise.all([
        fetch(`${API_URL}/api/referrals/${currentUserId}`),
        fetch(`${API_URL}/api/referrals/leaderboard`),
      ]);
      
      const referralData = await referralRes.json();
      const leaderboardData = await leaderboardRes.json();
      
      setData(referralData);
      setLeaderboard(leaderboardData.leaderboard || []);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (data?.code) {
      await Clipboard.setStringAsync(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferral = async () => {
    if (!data) return;
    
    try {
      await Share.share({
        message: `Join me on Solar Empire and we'll both get 1 month FREE! Use my code: ${data.code}\n\n${data.share_url}`,
        title: 'Get 1 Month FREE on Solar Empire!',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading referral program...</Text>
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
          <Text style={styles.title}>Referral Program</Text>
          <Text style={styles.subtitle}>Earn free months!</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.giftIconContainer}>
            <Ionicons name="gift" size={48} color="#f59e0b" />
          </View>
          <Text style={styles.heroTitle}>Give 1 Month, Get 1 Month</Text>
          <Text style={styles.heroSubtitle}>
            {data?.rewards.description}
          </Text>
        </View>

        {/* Referral Code Section */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionLabel}>Your Referral Code</Text>
          <View style={styles.codeCard}>
            <Text style={styles.codeText}>{data?.code}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={copyCode}>
              <Ionicons name={copied ? "checkmark" : "copy"} size={20} color="#f59e0b" />
              <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Buttons */}
        <View style={styles.shareSection}>
          <TouchableOpacity style={styles.shareButton} onPress={shareReferral}>
            <Ionicons name="share-social" size={24} color="#ffffff" />
            <Text style={styles.shareButtonText}>Share Your Link</Text>
          </TouchableOpacity>
          
          <View style={styles.shareOptionsRow}>
            <TouchableOpacity style={styles.shareOption} onPress={shareReferral}>
              <View style={[styles.shareOptionIcon, { backgroundColor: '#25D36620' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              </View>
              <Text style={styles.shareOptionText}>WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareOption} onPress={shareReferral}>
              <View style={[styles.shareOptionIcon, { backgroundColor: '#1DA1F220' }]}>
                <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
              </View>
              <Text style={styles.shareOptionText}>Twitter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareOption} onPress={shareReferral}>
              <View style={[styles.shareOptionIcon, { backgroundColor: '#0A66C220' }]}>
                <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
              </View>
              <Text style={styles.shareOptionText}>LinkedIn</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareOption} onPress={shareReferral}>
              <View style={[styles.shareOptionIcon, { backgroundColor: '#EA433520' }]}>
                <Ionicons name="mail" size={24} color="#EA4335" />
              </View>
              <Text style={styles.shareOptionText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionLabel}>Your Rewards</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.stats.successful_referrals || 0}</Text>
              <Text style={styles.statLabel}>Successful Referrals</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.stats.months_available || 0}</Text>
              <Text style={styles.statLabel}>Free Months Available</Text>
            </View>
            <View style={[styles.statCard, styles.statCardWide]}>
              <Text style={[styles.statValue, styles.statValueGold]}>${data?.stats.value_earned || 0}</Text>
              <Text style={styles.statLabel}>Total Value Earned</Text>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionLabel}>How It Works</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share Your Code</Text>
                <Text style={styles.stepDescription}>Send your unique code to fellow solar pros</Text>
              </View>
            </View>
            
            <View style={styles.stepLine} />
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Friend Signs Up</Text>
                <Text style={styles.stepDescription}>They use your code when subscribing</Text>
              </View>
            </View>
            
            <View style={styles.stepLine} />
            
            <View style={styles.step}>
              <View style={[styles.stepNumber, styles.stepNumberSuccess]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Both Get Rewarded!</Text>
                <Text style={styles.stepDescription}>You both get 1 month free - instant credit</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.leaderboardSection}>
            <Text style={styles.sectionLabel}>Top Referrers</Text>
            <View style={styles.leaderboardCard}>
              {leaderboard.map((entry, index) => (
                <View key={entry.user_id} style={styles.leaderboardRow}>
                  <View style={styles.leaderboardRank}>
                    {index < 3 ? (
                      <Ionicons 
                        name="trophy" 
                        size={20} 
                        color={index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : '#cd7f32'} 
                      />
                    ) : (
                      <Text style={styles.rankNumber}>{entry.rank}</Text>
                    )}
                  </View>
                  <Text style={styles.leaderboardName}>{entry.name}</Text>
                  <View style={styles.leaderboardStats}>
                    <Text style={styles.leaderboardReferrals}>{entry.referrals} referrals</Text>
                    <Text style={styles.leaderboardValue}>${entry.value_earned}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pending Referrals */}
        {(data?.stats.pending_referrals || 0) > 0 && (
          <View style={styles.pendingSection}>
            <View style={styles.pendingCard}>
              <Ionicons name="time-outline" size={24} color="#f59e0b" />
              <View style={styles.pendingContent}>
                <Text style={styles.pendingTitle}>{data?.stats.pending_referrals} Pending Referrals</Text>
                <Text style={styles.pendingSubtitle}>Rewards unlock when they subscribe</Text>
              </View>
            </View>
          </View>
        )}

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
    color: '#f59e0b',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  giftIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f59e0b20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  codeSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  copyButtonText: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  shareSection: {
    marginBottom: 24,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  shareOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareOption: {
    alignItems: 'center',
    flex: 1,
  },
  shareOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shareOptionText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statCardWide: {
    minWidth: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  statValueGold: {
    color: '#f59e0b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  howItWorksSection: {
    marginBottom: 24,
  },
  stepsContainer: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepNumberSuccess: {
    backgroundColor: '#22c55e',
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  stepDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: '#1e3a5f',
    marginLeft: 17,
    marginVertical: 8,
  },
  leaderboardSection: {
    marginBottom: 24,
  },
  leaderboardCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  leaderboardRank: {
    width: 32,
    alignItems: 'center',
  },
  rankNumber: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  leaderboardName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  leaderboardStats: {
    alignItems: 'flex-end',
  },
  leaderboardReferrals: {
    color: '#94a3b8',
    fontSize: 12,
  },
  leaderboardValue: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingSection: {
    marginBottom: 24,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    color: '#f59e0b',
    fontSize: 15,
    fontWeight: '600',
  },
  pendingSubtitle: {
    color: '#f59e0b80',
    fontSize: 13,
    marginTop: 2,
  },
});
