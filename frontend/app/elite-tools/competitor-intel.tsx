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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://empire-sales-suite.preview.emergentagent.com';

interface CompetitorInfo {
  competitor: string;
  tier: string;
  quotes_reported: number;
  average_ppw: number | null;
  min_ppw: number | null;
  max_ppw: number | null;
  typical_ppw: number;
  financing_model: string;
}

interface AnalysisData {
  competitors: CompetitorInfo[];
  market_summary: {
    total_quotes_tracked: number;
    competitors_tracked: number;
    market_average_ppw: number;
    your_competitive_range: string;
  };
  pricing_intelligence: {
    cheapest_competitor: string;
    premium_competitor: string;
    recommendation: string;
  };
}

interface BeatQuoteStrategy {
  competitor: string;
  their_quote: { total: number; price_per_watt: number; system_size_kw: number };
  your_target: { total: number; price_per_watt: number; savings_vs_them: number };
  win_strategies: Array<{
    type: string;
    strategy: string;
    detail: string;
    impact: string;
  }>;
  closing_script: string;
}

export default function CompetitorIntelScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [showBeatModal, setShowBeatModal] = useState(false);
  const [beatStrategy, setBeatStrategy] = useState<BeatQuoteStrategy | null>(null);
  const [beatLoading, setBeatLoading] = useState(false);
  
  // Beat Quote Form
  const [competitor, setCompetitor] = useState('Sunrun');
  const [theirPrice, setTheirPrice] = useState('35000');
  const [systemSize, setSystemSize] = useState('10');

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/intelligence/competitors/analysis`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch competitor data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBeatStrategy = async () => {
    setBeatLoading(true);
    try {
      const url = `${API_URL}/api/intelligence/competitors/beat-quote?competitor=${encodeURIComponent(competitor)}&their_price=${theirPrice}&system_size_kw=${systemSize}`;
      const response = await fetch(url);
      const result = await response.json();
      setBeatStrategy(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch beat strategy');
    } finally {
      setBeatLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'national': return '#3b82f6';
      case 'premium': return '#a855f7';
      case 'tech': return '#22c55e';
      case 'regional': return '#f97316';
      default: return '#64748b';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#22c55e';
      case 'medium': return '#f97316';
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
          <Ionicons name="eye" size={16} color="#ef4444" />
          <Text style={styles.headerBadgeText}>INTELLIGENCE</Text>
        </View>
        <Text style={styles.headerTitle}>Competitor Intel</Text>
        <Text style={styles.headerSubtitle}>Track pricing & win more deals</Text>
      </LinearGradient>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Analyzing market...</Text>
        </View>
      )}

      {data && (
        <>
          {/* Market Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Market Intelligence</Text>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{data.competitors.length}</Text>
                <Text style={styles.summaryLabel}>Competitors</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>${data.market_summary.market_average_ppw}</Text>
                <Text style={styles.summaryLabel}>Market Avg</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#22c55e' }]}>{data.market_summary.total_quotes_tracked}</Text>
                <Text style={styles.summaryLabel}>Quotes Tracked</Text>
              </View>
            </View>

            <View style={styles.recommendationBox}>
              <Ionicons name="bulb" size={20} color="#fbbf24" />
              <Text style={styles.recommendationText}>{data.pricing_intelligence.recommendation}</Text>
            </View>
          </View>

          {/* Beat a Quote */}
          <View style={styles.beatQuoteCard}>
            <Text style={styles.sectionTitle}>Beat Their Quote</Text>
            
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Competitor</Text>
                <TextInput
                  style={styles.input}
                  value={competitor}
                  onChangeText={setCompetitor}
                  placeholder="Sunrun, Tesla..."
                  placeholderTextColor="#64748b"
                  data-testid="competitor-input"
                />
              </View>
            </View>
            
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Their Price ($)</Text>
                <TextInput
                  style={styles.input}
                  value={theirPrice}
                  onChangeText={setTheirPrice}
                  keyboardType="numeric"
                  placeholder="35000"
                  placeholderTextColor="#64748b"
                  data-testid="price-input"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>System (kW)</Text>
                <TextInput
                  style={styles.input}
                  value={systemSize}
                  onChangeText={setSystemSize}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#64748b"
                  data-testid="size-input"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.beatButton}
              onPress={() => {
                fetchBeatStrategy();
                setShowBeatModal(true);
              }}
              data-testid="beat-quote-button"
            >
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.beatButtonText}>Get Win Strategy</Text>
            </TouchableOpacity>
          </View>

          {/* Competitor List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Competitor Directory</Text>
            
            {data.competitors.map((comp, index) => (
              <View key={index} style={styles.competitorCard}>
                <View style={styles.competitorHeader}>
                  <Text style={styles.competitorName}>{comp.competitor}</Text>
                  <View style={[styles.tierBadge, { backgroundColor: getTierColor(comp.tier) }]}>
                    <Text style={styles.tierText}>{comp.tier.toUpperCase()}</Text>
                  </View>
                </View>
                
                <View style={styles.competitorStats}>
                  <View style={styles.competitorStat}>
                    <Text style={styles.statValue}>
                      {comp.typical_ppw ? `$${comp.typical_ppw}` : '--'}
                    </Text>
                    <Text style={styles.statLabel}>$/Watt</Text>
                  </View>
                  <View style={styles.competitorStat}>
                    <Text style={styles.statValue}>{comp.quotes_reported}</Text>
                    <Text style={styles.statLabel}>Quotes</Text>
                  </View>
                  <View style={[styles.competitorStat, { flex: 2 }]}>
                    <Text style={styles.statValue} numberOfLines={1}>{comp.financing_model}</Text>
                    <Text style={styles.statLabel}>Financing</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Quick Intel */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Intel</Text>
            
            <View style={styles.intelCard}>
              <View style={styles.intelRow}>
                <View style={styles.intelItem}>
                  <Text style={styles.intelLabel}>Cheapest</Text>
                  <Text style={styles.intelValue}>{data.pricing_intelligence.cheapest_competitor}</Text>
                </View>
                <View style={styles.intelItem}>
                  <Text style={styles.intelLabel}>Premium</Text>
                  <Text style={styles.intelValue}>{data.pricing_intelligence.premium_competitor}</Text>
                </View>
              </View>
              <View style={styles.rangeBox}>
                <Ionicons name="analytics" size={20} color="#3b82f6" />
                <Text style={styles.rangeText}>
                  Your competitive range: {data.market_summary.your_competitive_range}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Beat Quote Modal */}
      <Modal
        visible={showBeatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBeatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Win Strategy</Text>
              <TouchableOpacity onPress={() => setShowBeatModal(false)} data-testid="close-modal">
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {beatLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#22c55e" />
                  <Text style={styles.loadingText}>Generating strategy...</Text>
                </View>
              )}

              {beatStrategy && !beatLoading && (
                <>
                  {/* Quote Comparison */}
                  <View style={styles.quoteComparison}>
                    <View style={[styles.quoteBox, { borderColor: '#ef4444' }]}>
                      <Text style={styles.quoteLabel}>Their Quote</Text>
                      <Text style={styles.quoteValue}>${beatStrategy.their_quote.total.toLocaleString()}</Text>
                      <Text style={styles.quotePpw}>${beatStrategy.their_quote.price_per_watt}/W</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={24} color="#64748b" />
                    <View style={[styles.quoteBox, { borderColor: '#22c55e' }]}>
                      <Text style={styles.quoteLabel}>Your Target</Text>
                      <Text style={[styles.quoteValue, { color: '#22c55e' }]}>
                        ${beatStrategy.your_target.total.toLocaleString()}
                      </Text>
                      <Text style={styles.quoteSavings}>
                        Save ${beatStrategy.your_target.savings_vs_them.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Strategies */}
                  <Text style={styles.strategiesTitle}>Win Strategies</Text>
                  {beatStrategy.win_strategies.map((strategy, index) => (
                    <View key={index} style={styles.strategyCard}>
                      <View style={styles.strategyHeader}>
                        <View style={[styles.impactBadge, { backgroundColor: getImpactColor(strategy.impact) }]}>
                          <Text style={styles.impactText}>{strategy.impact.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.strategyType}>{strategy.type}</Text>
                      </View>
                      <Text style={styles.strategyName}>{strategy.strategy}</Text>
                      <Text style={styles.strategyDetail}>{strategy.detail}</Text>
                    </View>
                  ))}

                  {/* Closing Script */}
                  <View style={styles.closingScript}>
                    <Ionicons name="mic" size={20} color="#fbbf24" />
                    <Text style={styles.closingTitle}>Closing Script</Text>
                    <Text style={styles.closingText}>{beatStrategy.closing_script}</Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 30,
  },
  headerBadgeText: {
    color: '#ef4444',
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
  },
  summaryCard: {
    margin: 20,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 10,
  },
  recommendationText: {
    color: '#fbbf24',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  beatQuoteCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formGroup: {
    flex: 1,
  },
  formLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  beatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  beatButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  competitorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  competitorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  competitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  competitorStats: {
    flexDirection: 'row',
  },
  competitorStat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  intelCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  intelRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  intelItem: {
    flex: 1,
  },
  intelLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  intelValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rangeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 10,
  },
  rangeText: {
    color: '#3b82f6',
    fontSize: 13,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  quoteComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quoteBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 2,
  },
  quoteLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  quoteValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  quotePpw: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 2,
  },
  quoteSavings: {
    color: '#22c55e',
    fontSize: 12,
    marginTop: 2,
  },
  strategiesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  strategyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  impactText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  strategyType: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 10,
    textTransform: 'capitalize',
  },
  strategyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  strategyDetail: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  closingScript: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 40,
  },
  closingTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  closingText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
