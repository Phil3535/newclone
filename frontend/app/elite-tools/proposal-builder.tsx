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
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://empire-sales-suite.preview.emergentagent.com';

interface Proposal {
  id: string;
  created_at: string;
  valid_until: string;
  customer: {
    name: string;
    address: string;
    email?: string;
    phone?: string;
  };
  system_design: {
    size_kw: number;
    panel_count: number;
    panel_brand: string;
    inverter_type: string;
    warranty_years: number;
    monthly_production_kwh: number;
    annual_production_kwh: number;
  };
  pricing: {
    gross_cost: number;
    net_cost: number;
    price_per_watt: number;
    incentives: {
      total_incentives: number;
      savings_percentage: number;
    };
  };
  savings: {
    annual_savings: number;
    monthly_savings: number;
    twenty_five_year_savings: number;
    payback_years: number;
    roi_percentage: number;
  };
  environmental_impact: {
    co2_offset_lbs_per_year: number;
    trees_equivalent: number;
    cars_off_road_equivalent: number;
  };
  next_steps: Array<{
    step: number;
    title: string;
    description: string;
  }>;
}

export default function ProposalBuilderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [showForm, setShowForm] = useState(true);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [systemSize, setSystemSize] = useState('8');
  const [panelCount, setPanelCount] = useState('20');
  const [systemCost, setSystemCost] = useState('30000');
  const [monthlyProduction, setMonthlyProduction] = useState('1100');
  const [annualSavings, setAnnualSavings] = useState('3200');
  const [includeBattery, setIncludeBattery] = useState(false);
  const [batterySize, setBatterySize] = useState('13.5');
  const [selectedState, setSelectedState] = useState('CA');

  const generateProposal = async () => {
    if (!customerName.trim() || !customerAddress.trim()) {
      Alert.alert('Missing Info', 'Please enter customer name and address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/elite/proposal/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_address: customerAddress,
          customer_email: customerEmail || undefined,
          customer_phone: customerPhone || undefined,
          system_size_kw: parseFloat(systemSize) || 8,
          panel_count: parseInt(panelCount) || 20,
          system_cost: parseFloat(systemCost) || 30000,
          monthly_production_kwh: parseFloat(monthlyProduction) || 1100,
          annual_savings: parseFloat(annualSavings) || 3200,
          state: selectedState,
          include_battery: includeBattery,
          battery_size_kwh: includeBattery ? parseFloat(batterySize) : undefined,
        }),
      });
      
      const data = await response.json();
      setProposal(data);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to generate proposal:', error);
      Alert.alert('Error', 'Failed to generate proposal');
    } finally {
      setLoading(false);
    }
  };

  const shareProposal = async () => {
    if (!proposal) return;
    
    try {
      await Share.share({
        title: `Solar Proposal for ${proposal.customer.name}`,
        message: `
🌞 SOLAR PROPOSAL
━━━━━━━━━━━━━━━━
Customer: ${proposal.customer.name}
Address: ${proposal.customer.address}

SYSTEM DESIGN
• ${proposal.system_design.size_kw}kW System
• ${proposal.system_design.panel_count} Panels
• ${proposal.system_design.panel_brand}
• ${proposal.system_design.warranty_years}-Year Warranty

PRICING
• Gross: $${proposal.pricing.gross_cost.toLocaleString()}
• Incentives: $${proposal.pricing.incentives.total_incentives.toLocaleString()} (${proposal.pricing.incentives.savings_percentage}% off!)
• Net Cost: $${proposal.pricing.net_cost.toLocaleString()}

SAVINGS
• ${proposal.savings.annual_savings.toLocaleString()}/year
• Payback: ${proposal.savings.payback_years} years
• 25-Year ROI: ${proposal.savings.roi_percentage}%

🌳 ENVIRONMENTAL IMPACT
• ${proposal.environmental_impact.co2_offset_lbs_per_year.toLocaleString()} lbs CO2/year offset
• Like planting ${proposal.environmental_impact.trees_equivalent} trees!

Valid until: ${new Date(proposal.valid_until).toLocaleDateString()}

Proposal ID: ${proposal.id}
━━━━━━━━━━━━━━━━
Generated by Solar Empire
        `,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const resetForm = () => {
    setProposal(null);
    setShowForm(true);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          data-testid="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Proposal Builder</Text>
          <Text style={styles.headerSubtitle}>
            Generate professional proposals in seconds
          </Text>
        </View>
      </LinearGradient>

      {showForm ? (
        /* Form */
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Customer Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="John Smith"
              placeholderTextColor="#64748b"
              data-testid="customer-name-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput
              style={styles.input}
              value={customerAddress}
              onChangeText={setCustomerAddress}
              placeholder="123 Solar Lane, Los Angeles, CA 90210"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                placeholder="john@email.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>System Design</Text>

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
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Panel Count</Text>
              <TextInput
                style={styles.input}
                value={panelCount}
                onChangeText={setPanelCount}
                keyboardType="numeric"
                placeholder="20"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

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
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Monthly kWh</Text>
              <TextInput
                style={styles.input}
                value={monthlyProduction}
                onChangeText={setMonthlyProduction}
                keyboardType="numeric"
                placeholder="1100"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Annual Savings ($)</Text>
            <TextInput
              style={styles.input}
              value={annualSavings}
              onChangeText={setAnnualSavings}
              keyboardType="numeric"
              placeholder="3200"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.inputLabel}>Include Battery</Text>
              <Text style={styles.inputHint}>Tesla Powerwall or similar</Text>
            </View>
            <Switch
              value={includeBattery}
              onValueChange={setIncludeBattery}
              trackColor={{ false: '#334155', true: '#8b5cf6' }}
              thumbColor="#fff"
            />
          </View>

          {includeBattery && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Battery Size (kWh)</Text>
              <TextInput
                style={styles.input}
                value={batterySize}
                onChangeText={setBatterySize}
                keyboardType="numeric"
                placeholder="13.5"
                placeholderTextColor="#64748b"
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateProposal}
            disabled={loading}
            data-testid="generate-proposal-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Proposal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Proposal Preview */
        proposal && (
          <View style={styles.proposalContainer}>
            {/* Actions */}
            <View style={styles.actionBar}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={resetForm}
              >
                <Ionicons name="create" size={20} color="#8b5cf6" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonPrimary]} 
                onPress={shareProposal}
                data-testid="share-proposal-button"
              >
                <Ionicons name="share" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Customer Section */}
            <View style={styles.proposalCard}>
              <View style={styles.proposalCardHeader}>
                <Ionicons name="person" size={20} color="#8b5cf6" />
                <Text style={styles.proposalCardTitle}>Customer</Text>
              </View>
              <Text style={styles.customerName}>{proposal.customer.name}</Text>
              <Text style={styles.customerAddress}>{proposal.customer.address}</Text>
              {proposal.customer.email && (
                <Text style={styles.customerContact}>{proposal.customer.email}</Text>
              )}
              {proposal.customer.phone && (
                <Text style={styles.customerContact}>{proposal.customer.phone}</Text>
              )}
            </View>

            {/* System Design */}
            <View style={styles.proposalCard}>
              <View style={styles.proposalCardHeader}>
                <Ionicons name="sunny" size={20} color="#f97316" />
                <Text style={styles.proposalCardTitle}>System Design</Text>
              </View>
              <View style={styles.specGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specValue}>{proposal.system_design.size_kw}kW</Text>
                  <Text style={styles.specLabel}>System Size</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specValue}>{proposal.system_design.panel_count}</Text>
                  <Text style={styles.specLabel}>Panels</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specValue}>{proposal.system_design.warranty_years}yr</Text>
                  <Text style={styles.specLabel}>Warranty</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specValue}>{proposal.system_design.annual_production_kwh.toLocaleString()}</Text>
                  <Text style={styles.specLabel}>kWh/year</Text>
                </View>
              </View>
            </View>

            {/* Pricing */}
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={[styles.proposalCard, { borderWidth: 0 }]}
            >
              <View style={styles.proposalCardHeader}>
                <Ionicons name="pricetag" size={20} color="#fff" />
                <Text style={[styles.proposalCardTitle, { color: '#fff' }]}>Pricing</Text>
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Gross Cost</Text>
                <Text style={styles.pricingValue}>{formatCurrency(proposal.pricing.gross_cost)}</Text>
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>
                  Incentives ({proposal.pricing.incentives.savings_percentage}% off)
                </Text>
                <Text style={[styles.pricingValue, { color: '#fbbf24' }]}>
                  -{formatCurrency(proposal.pricing.incentives.total_incentives)}
                </Text>
              </View>
              <View style={styles.pricingDivider} />
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabelBold}>Net Cost</Text>
                <Text style={styles.pricingValueBold}>{formatCurrency(proposal.pricing.net_cost)}</Text>
              </View>
              <Text style={styles.pricePerWatt}>
                ${proposal.pricing.price_per_watt}/watt
              </Text>
            </LinearGradient>

            {/* Savings */}
            <View style={styles.proposalCard}>
              <View style={styles.proposalCardHeader}>
                <Ionicons name="trending-up" size={20} color="#10b981" />
                <Text style={styles.proposalCardTitle}>Savings & ROI</Text>
              </View>
              <View style={styles.savingsGrid}>
                <View style={styles.savingsItem}>
                  <Text style={styles.savingsValue}>
                    {formatCurrency(proposal.savings.annual_savings)}
                  </Text>
                  <Text style={styles.savingsLabel}>Annual Savings</Text>
                </View>
                <View style={styles.savingsItem}>
                  <Text style={styles.savingsValue}>
                    {proposal.savings.payback_years}
                  </Text>
                  <Text style={styles.savingsLabel}>Years Payback</Text>
                </View>
                <View style={styles.savingsItem}>
                  <Text style={styles.savingsValue}>
                    {formatCurrency(proposal.savings.twenty_five_year_savings)}
                  </Text>
                  <Text style={styles.savingsLabel}>25-Year Value</Text>
                </View>
                <View style={styles.savingsItem}>
                  <Text style={[styles.savingsValue, { color: '#10b981' }]}>
                    {proposal.savings.roi_percentage}%
                  </Text>
                  <Text style={styles.savingsLabel}>ROI</Text>
                </View>
              </View>
            </View>

            {/* Environmental Impact */}
            <View style={styles.proposalCard}>
              <View style={styles.proposalCardHeader}>
                <Ionicons name="leaf" size={20} color="#22c55e" />
                <Text style={styles.proposalCardTitle}>Environmental Impact</Text>
              </View>
              <View style={styles.impactRow}>
                <Ionicons name="cloud" size={24} color="#64748b" />
                <View style={styles.impactContent}>
                  <Text style={styles.impactValue}>
                    {proposal.environmental_impact.co2_offset_lbs_per_year.toLocaleString()} lbs
                  </Text>
                  <Text style={styles.impactLabel}>CO2 offset per year</Text>
                </View>
              </View>
              <View style={styles.impactRow}>
                <Text style={styles.impactEmoji}>🌳</Text>
                <View style={styles.impactContent}>
                  <Text style={styles.impactValue}>
                    {proposal.environmental_impact.trees_equivalent}
                  </Text>
                  <Text style={styles.impactLabel}>Trees planted equivalent</Text>
                </View>
              </View>
              <View style={styles.impactRow}>
                <Ionicons name="car" size={24} color="#64748b" />
                <View style={styles.impactContent}>
                  <Text style={styles.impactValue}>
                    {proposal.environmental_impact.cars_off_road_equivalent}
                  </Text>
                  <Text style={styles.impactLabel}>Cars off road equivalent</Text>
                </View>
              </View>
            </View>

            {/* Next Steps */}
            <View style={styles.proposalCard}>
              <View style={styles.proposalCardHeader}>
                <Ionicons name="list" size={20} color="#3b82f6" />
                <Text style={styles.proposalCardTitle}>Next Steps</Text>
              </View>
              {proposal.next_steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.step}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Valid Until */}
            <View style={styles.validUntil}>
              <Ionicons name="time" size={16} color="#64748b" />
              <Text style={styles.validUntilText}>
                Valid until {new Date(proposal.valid_until).toLocaleDateString()}
              </Text>
            </View>

            {/* Proposal ID */}
            <Text style={styles.proposalId}>
              Proposal #{proposal.id.substring(0, 8)}
            </Text>
          </View>
        )
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 18,
    marginTop: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  proposalContainer: {
    padding: 20,
  },
  actionBar: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonPrimary: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
    marginRight: 0,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
    marginLeft: 8,
  },
  proposalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  proposalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  proposalCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  customerContact: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specItem: {
    width: '50%',
    paddingVertical: 8,
  },
  specValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  specLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pricingLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  pricingValueBold: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  pricingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 12,
  },
  pricePerWatt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
    marginTop: 8,
  },
  savingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  savingsItem: {
    width: '50%',
    paddingVertical: 8,
  },
  savingsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  savingsLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  impactEmoji: {
    fontSize: 24,
  },
  impactContent: {
    marginLeft: 16,
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  impactLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  stepDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  validUntil: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  validUntilText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  proposalId: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
});
