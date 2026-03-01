import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface FinancingOption {
  term: number;
  apr: number;
  monthlyPayment: number;
  totalCost: number;
}

export default function FinancingCalculatorScreen() {
  const router = useRouter();
  const [systemCost, setSystemCost] = useState('25000');
  const [downPayment, setDownPayment] = useState('0');
  const [selectedTerm, setSelectedTerm] = useState<number>(20);

  const calculateFinancing = (): FinancingOption[] => {
    const principal = (parseFloat(systemCost) || 25000) - (parseFloat(downPayment) || 0);
    const taxCredit = (parseFloat(systemCost) || 25000) * 0.30;
    
    const terms = [
      { term: 10, apr: 4.99 },
      { term: 15, apr: 5.49 },
      { term: 20, apr: 5.99 },
      { term: 25, apr: 6.49 },
    ];

    return terms.map(({ term, apr }) => {
      const monthlyRate = apr / 100 / 12;
      const numPayments = term * 12;
      const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      const totalCost = monthlyPayment * numPayments;

      return {
        term,
        apr,
        monthlyPayment: Math.round(monthlyPayment),
        totalCost: Math.round(totalCost),
      };
    });
  };

  const options = calculateFinancing();
  const selectedOption = options.find(o => o.term === selectedTerm) || options[2];
  const taxCredit = Math.round((parseFloat(systemCost) || 25000) * 0.30);
  const effectiveCost = (parseFloat(systemCost) || 25000) - taxCredit;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Financing Calculator</Text>
            <Text style={styles.subtitle}>$0 Down Options Available</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Input Section */}
          <View style={styles.inputSection}>
            <View style={styles.inputCard}>
              <View style={styles.inputIcon}>
                <Ionicons name="sunny" size={24} color="#f59e0b" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>System Cost ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="25000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={systemCost}
                  onChangeText={setSystemCost}
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputIcon}>
                <Ionicons name="wallet" size={24} color="#22c55e" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Down Payment ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={downPayment}
                  onChangeText={setDownPayment}
                />
              </View>
            </View>
          </View>

          {/* Tax Credit Banner */}
          <View style={styles.taxCreditBanner}>
            <Ionicons name="gift" size={24} color="#22c55e" />
            <View style={styles.taxCreditContent}>
              <Text style={styles.taxCreditTitle}>Federal Tax Credit</Text>
              <Text style={styles.taxCreditValue}>-${taxCredit.toLocaleString()}</Text>
            </View>
            <Text style={styles.taxCreditPercent}>30%</Text>
          </View>

          {/* Monthly Payment Highlight */}
          <View style={styles.paymentHighlight}>
            <Text style={styles.paymentLabel}>Your Monthly Payment</Text>
            <Text style={styles.paymentValue}>${selectedOption.monthlyPayment}</Text>
            <Text style={styles.paymentSubtext}>{selectedOption.term} years @ {selectedOption.apr}% APR</Text>
          </View>

          {/* Loan Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Loan Term</Text>
            <View style={styles.termsGrid}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.term}
                  style={[
                    styles.termCard,
                    selectedTerm === option.term && styles.termCardSelected,
                  ]}
                  onPress={() => setSelectedTerm(option.term)}
                >
                  <Text style={[
                    styles.termYears,
                    selectedTerm === option.term && styles.termYearsSelected,
                  ]}>
                    {option.term} Years
                  </Text>
                  <Text style={styles.termApr}>{option.apr}% APR</Text>
                  <Text style={[
                    styles.termMonthly,
                    selectedTerm === option.term && styles.termMonthlySelected,
                  ]}>
                    ${option.monthlyPayment}/mo
                  </Text>
                  {selectedTerm === option.term && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cost Breakdown */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Financing Summary</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>System Cost</Text>
              <Text style={styles.breakdownValue}>${(parseFloat(systemCost) || 25000).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Down Payment</Text>
              <Text style={styles.breakdownValue}>-${(parseFloat(downPayment) || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: '#22c55e' }]}>Tax Credit (30%)</Text>
              <Text style={[styles.breakdownValue, { color: '#22c55e' }]}>-${taxCredit.toLocaleString()}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
              <Text style={styles.breakdownLabelBold}>Effective Cost</Text>
              <Text style={styles.breakdownValueBold}>${effectiveCost.toLocaleString()}</Text>
            </View>
          </View>

          {/* Pre-qualification CTA */}
          <TouchableOpacity style={styles.prequalButton}>
            <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
            <View style={styles.prequalContent}>
              <Text style={styles.prequalTitle}>Check Pre-Qualification</Text>
              <Text style={styles.prequalSubtext}>No impact on credit score</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ffffff" />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    color: '#22c55e',
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  inputIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  input: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    padding: 0,
  },
  taxCreditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#052e16',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  taxCreditContent: {
    flex: 1,
    marginLeft: 12,
  },
  taxCreditTitle: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  taxCreditValue: {
    fontSize: 18,
    color: '#22c55e',
    fontWeight: '700',
  },
  taxCreditPercent: {
    fontSize: 24,
    fontWeight: '800',
    color: '#22c55e',
  },
  paymentHighlight: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  paymentLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  paymentValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  paymentSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  termsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  termCard: {
    width: '48%',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1e3a5f',
    position: 'relative',
  },
  termCardSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#1e3a5f',
  },
  termYears: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  termYearsSelected: {
    color: '#f59e0b',
  },
  termApr: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  termMonthly: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 8,
  },
  termMonthlySelected: {
    color: '#ffffff',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingTop: 12,
    marginTop: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  breakdownLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  breakdownValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
  },
  prequalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    padding: 18,
  },
  prequalContent: {
    flex: 1,
    marginLeft: 12,
  },
  prequalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  prequalSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
