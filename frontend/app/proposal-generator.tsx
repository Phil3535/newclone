import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { generateAndShareProposal, ProposalData } from '../src/services/proposalService';
import { leadsApi } from '../src/services/api';
import { useStore } from '../src/store/useStore';

export default function ProposalGeneratorScreen() {
  const router = useRouter();
  const { currentRep } = useStore();
  const [generating, setGenerating] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [formData, setFormData] = useState({
    systemSize: '8.5',
    panelCount: '20',
    systemCost: '25000',
    monthlyBill: '200',
  });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const data = await leadsApi.getAll();
      setLeads(data.filter((l: any) => l.status === 'qualified' || l.status === 'appointment'));
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const calculateProposalData = (): ProposalData => {
    const systemCost = parseFloat(formData.systemCost) || 25000;
    const taxCredit = Math.round(systemCost * 0.30);
    const monthlyBill = parseFloat(formData.monthlyBill) || 200;
    const annualSavings = monthlyBill * 12;
    const netCost = systemCost - taxCredit;
    const paybackYears = Math.round((netCost / annualSavings) * 10) / 10;
    const totalSavings25Years = annualSavings * 25;
    const co2Offset = Math.round((monthlyBill / 0.15) * 12 * 0.4);

    return {
      customerName: selectedLead?.name || 'Customer',
      customerEmail: selectedLead?.email || 'customer@email.com',
      customerAddress: selectedLead?.address || '123 Main St',
      systemSize: parseFloat(formData.systemSize) || 8.5,
      panelCount: parseInt(formData.panelCount) || 20,
      systemCost,
      taxCredit,
      netCost,
      monthlySavings: Math.round(monthlyBill),
      annualSavings,
      paybackYears,
      totalSavings25Years,
      co2Offset,
      repName: currentRep?.name || 'Sales Rep',
      repPhone: currentRep?.phone || '555-0100',
      repEmail: currentRep?.email || 'rep@solarempire.com',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
  };

  const handleGenerate = async () => {
    if (!selectedLead) {
      Alert.alert('Select Lead', 'Please select a lead to generate proposal for');
      return;
    }

    setGenerating(true);
    try {
      const proposalData = calculateProposalData();
      const success = await generateAndShareProposal(proposalData);
      
      if (success) {
        Alert.alert(
          '🎉 Proposal Generated!',
          'Your professional proposal has been created and is ready to share.',
          [{ text: 'Awesome!' }]
        );
      } else {
        Alert.alert('Error', 'Failed to generate proposal. Please try again.');
      }
    } catch (error) {
      console.error('Proposal generation error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

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
            <Text style={styles.title}>Proposal Generator</Text>
            <Text style={styles.subtitle}>AI-Powered Sales Proposals</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Lead Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Customer</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {leads.map((lead) => (
                <TouchableOpacity
                  key={lead.id}
                  style={[
                    styles.leadCard,
                    selectedLead?.id === lead.id && styles.leadCardSelected,
                  ]}
                  onPress={() => setSelectedLead(lead)}
                >
                  <Text style={styles.leadName}>{lead.name}</Text>
                  <Text style={styles.leadAddress}>{lead.address}</Text>
                  {selectedLead?.id === lead.id && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              {leads.length === 0 && (
                <View style={styles.noLeadsCard}>
                  <Text style={styles.noLeadsText}>No qualified leads</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* System Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Configuration</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>System Size (kW)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8.5"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={formData.systemSize}
                  onChangeText={(text) => setFormData({ ...formData, systemSize: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Panel Count</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  value={formData.panelCount}
                  onChangeText={(text) => setFormData({ ...formData, panelCount: text })}
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>System Cost ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="25000"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  value={formData.systemCost}
                  onChangeText={(text) => setFormData({ ...formData, systemCost: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Monthly Bill ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="200"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  value={formData.monthlyBill}
                  onChangeText={(text) => setFormData({ ...formData, monthlyBill: text })}
                />
              </View>
            </View>
          </View>

          {/* Preview */}
          {selectedLead && (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Proposal Preview</Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Customer</Text>
                <Text style={styles.previewValue}>{selectedLead.name}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Net Investment</Text>
                <Text style={styles.previewValue}>
                  ${Math.round((parseFloat(formData.systemCost) || 25000) * 0.7).toLocaleString()}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>25-Year Savings</Text>
                <Text style={[styles.previewValue, { color: '#22c55e' }]}>
                  ${((parseFloat(formData.monthlyBill) || 200) * 12 * 25).toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.generateButton, generating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="document-text" size={24} color="#ffffff" />
                <Text style={styles.generateButtonText}>Generate PDF Proposal</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Proposal will be generated as a professional PDF that can be shared via email, text, or AirDrop.
          </Text>

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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  leadCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 150,
    borderWidth: 2,
    borderColor: '#1e3a5f',
  },
  leadCardSelected: {
    borderColor: '#f59e0b',
  },
  leadName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  leadAddress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
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
  noLeadsCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    minWidth: 150,
  },
  noLeadsText: {
    color: '#64748b',
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f1a2e',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  previewCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
  },
  generateButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
