import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://empire-sales-suite.preview.emergentagent.com';

interface Recommendation {
  product: string;
  name: string;
  priority: number;
  priority_label: string;
  recommended_option: {
    name: string;
    price?: number;
    capacity_kwh?: number;
    power_kw?: number;
  };
  all_options: any[];
  benefits: string[];
  why_for_you: string[];
  monthly_value: number;
  incentives_available: boolean;
}

interface UpsellResult {
  customer_profile: any;
  recommendations: Recommendation[];
  bundle_summary: {
    total_products: number;
    total_monthly_savings: number;
    estimated_package_cost: number;
    annual_value: number;
  };
  sales_tip: string;
}

export default function UpsellRecommenderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UpsellResult | null>(null);

  // Form state
  const [systemSize, setSystemSize] = useState('8');
  const [annualBill, setAnnualBill] = useState('3600');
  const [hasEV, setHasEV] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [homeSize, setHomeSize] = useState('2500');
  const [hasBattery, setHasBattery] = useState(false);
  const [outageConcerns, setOutageConcerns] = useState(false);
  const [selectedState, setSelectedState] = useState('CA');

  const getRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/elite/upsell/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_size_kw: parseFloat(systemSize) || 0,
          annual_electric_bill: parseFloat(annualBill) || 0,
          has_ev: hasEV,
          has_pool: hasPool,
          home_size_sqft: parseInt(homeSize) || 0,
          current_battery: hasBattery,
          state: selectedState,
          outage_concerns: outageConcerns,
        }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (label: string) => {
    switch (label) {
      case 'HIGH':
        return '#ef4444';
      case 'MEDIUM':
        return '#f97316';
      case 'CONSIDER':
        return '#3b82f6';
      default:
        return '#64748b';
    }
  };

  const getProductIcon = (product: string) => {
    switch (product) {
      case 'battery':
        return 'battery-charging';
      case 'ev_charger':
        return 'car-sport';
      case 'pool_pump':
        return 'water';
      case 'smart_panel':
        return 'grid';
      case 'heat_pump':
        return 'thermometer';
      case 'insulation':
        return 'home';
      default:
        return 'cube';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#f97316', '#ea580c']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          data-testid="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Upsell Recommender</Text>
          <Text style={styles.headerSubtitle}>
            AI-powered add-on suggestions for maximum value
          </Text>
        </View>
      </LinearGradient>

      {/* Customer Profile Form */}
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Customer Profile</Text>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>System Size (kW)</Text>
            <TextInput
              style={styles.input}
              value={systemSize}
              onChangeText={setSystemSize}
              keyboardType="numeric"
              placeholder="8"
              placeholderTextColor="#64748b"
              data-testid="system-size-input"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Annual Bill ($)</Text>
            <TextInput
              style={styles.input}
              value={annualBill}
              onChangeText={setAnnualBill}
              keyboardType="numeric"
              placeholder="3600"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Home Size (sq ft)</Text>
          <TextInput
            style={styles.input}
            value={homeSize}
            onChangeText={setHomeSize}
            keyboardType="numeric"
            placeholder="2500"
            placeholderTextColor="#64748b"
          />
        </View>

        <Text style={styles.toggleSectionTitle}>Customer Has...</Text>

        <View style={styles.toggleGrid}>
          <TouchableOpacity
            style={[styles.toggleCard, hasEV && styles.toggleCardActive]}
            onPress={() => setHasEV(!hasEV)}
            data-testid="has-ev-toggle"
          >
            <Ionicons 
              name="car-sport" 
              size={28} 
              color={hasEV ? '#fff' : '#64748b'} 
            />
            <Text style={[styles.toggleLabel, hasEV && styles.toggleLabelActive]}>
              Electric Vehicle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleCard, hasPool && styles.toggleCardActive]}
            onPress={() => setHasPool(!hasPool)}
          >
            <Ionicons 
              name="water" 
              size={28} 
              color={hasPool ? '#fff' : '#64748b'} 
            />
            <Text style={[styles.toggleLabel, hasPool && styles.toggleLabelActive]}>
              Pool
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleCard, hasBattery && styles.toggleCardActive]}
            onPress={() => setHasBattery(!hasBattery)}
          >
            <Ionicons 
              name="battery-charging" 
              size={28} 
              color={hasBattery ? '#fff' : '#64748b'} 
            />
            <Text style={[styles.toggleLabel, hasBattery && styles.toggleLabelActive]}>
              Has Battery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleCard, outageConcerns && styles.toggleCardActive]}
            onPress={() => setOutageConcerns(!outageConcerns)}
          >
            <Ionicons 
              name="flash-off" 
              size={28} 
              color={outageConcerns ? '#fff' : '#64748b'} 
            />
            <Text style={[styles.toggleLabel, outageConcerns && styles.toggleLabelActive]}>
              Outage Concerns
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.calculateButton}
          onPress={getRecommendations}
          disabled={loading}
          data-testid="get-recommendations-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.calculateButtonText}>Get AI Recommendations</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {result && (
        <View style={styles.resultsContainer}>
          {/* Bundle Summary */}
          <LinearGradient
            colors={['#f97316', '#ea580c']}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryLabel}>Total Bundle Value</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(result.bundle_summary.total_monthly_savings)}/mo
            </Text>
            <Text style={styles.summarySubtext}>
              {formatCurrency(result.bundle_summary.annual_value)} annual savings
            </Text>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Products</Text>
                <Text style={styles.summaryItemValue}>
                  {result.bundle_summary.total_products}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Est. Cost</Text>
                <Text style={styles.summaryItemValue}>
                  {formatCurrency(result.bundle_summary.estimated_package_cost)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Sales Tip */}
          <View style={styles.salesTip}>
            <Ionicons name="bulb" size={20} color="#fbbf24" />
            <Text style={styles.salesTipText}>{result.sales_tip}</Text>
          </View>

          {/* Recommendations */}
          <Text style={styles.sectionTitle}>Recommendations</Text>

          {result.recommendations.map((rec, index) => (
            <View key={index} style={styles.recCard}>
              <View style={styles.recHeader}>
                <View style={styles.recIconContainer}>
                  <Ionicons 
                    name={getProductIcon(rec.product) as any} 
                    size={24} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.recHeaderContent}>
                  <Text style={styles.recName}>{rec.name}</Text>
                  <Text style={styles.recOption}>
                    {rec.recommended_option.name}
                  </Text>
                </View>
                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(rec.priority_label) }
                ]}>
                  <Text style={styles.priorityText}>{rec.priority_label}</Text>
                </View>
              </View>

              <View style={styles.recBody}>
                {/* Why for you */}
                <View style={styles.whySection}>
                  <Text style={styles.whyTitle}>Why for this customer:</Text>
                  {rec.why_for_you.map((reason, i) => (
                    <View key={i} style={styles.whyItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.whyText}>{reason}</Text>
                    </View>
                  ))}
                </View>

                {/* Value & Price */}
                <View style={styles.valueRow}>
                  <View>
                    <Text style={styles.valueLabel}>Monthly Value</Text>
                    <Text style={styles.valueAmount}>
                      {formatCurrency(rec.monthly_value)}/mo
                    </Text>
                  </View>
                  {rec.recommended_option.price && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.valueLabel}>Price</Text>
                      <Text style={styles.priceAmount}>
                        {formatCurrency(rec.recommended_option.price)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Incentives */}
                {rec.incentives_available && (
                  <View style={styles.incentiveBadge}>
                    <Ionicons name="gift" size={14} color="#10b981" />
                    <Text style={styles.incentiveText}>
                      Incentives available!
                    </Text>
                  </View>
                )}

                {/* Benefits */}
                <View style={styles.benefitsSection}>
                  <Text style={styles.benefitsTitle}>Benefits:</Text>
                  <View style={styles.benefitsList}>
                    {rec.benefits.slice(0, 3).map((benefit, i) => (
                      <View key={i} style={styles.benefitItem}>
                        <Text style={styles.benefitBullet}>•</Text>
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
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
  },
  backButton: {
    marginBottom: 16,
  },
  headerContent: {},
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleSectionTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    marginTop: 8,
  },
  toggleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  toggleCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: '1%',
    borderWidth: 2,
    borderColor: '#334155',
  },
  toggleCardActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  toggleLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  toggleLabelActive: {
    color: '#fff',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 12,
    padding: 18,
    marginTop: 8,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  resultsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  summarySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  summaryItemValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  salesTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
  },
  salesTipText: {
    fontSize: 13,
    color: '#fbbf24',
    marginLeft: 12,
    flex: 1,
  },
  recCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  recIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  recName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  recOption: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  recBody: {
    padding: 16,
  },
  whySection: {
    marginBottom: 16,
  },
  whyTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  whyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  whyText: {
    fontSize: 13,
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  valueLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  valueAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  incentiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  incentiveText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 6,
  },
  benefitsSection: {},
  benefitsTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  benefitsList: {},
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  benefitBullet: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 8,
  },
  benefitText: {
    fontSize: 13,
    color: '#94a3b8',
    flex: 1,
  },
});
