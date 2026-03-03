import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://solar-lead-monetize.preview.emergentagent.com';

interface TimingResult {
  lead_name: string;
  recommended_channel: string;
  urgent: boolean;
  urgency_message: string | null;
  optimal_times: Array<{
    datetime: string;
    day: string;
    time: string;
    hours_from_now: number;
  }>;
  best_time: {
    datetime: string;
    day: string;
    time: string;
    hours_from_now: number;
  } | null;
  timing_factors: {
    occupation_profile: string;
    profile_notes: string;
    response_pattern: string;
    learned_best_hours: number[];
    pipeline_stage: string;
    stage_guidance: string;
  };
  avoid_times: {
    hours: number[];
    reason: string;
  };
  pro_tips: string[];
}

export default function FollowUpTimingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TimingResult | null>(null);
  
  // Form state
  const [leadName, setLeadName] = useState('John Smith');
  const [occupation, setOccupation] = useState<'professional' | 'retired' | 'self-employed' | 'unknown'>('professional');
  const [channel, setChannel] = useState<'phone' | 'sms' | 'email'>('phone');
  const [stage, setStage] = useState('new');
  const [urgency, setUrgency] = useState('medium');

  const getTiming = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai-tools/follow-up-timing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_name: leadName,
          occupation: occupation,
          preferred_channel: channel,
          pipeline_stage: stage,
          urgency_level: urgency,
          timezone: 'America/Los_Angeles',
          previous_contact_times: [],
          response_times: [],
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to get timing recommendation');
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case 'phone': return 'call';
      case 'sms': return 'chatbubble';
      case 'email': return 'mail';
      default: return 'notifications';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          data-testid="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerBadge}>
          <Ionicons name="time" size={16} color="#06b6d4" />
          <Text style={styles.headerBadgeText}>AI POWER</Text>
        </View>
        <Text style={styles.headerTitle}>Smart Follow-up</Text>
        <Text style={styles.headerSubtitle}>Best time to reach each lead</Text>
      </LinearGradient>

      {/* Form */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Lead Details</Text>

        {/* Lead Name */}
        <Text style={styles.label}>Lead Name</Text>
        <TextInput
          style={styles.input}
          value={leadName}
          onChangeText={setLeadName}
          placeholder="John Smith"
          placeholderTextColor="#64748b"
          data-testid="name-input"
        />

        {/* Occupation */}
        <Text style={styles.label}>Occupation Type</Text>
        <View style={styles.optionRow}>
          {[
            { value: 'professional', label: 'Professional', icon: 'briefcase' },
            { value: 'retired', label: 'Retired', icon: 'home' },
            { value: 'self-employed', label: 'Self-Employed', icon: 'business' },
            { value: 'unknown', label: 'Unknown', icon: 'help' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, occupation === opt.value && styles.optionCardActive]}
              onPress={() => setOccupation(opt.value as any)}
              data-testid={`occupation-${opt.value}`}
            >
              <Ionicons name={opt.icon as any} size={20} color={occupation === opt.value ? '#fff' : '#64748b'} />
              <Text style={[styles.optionLabel, occupation === opt.value && styles.optionLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Channel */}
        <Text style={styles.label}>Preferred Channel</Text>
        <View style={styles.channelRow}>
          {['phone', 'sms', 'email'].map((ch) => (
            <TouchableOpacity
              key={ch}
              style={[styles.channelButton, channel === ch && styles.channelButtonActive]}
              onPress={() => setChannel(ch as any)}
              data-testid={`channel-${ch}`}
            >
              <Ionicons name={getChannelIcon(ch) as any} size={24} color={channel === ch ? '#fff' : '#64748b'} />
              <Text style={[styles.channelText, channel === ch && styles.channelTextActive]}>
                {ch.charAt(0).toUpperCase() + ch.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pipeline Stage */}
        <Text style={styles.label}>Pipeline Stage</Text>
        <View style={styles.stageRow}>
          {[
            { value: 'new', color: '#22c55e' },
            { value: 'contacted', color: '#3b82f6' },
            { value: 'appointment_set', color: '#f97316' },
            { value: 'proposal_sent', color: '#8b5cf6' },
            { value: 'negotiating', color: '#ef4444' },
          ].map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.stageButton, 
                stage === s.value && { backgroundColor: s.color, borderColor: s.color }
              ]}
              onPress={() => setStage(s.value)}
              data-testid={`stage-${s.value}`}
            >
              <Text style={[styles.stageText, stage === s.value && styles.stageTextActive]}>
                {s.value.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Urgency */}
        <Text style={styles.label}>Urgency Level</Text>
        <View style={styles.urgencyRow}>
          {[
            { value: 'low', color: '#64748b' },
            { value: 'medium', color: '#f97316' },
            { value: 'high', color: '#ef4444' },
            { value: 'critical', color: '#dc2626' },
          ].map((u) => (
            <TouchableOpacity
              key={u.value}
              style={[
                styles.urgencyButton, 
                urgency === u.value && { backgroundColor: u.color, borderColor: u.color }
              ]}
              onPress={() => setUrgency(u.value)}
              data-testid={`urgency-${u.value}`}
            >
              <Text style={[styles.urgencyText, urgency === u.value && styles.urgencyTextActive]}>
                {u.value.charAt(0).toUpperCase() + u.value.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.getTimingButton}
          onPress={getTiming}
          disabled={loading}
          data-testid="get-timing-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="time" size={20} color="#fff" />
              <Text style={styles.getTimingButtonText}>Get Best Time</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {result && (
        <View style={styles.resultSection}>
          {/* Urgency Alert */}
          {result.urgent && result.urgency_message && (
            <View style={styles.urgentAlert}>
              <Ionicons name="warning" size={24} color="#fbbf24" />
              <Text style={styles.urgentText}>{result.urgency_message}</Text>
            </View>
          )}

          {/* Best Time */}
          {result.best_time && (
            <View style={styles.bestTimeCard}>
              <View style={styles.bestTimeHeader}>
                <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
                <Text style={styles.bestTimeTitle}>Best Time to Contact</Text>
              </View>
              <View style={styles.bestTimeInfo}>
                <Text style={styles.bestTimeDay}>{result.best_time.day}</Text>
                <Text style={styles.bestTimeHour}>{result.best_time.time}</Text>
                <Text style={styles.bestTimeHours}>
                  In {result.best_time.hours_from_now} hours
                </Text>
              </View>
              <View style={styles.channelRecommend}>
                <Ionicons name={getChannelIcon(result.recommended_channel) as any} size={20} color="#06b6d4" />
                <Text style={styles.channelRecommendText}>
                  Use {result.recommended_channel.toUpperCase()} for best response
                </Text>
              </View>
            </View>
          )}

          {/* Alternative Times */}
          {result.optimal_times.length > 1 && (
            <View style={styles.alternativesCard}>
              <Text style={styles.cardTitle}>Alternative Times</Text>
              {result.optimal_times.slice(1).map((time, index) => (
                <View key={index} style={styles.altTimeRow}>
                  <View style={styles.altTimeBadge}>
                    <Text style={styles.altTimeBadgeText}>{index + 2}</Text>
                  </View>
                  <View style={styles.altTimeInfo}>
                    <Text style={styles.altTimeDay}>{time.day} at {time.time}</Text>
                    <Text style={styles.altTimeHours}>{time.hours_from_now}h from now</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Timing Factors */}
          <View style={styles.factorsCard}>
            <Text style={styles.cardTitle}>Timing Intelligence</Text>
            
            <View style={styles.factorRow}>
              <Ionicons name="person" size={18} color="#64748b" />
              <View style={styles.factorContent}>
                <Text style={styles.factorLabel}>Profile</Text>
                <Text style={styles.factorValue}>{result.timing_factors.occupation_profile}</Text>
              </View>
            </View>
            
            <View style={styles.factorRow}>
              <Ionicons name="information-circle" size={18} color="#64748b" />
              <View style={styles.factorContent}>
                <Text style={styles.factorLabel}>Notes</Text>
                <Text style={styles.factorNotes}>{result.timing_factors.profile_notes}</Text>
              </View>
            </View>
            
            <View style={styles.factorRow}>
              <Ionicons name="git-branch" size={18} color="#64748b" />
              <View style={styles.factorContent}>
                <Text style={styles.factorLabel}>Stage Guidance</Text>
                <Text style={styles.factorValue}>{result.timing_factors.stage_guidance}</Text>
              </View>
            </View>
          </View>

          {/* Avoid Times */}
          <View style={styles.avoidCard}>
            <View style={styles.avoidHeader}>
              <Ionicons name="close-circle" size={20} color="#ef4444" />
              <Text style={styles.avoidTitle}>Times to Avoid</Text>
            </View>
            <Text style={styles.avoidHours}>
              {result.avoid_times.hours.map(h => `${h}:00`).join(', ')}
            </Text>
            <Text style={styles.avoidReason}>{result.avoid_times.reason}</Text>
          </View>

          {/* Pro Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.cardTitle}>Pro Tips</Text>
            {result.pro_tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <Ionicons name="bulb" size={16} color="#fbbf24" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 30,
  },
  headerBadgeText: {
    color: '#06b6d4',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  formSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionCardActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  optionLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  optionLabelActive: {
    color: '#fff',
  },
  channelRow: {
    flexDirection: 'row',
    gap: 12,
  },
  channelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  channelButtonActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  channelText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  channelTextActive: {
    color: '#fff',
  },
  stageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stageText: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  stageTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  urgencyText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  urgencyTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  getTimingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 24,
  },
  getTimingButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  resultSection: {
    padding: 20,
    paddingTop: 0,
  },
  urgentAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  urgentText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  bestTimeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  bestTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bestTimeTitle: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  bestTimeInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bestTimeDay: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  bestTimeHour: {
    color: '#22c55e',
    fontSize: 36,
    fontWeight: '800',
  },
  bestTimeHours: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  channelRecommend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 12,
    borderRadius: 10,
  },
  channelRecommendText: {
    color: '#06b6d4',
    fontSize: 13,
    marginLeft: 8,
  },
  alternativesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  altTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  altTimeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  altTimeBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  altTimeInfo: {
    flex: 1,
  },
  altTimeDay: {
    color: '#fff',
    fontSize: 14,
  },
  altTimeHours: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  factorsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  factorRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  factorContent: {
    flex: 1,
    marginLeft: 12,
  },
  factorLabel: {
    color: '#64748b',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  factorValue: {
    color: '#fff',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  factorNotes: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
  },
  avoidCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  avoidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avoidTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  avoidHours: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  avoidReason: {
    color: '#94a3b8',
    fontSize: 12,
  },
  tipsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  tipRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tipText: {
    color: '#e2e8f0',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});
