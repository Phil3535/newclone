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

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://elite-solar-rep.preview.emergentagent.com';

interface ResponseData {
  empathy: string;
  rebuttal: string;
  key_stat?: string;
  stats?: string;
  closing_question: string;
  source: string;
}

interface ObjectionResponse {
  objection: string;
  category: string;
  confidence: string;
  recommended_response: ResponseData;
  ai_response?: ResponseData;
  scripted_response?: ResponseData;
}

const COMMON_OBJECTIONS = [
  { text: "It's too expensive", category: 'price' },
  { text: "I need to think about it", category: 'timing' },
  { text: "I don't trust solar companies", category: 'trust' },
  { text: "My roof is too old", category: 'roof' },
  { text: "I might move soon", category: 'moving' },
  { text: "Need to discuss with spouse", category: 'spouse' },
  { text: "Waiting for better technology", category: 'technology' },
  { text: "Can't afford it right now", category: 'price' },
];

export default function AIObjectionHandlerScreen() {
  const router = useRouter();
  const [objection, setObjection] = useState('');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'empathetic' | 'direct'>('professional');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ObjectionResponse | null>(null);

  const handleObjection = async (text: string = objection) => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter an objection');
      return;
    }

    setLoading(true);
    setObjection(text);
    
    try {
      const res = await fetch(`${API_URL}/api/ai-tools/objection-handler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objection: text,
          tone: tone,
        }),
      });
      const result = await res.json();
      setResponse(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to get rebuttal');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'price': return 'cash';
      case 'timing': return 'time';
      case 'trust': return 'shield';
      case 'roof': return 'home';
      case 'moving': return 'car';
      case 'spouse': return 'people';
      case 'technology': return 'hardware-chip';
      default: return 'chatbubbles';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'price': return '#22c55e';
      case 'timing': return '#f97316';
      case 'trust': return '#3b82f6';
      case 'roof': return '#8b5cf6';
      case 'moving': return '#ec4899';
      case 'spouse': return '#06b6d4';
      case 'technology': return '#14b8a6';
      default: return '#64748b';
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
          <Ionicons name="flash" size={16} color="#f97316" />
          <Text style={styles.headerBadgeText}>AI POWER</Text>
        </View>
        <Text style={styles.headerTitle}>Objection Handler</Text>
        <Text style={styles.headerSubtitle}>Get perfect rebuttals instantly</Text>
      </LinearGradient>

      {/* Input Section */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>What did they say?</Text>
        
        <TextInput
          style={styles.textInput}
          placeholder="Type the customer's objection..."
          placeholderTextColor="#64748b"
          value={objection}
          onChangeText={setObjection}
          multiline
          numberOfLines={3}
          data-testid="objection-input"
        />

        {/* Tone Selector */}
        <Text style={styles.toneLabel}>Response Tone:</Text>
        <View style={styles.toneRow}>
          {['professional', 'friendly', 'empathetic', 'direct'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toneButton, tone === t && styles.toneButtonActive]}
              onPress={() => setTone(t as any)}
              data-testid={`tone-${t}`}
            >
              <Text style={[styles.toneText, tone === t && styles.toneTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.handleButton}
          onPress={() => handleObjection()}
          disabled={loading}
          data-testid="handle-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.handleButtonText}>Get Rebuttal</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Objections */}
      <View style={styles.quickSection}>
        <Text style={styles.sectionTitle}>Common Objections</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
          {COMMON_OBJECTIONS.map((obj, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickChip}
              onPress={() => handleObjection(obj.text)}
              data-testid={`quick-objection-${index}`}
            >
              <Ionicons 
                name={getCategoryIcon(obj.category) as any} 
                size={16} 
                color={getCategoryColor(obj.category)} 
              />
              <Text style={styles.quickChipText}>{obj.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Response */}
      {response && (
        <View style={styles.responseSection}>
          {/* Category Badge */}
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(response.category) }]}>
              <Ionicons name={getCategoryIcon(response.category) as any} size={16} color="#fff" />
              <Text style={styles.categoryText}>{response.category.toUpperCase()}</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{response.confidence} confidence</Text>
            </View>
          </View>

          {/* Empathy */}
          <View style={styles.responseCard}>
            <View style={styles.responseHeader}>
              <Ionicons name="heart" size={20} color="#ec4899" />
              <Text style={styles.responseLabel}>Start with Empathy</Text>
            </View>
            <Text style={styles.responseText}>
              {response.recommended_response.empathy}
            </Text>
          </View>

          {/* Main Rebuttal */}
          <View style={[styles.responseCard, styles.mainRebuttal]}>
            <View style={styles.responseHeader}>
              <Ionicons name="chatbubble" size={20} color="#3b82f6" />
              <Text style={styles.responseLabel}>Your Response</Text>
            </View>
            <Text style={styles.rebuttalText}>
              {response.recommended_response.rebuttal}
            </Text>
          </View>

          {/* Stats */}
          {(response.recommended_response.key_stat || response.recommended_response.stats) && (
            <View style={styles.responseCard}>
              <View style={styles.responseHeader}>
                <Ionicons name="stats-chart" size={20} color="#22c55e" />
                <Text style={styles.responseLabel}>Backup with Data</Text>
              </View>
              <Text style={styles.statsText}>
                {response.recommended_response.key_stat || response.recommended_response.stats}
              </Text>
            </View>
          )}

          {/* Closing Question */}
          <View style={[styles.responseCard, styles.closingCard]}>
            <View style={styles.responseHeader}>
              <Ionicons name="help-circle" size={20} color="#fbbf24" />
              <Text style={styles.responseLabel}>Close with a Question</Text>
            </View>
            <Text style={styles.closingText}>
              "{response.recommended_response.closing_question}"
            </Text>
          </View>

          {/* Source */}
          <View style={styles.sourceRow}>
            <Ionicons 
              name={response.recommended_response.source === 'ai_generated' ? 'sparkles' : 'book'} 
              size={14} 
              color="#64748b" 
            />
            <Text style={styles.sourceText}>
              {response.recommended_response.source === 'ai_generated' ? 'AI Generated' : 'Expert Script'}
            </Text>
          </View>
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.sectionTitle}>Pro Tips</Text>
        
        <View style={styles.tipCard}>
          <Ionicons name="volume-high" size={20} color="#f97316" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Mirror & Match</Text>
            <Text style={styles.tipText}>
              Match their energy level. If they're frustrated, acknowledge it. If they're analytical, be data-driven.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="pause" size={20} color="#3b82f6" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Pause Before Responding</Text>
            <Text style={styles.tipText}>
              A 2-3 second pause shows you're thinking and not just reciting a script.
            </Text>
          </View>
        </View>
      </View>

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
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 30,
  },
  headerBadgeText: {
    color: '#f97316',
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
  inputSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  toneLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  toneRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toneButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  toneButtonActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  toneText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  toneTextActive: {
    color: '#fff',
  },
  handleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  handleButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  quickSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickScroll: {
    marginTop: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    gap: 8,
  },
  quickChipText: {
    color: '#e2e8f0',
    fontSize: 13,
  },
  responseSection: {
    padding: 20,
    paddingTop: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  responseCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mainRebuttal: {
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  responseLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  responseText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 24,
  },
  rebuttalText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 26,
  },
  statsText: {
    color: '#22c55e',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  closingCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  closingText: {
    color: '#fbbf24',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  sourceText: {
    color: '#64748b',
    fontSize: 12,
  },
  tipsSection: {
    padding: 20,
    paddingTop: 0,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tipContent: {
    flex: 1,
    marginLeft: 14,
  },
  tipTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
  },
});
