import React, { useState, useEffect } from 'react';
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

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://solar-lead-monetize.preview.emergentagent.com';

interface StateInfo {
  code: string;
  name: string;
  has_rebates: boolean;
  has_tax_credits: boolean;
  has_srecs: boolean;
  avg_utility_rate: number;
}

interface IncentiveResult {
  system_details: any;
  incentives: {
    federal: any[];
    state: any[];
    utility: any[];
    other: any[];
  };
  totals: {
    federal_incentives: number;
    state_incentives: number;
    utility_incentives: number;
    other_incentives: number;
    total_incentives: number;
    net_system_cost: number;
    savings_percentage: number;
  };
  long_term_value: {
    annual_electric_savings: number;
    twenty_five_year_savings: number;
    total_lifetime_benefit: number;
    roi_percentage: number;
  };
}

export default function DealStackerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<StateInfo[]>([]);
  const [result, setResult] = useState<IncentiveResult | null>(null);
  const [showStateSelector, setShowStateSelector] = useState(false);

  // Form state
  const [systemCost, setSystemCost] = useState('30000');
  const [systemSize, setSystemSize] = useState('8');
  const [selectedState, setSelectedState] = useState<StateInfo | null>(null);
  const [annualBill, setAnnualBill] = useState('3600');
  const [includeBattery, setIncludeBattery] = useState(false);
  const [batteryCost, setBatteryCost] = useState('12000');

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/elite/deal-stacker/states`);
      const data = await response.json();
      setStates(data.states);
      // Default to California
      const ca = data.states.find((s: StateInfo) => s.code === 'CA');
      if (ca) setSelectedState(ca);
    } catch (error) {
      console.error('Failed to fetch states:', error);
    }
  };

  const calculateIncentives = async () => {
    if (!selectedState) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/elite/deal-stacker/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_cost: parseFloat(systemCost) || 0,
          system_size_kw: parseFloat(systemSize) || 0,
          state: selectedState.code,
          annual_electric_bill: parseFloat(annualBill) || 0,
          is_battery_included: includeBattery,
          battery_cost: includeBattery ? parseFloat(batteryCost) || 0 : 0,
        }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Failed to calculate:', error);
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          data-testid="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Deal Stacking Calculator</Text>
          <Text style={styles.headerSubtitle}>
            Federal + State + Utility incentives combined
          </Text>
        </View>
      </LinearGradient>

      {/* Input Form */}
      <View style={styles.formContainer}>
        {/* State Selector */}
        <TouchableOpacity
          style={styles.stateSelector}
          onPress={() => setShowStateSelector(!showStateSelector)}
          data-testid="state-selector"
        >
          <View>
            <Text style={styles.inputLabel}>State</Text>
            <Text style={styles.selectedState}>
              {selectedState ? `${selectedState.name} (${selectedState.code})` : 'Select State'}
            </Text>
          </View>
          <Ionicons 
            name={showStateSelector ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#64748b" 
          />
        </TouchableOpacity>

        {showStateSelector && (
          <View style={styles.stateList}>
            {states.map((state) => (
              <TouchableOpacity
                key={state.code}
                style={[
                  styles.stateItem,
                  selectedState?.code === state.code && styles.stateItemSelected,
                ]}
                onPress={() => {
                  setSelectedState(state);
                  setShowStateSelector(false);
                }}
              >
                <View>
                  <Text style={styles.stateName}>{state.name}</Text>
                  <View style={styles.stateBadges}>
                    {state.has_rebates && (
                      <Text style={styles.stateBadge}>Rebates</Text>
                    )}
                    {state.has_tax_credits && (
                      <Text style={styles.stateBadge}>Tax Credits</Text>
                    )}
                    {state.has_srecs && (
                      <Text style={[styles.stateBadge, { backgroundColor: '#8b5cf6' }]}>SRECs</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.stateRate}>${state.avg_utility_rate}/kWh</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* System Cost */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>System Cost ($)</Text>
          <TextInput
            style={styles.input}
            value={systemCost}
            onChangeText={setSystemCost}
            keyboardType="numeric"
            placeholder="30000"
            placeholderTextColor="#64748b"
            data-testid="system-cost-input"
          />
        </View>

        {/* System Size */}
        <View style={styles.inputGroup}>
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

        {/* Annual Electric Bill */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Annual Electric Bill ($)</Text>
          <TextInput
            style={styles.input}
            value={annualBill}
            onChangeText={setAnnualBill}
            keyboardType="numeric"
            placeholder="3600"
            placeholderTextColor="#64748b"
            data-testid="annual-bill-input"
          />
        </View>

        {/* Battery Toggle */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.inputLabel}>Include Battery Storage</Text>
            <Text style={styles.inputHint}>Unlocks additional incentives</Text>
          </View>
          <Switch
            value={includeBattery}
            onValueChange={setIncludeBattery}
            trackColor={{ false: '#334155', true: '#10b981' }}
            thumbColor="#fff"
          />
        </View>

        {includeBattery && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Battery Cost ($)</Text>
            <TextInput
              style={styles.input}
              value={batteryCost}
              onChangeText={setBatteryCost}
              keyboardType="numeric"
              placeholder="12000"
              placeholderTextColor="#64748b"
            />
          </View>
        )}

        {/* Calculate Button */}
        <TouchableOpacity
          style={styles.calculateButton}
          onPress={calculateIncentives}
          disabled={loading}
          data-testid="calculate-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="calculator" size={20} color="#fff" />
              <Text style={styles.calculateButtonText}>Calculate Incentives</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {result && (
        <View style={styles.resultsContainer}>
          {/* Summary Card */}
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryLabel}>Total Incentives</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(result.totals.total_incentives)}
            </Text>
            <Text style={styles.summaryPercent}>
              {result.totals.savings_percentage}% off system cost
            </Text>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Gross Cost</Text>
                <Text style={styles.summaryItemValue}>
                  {formatCurrency(result.system_details.gross_cost)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Net Cost</Text>
                <Text style={styles.summaryItemValue}>
                  {formatCurrency(result.totals.net_system_cost)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Incentive Breakdown */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Incentive Breakdown</Text>
            
            {/* Federal */}
            {result.incentives.federal.map((item, index) => (
              <View key={`fed-${index}`} style={styles.incentiveItem}>
                <View style={styles.incentiveIcon}>
                  <Ionicons name="flag" size={20} color="#3b82f6" />
                </View>
                <View style={styles.incentiveContent}>
                  <Text style={styles.incentiveName}>{item.name}</Text>
                  <Text style={styles.incentiveDesc}>{item.description}</Text>
                </View>
                <Text style={styles.incentiveAmount}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}

            {/* State */}
            {result.incentives.state.map((item, index) => (
              <View key={`state-${index}`} style={styles.incentiveItem}>
                <View style={[styles.incentiveIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <Ionicons name="business" size={20} color="#8b5cf6" />
                </View>
                <View style={styles.incentiveContent}>
                  <Text style={styles.incentiveName}>{item.name}</Text>
                  <Text style={styles.incentiveDesc}>{item.description}</Text>
                </View>
                <Text style={styles.incentiveAmount}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}

            {/* Other */}
            {result.incentives.other.map((item, index) => (
              <View key={`other-${index}`} style={styles.incentiveItem}>
                <View style={[styles.incentiveIcon, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                  <Ionicons name="gift" size={20} color="#f97316" />
                </View>
                <View style={styles.incentiveContent}>
                  <Text style={styles.incentiveName}>{item.name}</Text>
                  <Text style={styles.incentiveDesc}>{item.value_note || item.description}</Text>
                </View>
                {item.amount > 0 && (
                  <Text style={styles.incentiveAmount}>
                    {formatCurrency(item.amount)}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Long-term Value */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>25-Year Value</Text>
            
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Annual Savings</Text>
              <Text style={styles.valueAmount}>
                {formatCurrency(result.long_term_value.annual_electric_savings)}/yr
              </Text>
            </View>
            
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>25-Year Savings</Text>
              <Text style={styles.valueAmount}>
                {formatCurrency(result.long_term_value.twenty_five_year_savings)}
              </Text>
            </View>
            
            <View style={[styles.valueRow, styles.valueRowHighlight]}>
              <Text style={styles.valueLabelBold}>Total Lifetime Benefit</Text>
              <Text style={styles.valueAmountBold}>
                {formatCurrency(result.long_term_value.total_lifetime_benefit)}
              </Text>
            </View>
            
            <View style={styles.roiContainer}>
              <Text style={styles.roiLabel}>Return on Investment</Text>
              <Text style={styles.roiValue}>{result.long_term_value.roi_percentage}%</Text>
            </View>
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
  stateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedState: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  stateList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 300,
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  stateItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  stateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stateBadges: {
    flexDirection: 'row',
    marginTop: 4,
  },
  stateBadge: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  stateRate: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
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
  summaryPercent: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {},
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
  breakdownCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  incentiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  incentiveIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incentiveContent: {
    flex: 1,
    marginLeft: 12,
  },
  incentiveName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  incentiveDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  incentiveAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  valueRowHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  valueLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  valueLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  valueAmountBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  roiContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  roiLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  roiValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#10b981',
  },
});
