import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://elite-solar-rep.preview.emergentagent.com';

interface FinancingOption {
  name: string;
  term_years: number;
  apr: number;
  monthly_payment: number;
  total_paid: number;
  total_interest: number;
  is_selected?: boolean;
  savings_vs_selected?: number;
  note?: string;
}

interface PaymentResult {
  loan_details: {
    system_cost: number;
    down_payment: number;
    incentives_applied: number;
    amount_financed: number;
  };
  financing_options: FinancingOption[];
  recommendation: {
    best_value: string;
    reason: string;
  };
}

export default function PaymentCalculatorScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);

  // Form state
  const [systemCost, setSystemCost] = useState('30000');
  const [downPayment, setDownPayment] = useState('0');
  const [loanTerm, setLoanTerm] = useState('25');
  const [interestRate, setInterestRate] = useState('6.99');
  const [incentives, setIncentives] = useState('9000');

  const calculatePayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/elite/payment-calculator/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_cost: parseFloat(systemCost) || 0,
          down_payment: parseFloat(downPayment) || 0,
          loan_term_years: parseInt(loanTerm) || 25,
          interest_rate: parseFloat(interestRate) || 6.99,
          incentives_applied: parseFloat(incentives) || 0,
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

  const getOptionColor = (index: number) => {
    const colors = [
      ['#3b82f6', '#2563eb'],
      ['#10b981', '#059669'],
      ['#f97316', '#ea580c'],
      ['#8b5cf6', '#7c3aed'],
    ];
    return colors[index % colors.length];
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          data-testid="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Payment Calculator</Text>
          <Text style={styles.headerSubtitle}>
            Compare financing options side by side
          </Text>
        </View>
      </LinearGradient>

      {/* Input Form */}
      <View style={styles.formContainer}>
        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
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
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Down Payment ($)</Text>
            <TextInput
              style={styles.input}
              value={downPayment}
              onChangeText={setDownPayment}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Incentives Applied ($)</Text>
          <TextInput
            style={styles.input}
            value={incentives}
            onChangeText={setIncentives}
            keyboardType="numeric"
            placeholder="9000"
            placeholderTextColor="#64748b"
          />
          <Text style={styles.inputHint}>
            Federal ITC + State rebates (use Deal Stacker to calculate)
          </Text>
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Loan Term (years)</Text>
            <TextInput
              style={styles.input}
              value={loanTerm}
              onChangeText={setLoanTerm}
              keyboardType="numeric"
              placeholder="25"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Interest Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="numeric"
              placeholder="6.99"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.calculateButton}
          onPress={calculatePayments}
          disabled={loading}
          data-testid="calculate-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="calculator" size={20} color="#fff" />
              <Text style={styles.calculateButtonText}>Calculate Payments</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {result && (
        <View style={styles.resultsContainer}>
          {/* Loan Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Amount Financed</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(result.loan_details.amount_financed)}
            </Text>
            <View style={styles.summaryBreakdown}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>System</Text>
                <Text style={styles.summaryItemValue}>
                  {formatCurrency(result.loan_details.system_cost)}
                </Text>
              </View>
              <Text style={styles.summaryOperator}>-</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Down</Text>
                <Text style={styles.summaryItemValue}>
                  {formatCurrency(result.loan_details.down_payment)}
                </Text>
              </View>
              <Text style={styles.summaryOperator}>-</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Incentives</Text>
                <Text style={styles.summaryItemValue}>
                  {formatCurrency(result.loan_details.incentives_applied)}
                </Text>
              </View>
            </View>
          </View>

          {/* Financing Options */}
          <Text style={styles.sectionTitle}>Financing Options</Text>
          
          {result.financing_options.map((option, index) => (
            <View key={index} style={styles.optionCard}>
              <LinearGradient
                colors={getOptionColor(index)}
                style={styles.optionHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.optionName}>{option.name}</Text>
                {option.is_selected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>YOUR TERMS</Text>
                  </View>
                )}
              </LinearGradient>
              
              <View style={styles.optionBody}>
                <View style={styles.optionMainStat}>
                  <Text style={styles.optionMonthly}>
                    {formatCurrency(option.monthly_payment)}
                  </Text>
                  <Text style={styles.optionMonthlyLabel}>/month</Text>
                </View>
                
                <View style={styles.optionDetails}>
                  <View style={styles.optionDetail}>
                    <Text style={styles.optionDetailLabel}>Term</Text>
                    <Text style={styles.optionDetailValue}>{option.term_years} years</Text>
                  </View>
                  <View style={styles.optionDetail}>
                    <Text style={styles.optionDetailLabel}>APR</Text>
                    <Text style={styles.optionDetailValue}>{option.apr}%</Text>
                  </View>
                  <View style={styles.optionDetail}>
                    <Text style={styles.optionDetailLabel}>Total Interest</Text>
                    <Text style={[styles.optionDetailValue, { color: '#ef4444' }]}>
                      {formatCurrency(option.total_interest)}
                    </Text>
                  </View>
                </View>

                {option.savings_vs_selected !== undefined && option.savings_vs_selected > 0 && (
                  <View style={styles.savingsNote}>
                    <Ionicons name="trending-down" size={16} color="#10b981" />
                    <Text style={styles.savingsText}>
                      Save {formatCurrency(option.savings_vs_selected)} in interest!
                    </Text>
                  </View>
                )}

                {option.note && (
                  <View style={styles.noteContainer}>
                    <Ionicons name="information-circle" size={16} color="#fbbf24" />
                    <Text style={styles.noteText}>{option.note}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Recommendation */}
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationIcon}>
              <Ionicons name="bulb" size={24} color="#fbbf24" />
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>
                Recommended: {result.recommendation.best_value}
              </Text>
              <Text style={styles.recommendationReason}>
                {result.recommendation.reason}
              </Text>
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
  inputHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
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
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
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
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 16,
  },
  summaryBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  summaryOperator: {
    fontSize: 20,
    color: '#64748b',
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  selectedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  optionBody: {
    padding: 16,
  },
  optionMainStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  optionMonthly: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  optionMonthlyLabel: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 4,
  },
  optionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionDetail: {},
  optionDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  optionDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  savingsNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  savingsText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 8,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  noteText: {
    fontSize: 12,
    color: '#fbbf24',
    marginLeft: 8,
    flex: 1,
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  recommendationIcon: {
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  recommendationReason: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
