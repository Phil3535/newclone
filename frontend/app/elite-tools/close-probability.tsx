import React, { useState, useEffect } from 'react';
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

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://empire-sales-suite.preview.emergentagent.com';

interface Factor {
  factor: string;
  impact: number;
}

interface PredictionResult {
  probability_score: number;
  tier: string;
  tier_color: string;
  recommendation: string;
  next_best_actions: string[];
  score_breakdown: {
    base_score: number;
    engagement_boost: number;
    final_score: number;
  };
  contributing_factors: Factor[];
}

export default function CloseProbabilityScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  
  // Form state
  const [billAmount, setBillAmount] = useState('200');
  const [homeowner, setHomeowner] = useState(true);
  const [timeline, setTimeline] = useState('1-3 months');
  const [creditScore, setCreditScore] = useState('good');
  const [source, setSource] = useState('web_form');
  const [appointmentsCompleted, setAppointmentsCompleted] = useState('0');
  const [proposalsSent, setProposalsSent] = useState('0');
  const [respondedToSms, setRespondedToSms] = useState(false);
  const [daysInPipeline, setDaysInPipeline] = useState('7');

  const predict = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai-tools/close-probability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_amount: parseFloat(billAmount),
          homeowner: homeowner,
          timeline: timeline,
          credit_score_range: creditScore,
          source: source,
          appointments_completed: parseInt(appointmentsCompleted),
          proposals_sent: parseInt(proposalsSent),
          responded_to_sms: respondedToSms,
          days_in_pipeline: parseInt(daysInPipeline),
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to predict close probability');
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'HOT': return 'flame';
      case 'WARM': return 'sunny';
      case 'NURTURE': return 'water';
      case 'COLD': return 'snow';
      default: return 'help';
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
          <Ionicons name="analytics" size={16} color="#8b5cf6" />
          <Text style={styles.headerBadgeText}>AI POWER</Text>
        </View>
        <Text style={styles.headerTitle}>Close Probability</Text>
        <Text style={styles.headerSubtitle}>AI predicts which leads will close</Text>
      </LinearGradient>

      {/* Form */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Lead Information</Text>

        {/* Bill Amount */}
        <View style={styles.formRow}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Monthly Electric Bill ($)</Text>
            <TextInput
              style={styles.input}
              value={billAmount}
              onChangeText={setBillAmount}
              keyboardType="numeric"
              placeholder="200"
              placeholderTextColor="#64748b"
              data-testid="bill-input"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Days in Pipeline</Text>
            <TextInput
              style={styles.input}
              value={daysInPipeline}
              onChangeText={setDaysInPipeline}
              keyboardType="numeric"
              placeholder="7"
              placeholderTextColor="#64748b"
              data-testid="days-input"
            />
          </View>
        </View>

        {/* Homeowner Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.label}>Homeowner</Text>
          <TouchableOpacity
            style={[styles.toggle, homeowner && styles.toggleActive]}
            onPress={() => setHomeowner(!homeowner)}
            data-testid="homeowner-toggle"
          >
            <Ionicons name={homeowner ? 'checkmark' : 'close'} size={20} color="#fff" />
            <Text style={styles.toggleText}>{homeowner ? 'Yes' : 'No'}</Text>
          </TouchableOpacity>
        </View>

        {/* Timeline */}
        <Text style={styles.label}>Timeline</Text>
        <View style={styles.optionRow}>
          {['immediate', '1-3 months', '3-6 months', 'just looking'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.optionButton, timeline === t && styles.optionButtonActive]}
              onPress={() => setTimeline(t)}
              data-testid={`timeline-${t}`}
            >
              <Text style={[styles.optionText, timeline === t && styles.optionTextActive]}>
                {t === 'immediate' ? 'Now!' : t === 'just looking' ? 'Looking' : t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Credit Score */}
        <Text style={styles.label}>Credit Score</Text>
        <View style={styles.optionRow}>
          {['excellent', 'good', 'fair', 'poor'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.optionButton, creditScore === c && styles.optionButtonActive]}
              onPress={() => setCreditScore(c)}
              data-testid={`credit-${c}`}
            >
              <Text style={[styles.optionText, creditScore === c && styles.optionTextActive]}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Source */}
        <Text style={styles.label}>Lead Source</Text>
        <View style={styles.optionRow}>
          {['referral', 'qr_scan', 'web_form', 'cold_call'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.optionButton, source === s && styles.optionButtonActive]}
              onPress={() => setSource(s)}
              data-testid={`source-${s}`}
            >
              <Text style={[styles.optionText, source === s && styles.optionTextActive]}>
                {s.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Engagement */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Engagement</Text>
        
        <View style={styles.formRow}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Appointments Done</Text>
            <TextInput
              style={styles.input}
              value={appointmentsCompleted}
              onChangeText={setAppointmentsCompleted}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748b"
              data-testid="appointments-input"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Proposals Sent</Text>
            <TextInput
              style={styles.input}
              value={proposalsSent}
              onChangeText={setProposalsSent}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748b"
              data-testid="proposals-input"
            />
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>Responded to SMS</Text>
          <TouchableOpacity
            style={[styles.toggle, respondedToSms && styles.toggleActive]}
            onPress={() => setRespondedToSms(!respondedToSms)}
            data-testid="sms-toggle"
          >
            <Ionicons name={respondedToSms ? 'checkmark' : 'close'} size={20} color="#fff" />
            <Text style={styles.toggleText}>{respondedToSms ? 'Yes' : 'No'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.predictButton}
          onPress={predict}
          disabled={loading}
          data-testid="predict-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="analytics" size={20} color="#fff" />
              <Text style={styles.predictButtonText}>Predict Close Rate</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {result && (
        <View style={styles.resultSection}>
          {/* Score Circle */}
          <View style={[styles.scoreCircle, { borderColor: result.tier_color }]}>
            <Ionicons name={getTierIcon(result.tier) as any} size={28} color={result.tier_color} />
            <Text style={[styles.scoreValue, { color: result.tier_color }]}>
              {result.probability_score}%
            </Text>
            <Text style={[styles.tierLabel, { color: result.tier_color }]}>{result.tier}</Text>
          </View>

          {/* Recommendation */}
          <View style={[styles.recommendationCard, { borderLeftColor: result.tier_color }]}>
            <Ionicons name="bulb" size={20} color={result.tier_color} />
            <Text style={styles.recommendationText}>{result.recommendation}</Text>
          </View>

          {/* Score Breakdown */}
          <View style={styles.breakdownCard}>
            <Text style={styles.cardTitle}>Score Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Base Score</Text>
              <Text style={styles.breakdownValue}>{result.score_breakdown.base_score}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Engagement Boost</Text>
              <Text style={[styles.breakdownValue, { color: result.score_breakdown.engagement_boost >= 0 ? '#22c55e' : '#ef4444' }]}>
                {result.score_breakdown.engagement_boost >= 0 ? '+' : ''}{result.score_breakdown.engagement_boost}
              </Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
              <Text style={styles.breakdownLabel}>Final Score</Text>
              <Text style={[styles.breakdownValue, { fontWeight: '800', fontSize: 24 }]}>{result.score_breakdown.final_score}</Text>
            </View>
          </View>

          {/* Contributing Factors */}
          <View style={styles.factorsCard}>
            <Text style={styles.cardTitle}>Contributing Factors</Text>
            {result.contributing_factors.map((factor, index) => (
              <View key={index} style={styles.factorRow}>
                <View style={styles.factorContent}>
                  <Ionicons 
                    name={factor.impact >= 0 ? 'add-circle' : 'remove-circle'} 
                    size={16} 
                    color={factor.impact >= 0 ? '#22c55e' : '#ef4444'} 
                  />
                  <Text style={styles.factorText}>{factor.factor}</Text>
                </View>
                <Text style={[styles.factorImpact, { color: factor.impact >= 0 ? '#22c55e' : '#ef4444' }]}>
                  {factor.impact >= 0 ? '+' : ''}{factor.impact}
                </Text>
              </View>
            ))}
          </View>

          {/* Next Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Next Best Actions</Text>
            {result.next_best_actions.map((action, index) => (
              <View key={index} style={styles.actionRow}>
                <View style={styles.actionNumber}>
                  <Text style={styles.actionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.actionText}>{action}</Text>
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
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 30,
  },
  headerBadgeText: {
    color: '#8b5cf6',
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
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  toggleActive: {
    backgroundColor: '#22c55e',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  optionText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  optionTextActive: {
    color: '#fff',
  },
  predictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 16,
  },
  predictButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  resultSection: {
    padding: 20,
    paddingTop: 0,
  },
  scoreCircle: {
    alignSelf: 'center',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: '800',
    marginTop: 8,
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  recommendationText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  breakdownCard: {
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
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 8,
    paddingTop: 12,
  },
  breakdownLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  breakdownValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  factorsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  factorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  factorText: {
    color: '#e2e8f0',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  factorImpact: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  actionsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
});
