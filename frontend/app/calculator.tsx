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
import { useLanguage } from '../src/contexts/LanguageContext';

export default function SolarCalculatorScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [monthlyBill, setMonthlyBill] = useState('');
  const [roofSize, setRoofSize] = useState('');
  const [sunHours, setSunHours] = useState('5');
  const [showResults, setShowResults] = useState(false);

  // Solar calculation constants
  const COST_PER_KWH = 0.15; // Average electricity cost
  const PANEL_EFFICIENCY = 0.20; // 20% efficient panels
  const PANEL_SIZE = 1.7; // Square meters per panel
  const PANEL_WATTAGE = 400; // Watts per panel
  const SYSTEM_COST_PER_WATT = 2.5; // Installation cost
  const FEDERAL_TAX_CREDIT = 0.30; // 30% federal tax credit
  const ANNUAL_DEGRADATION = 0.005; // 0.5% per year

  const calculateSavings = () => {
    const bill = parseFloat(monthlyBill) || 0;
    const roof = parseFloat(roofSize) || 0;
    const hours = parseFloat(sunHours) || 5;

    // Calculate current usage
    const monthlyKwh = bill / COST_PER_KWH;
    const annualKwh = monthlyKwh * 12;

    // Calculate system size needed
    const maxPanels = Math.floor(roof / PANEL_SIZE);
    const systemKw = (maxPanels * PANEL_WATTAGE) / 1000;
    const annualProduction = systemKw * hours * 365 * PANEL_EFFICIENCY * 5; // Simplified production

    // Calculate costs and savings
    const systemCost = systemKw * 1000 * SYSTEM_COST_PER_WATT;
    const taxCredit = systemCost * FEDERAL_TAX_CREDIT;
    const netCost = systemCost - taxCredit;

    // 25-year savings calculation
    let totalSavings = 0;
    let yearlyProduction = Math.min(annualKwh, annualProduction);
    for (let year = 1; year <= 25; year++) {
      totalSavings += yearlyProduction * COST_PER_KWH;
      yearlyProduction *= (1 - ANNUAL_DEGRADATION);
    }

    const monthlySavings = (annualKwh * COST_PER_KWH) / 12;
    const paybackYears = netCost / (annualKwh * COST_PER_KWH);

    return {
      currentBill: bill,
      monthlyKwh: Math.round(monthlyKwh),
      maxPanels,
      systemKw: Math.round(systemKw * 10) / 10,
      systemCost: Math.round(systemCost),
      taxCredit: Math.round(taxCredit),
      netCost: Math.round(netCost),
      monthlySavings: Math.round(monthlySavings),
      annualSavings: Math.round(annualKwh * COST_PER_KWH),
      totalSavings: Math.round(totalSavings),
      paybackYears: Math.round(paybackYears * 10) / 10,
      co2Offset: Math.round(annualKwh * 0.4), // kg CO2 per year
    };
  };

  const results = showResults ? calculateSavings() : null;

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
            <Text style={styles.title}>Solar Calculator</Text>
            <Text style={styles.subtitle}>Estimate Your Savings</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Input Section */}
          <View style={styles.inputSection}>
            <View style={styles.inputCard}>
              <View style={styles.inputIcon}>
                <Ionicons name="flash" size={24} color="#f59e0b" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Monthly Electric Bill ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="150"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={monthlyBill}
                  onChangeText={setMonthlyBill}
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputIcon}>
                <Ionicons name="home" size={24} color="#3b82f6" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Roof Size (sq meters)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="50"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={roofSize}
                  onChangeText={setRoofSize}
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputIcon}>
                <Ionicons name="sunny" size={24} color="#fbbf24" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Peak Sun Hours/Day</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={sunHours}
                  onChangeText={setSunHours}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.calculateButton}
              onPress={() => setShowResults(true)}
            >
              <Ionicons name="calculator" size={20} color="#ffffff" />
              <Text style={styles.calculateButtonText}>Calculate Savings</Text>
            </TouchableOpacity>
          </View>

          {/* Results Section */}
          {results && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>Your Solar Estimate</Text>

              {/* Savings Highlight */}
              <View style={styles.savingsCard}>
                <Ionicons name="trending-up" size={40} color="#22c55e" />
                <Text style={styles.savingsLabel}>25-Year Savings</Text>
                <Text style={styles.savingsValue}>
                  ${results.totalSavings.toLocaleString()}
                </Text>
                <Text style={styles.savingsNote}>
                  Payback in {results.paybackYears} years
                </Text>
              </View>

              {/* System Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{results.maxPanels}</Text>
                  <Text style={styles.detailLabel}>Panels</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{results.systemKw} kW</Text>
                  <Text style={styles.detailLabel}>System Size</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>${results.monthlySavings}</Text>
                  <Text style={styles.detailLabel}>Monthly Savings</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>${results.annualSavings}</Text>
                  <Text style={styles.detailLabel}>Annual Savings</Text>
                </View>
              </View>

              {/* Cost Breakdown */}
              <View style={styles.costBreakdown}>
                <Text style={styles.costTitle}>Investment Breakdown</Text>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>System Cost</Text>
                  <Text style={styles.costValue}>${results.systemCost.toLocaleString()}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={[styles.costLabel, { color: '#22c55e' }]}>Federal Tax Credit (30%)</Text>
                  <Text style={[styles.costValue, { color: '#22c55e' }]}>-${results.taxCredit.toLocaleString()}</Text>
                </View>
                <View style={[styles.costRow, styles.costRowTotal]}>
                  <Text style={styles.costLabelBold}>Net Cost</Text>
                  <Text style={styles.costValueBold}>${results.netCost.toLocaleString()}</Text>
                </View>
              </View>

              {/* Environmental Impact */}
              <View style={styles.envCard}>
                <Ionicons name="leaf" size={24} color="#22c55e" />
                <Text style={styles.envText}>
                  You'll offset {results.co2Offset.toLocaleString()} kg of CO2 annually!
                </Text>
              </View>
            </View>
          )}

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
    color: '#94a3b8',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 24,
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
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  calculateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  resultsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  savingsCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
    marginBottom: 16,
  },
  savingsLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  savingsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#22c55e',
    marginTop: 4,
  },
  savingsNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  costBreakdown: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    marginBottom: 16,
  },
  costTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  costRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  costLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  costValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  costLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  costValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
  },
  envCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#052e16',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  envText: {
    flex: 1,
    fontSize: 14,
    color: '#22c55e',
  },
});
