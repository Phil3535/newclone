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
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Proposal {
  id: string;
  customer_name: string;
  address: string;
  monthly_bill: number;
  system_size_kw: number;
  panel_count: number;
  net_cost: number;
  monthly_payment: number;
  year_1_savings: number;
  year_25_savings: number;
  payback_years: number;
  roi_percent: number;
  include_battery: boolean;
  proposal_html: string;
  created_at: string;
}

export default function ProposalsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [monthlyBill, setMonthlyBill] = useState('');
  const [roofType, setRoofType] = useState('asphalt');
  const [includeBattery, setIncludeBattery] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchProposals();
    }
  }, [activeTab]);

  const fetchProposals = async () => {
    try {
      const response = await fetch(`${API_URL}/api/proposals`);
      const data = await response.json();
      setProposals(data);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }
  };

  const generateProposal = async () => {
    if (!customerName || !address || !monthlyBill) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/proposals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          address: address,
          monthly_bill: parseFloat(monthlyBill),
          roof_type: roofType,
          include_battery: includeBattery,
        }),
      });
      const data = await response.json();
      setSelectedProposal(data);
      setShowPreview(true);
      // Clear form
      setCustomerName('');
      setAddress('');
      setMonthlyBill('');
      setIncludeBattery(false);
    } catch (error) {
      console.error('Error generating proposal:', error);
      alert('Failed to generate proposal');
    } finally {
      setLoading(false);
    }
  };

  const viewProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowPreview(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderGenerateForm = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Customer Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter customer name"
            placeholderTextColor="#64748b"
            value={customerName}
            onChangeText={setCustomerName}
            data-testid="customer-name-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter property address"
            placeholderTextColor="#64748b"
            value={address}
            onChangeText={setAddress}
            data-testid="address-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Monthly Electric Bill *</Text>
          <View style={styles.currencyInput}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.currencyField}
              placeholder="0"
              placeholderTextColor="#64748b"
              value={monthlyBill}
              onChangeText={setMonthlyBill}
              keyboardType="numeric"
              data-testid="monthly-bill-input"
            />
          </View>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Property Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Roof Type</Text>
          <View style={styles.roofTypeContainer}>
            {['asphalt', 'tile', 'metal', 'flat'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.roofTypeOption, roofType === type && styles.roofTypeSelected]}
                onPress={() => setRoofType(type)}
              >
                <Text style={[styles.roofTypeText, roofType === type && styles.roofTypeTextSelected]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Include Battery Storage</Text>
            <Text style={styles.switchDescription}>Add backup power capability (+$12,000)</Text>
          </View>
          <Switch
            value={includeBattery}
            onValueChange={setIncludeBattery}
            trackColor={{ false: '#1e3a5f', true: '#22c55e' }}
            thumbColor={includeBattery ? '#ffffff' : '#94a3b8'}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.generateButton, loading && styles.generateButtonDisabled]}
        onPress={generateProposal}
        disabled={loading}
        data-testid="generate-proposal-btn"
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.generateButtonText}>Generating...</Text>
          </>
        ) : (
          <>
            <Ionicons name="document-text" size={22} color="#ffffff" />
            <Text style={styles.generateButtonText}>Generate AI Proposal</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          Our AI analyzes local utility rates, incentives, and solar production data to create accurate proposals.
        </Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
      {proposals.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color="#64748b" />
          <Text style={styles.emptyStateText}>No proposals yet</Text>
          <Text style={styles.emptyStateSubtext}>Generate your first proposal to see it here</Text>
        </View>
      ) : (
        proposals.map((proposal) => (
          <TouchableOpacity
            key={proposal.id}
            style={styles.proposalCard}
            onPress={() => viewProposal(proposal)}
            data-testid={`proposal-card-${proposal.id}`}
          >
            <View style={styles.proposalHeader}>
              <View>
                <Text style={styles.proposalCustomer}>{proposal.customer_name}</Text>
                <Text style={styles.proposalAddress} numberOfLines={1}>{proposal.address}</Text>
              </View>
              <View style={styles.proposalBadge}>
                <Text style={styles.proposalBadgeText}>{proposal.system_size_kw} kW</Text>
              </View>
            </View>

            <View style={styles.proposalStats}>
              <View style={styles.proposalStat}>
                <Text style={styles.proposalStatValue}>{formatCurrency(proposal.net_cost)}</Text>
                <Text style={styles.proposalStatLabel}>Net Cost</Text>
              </View>
              <View style={styles.proposalStat}>
                <Text style={styles.proposalStatValue}>{formatCurrency(proposal.year_1_savings)}</Text>
                <Text style={styles.proposalStatLabel}>Year 1 Savings</Text>
              </View>
              <View style={styles.proposalStat}>
                <Text style={[styles.proposalStatValue, { color: '#22c55e' }]}>{proposal.payback_years}y</Text>
                <Text style={styles.proposalStatLabel}>Payback</Text>
              </View>
            </View>

            <View style={styles.proposalFooter}>
              <Text style={styles.proposalDate}>
                {new Date(proposal.created_at).toLocaleDateString()}
              </Text>
              <View style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View</Text>
                <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>AI Proposal Generator</Text>
          <Text style={styles.subtitle}>Create professional solar proposals</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'generate' && styles.activeTab]}
          onPress={() => setActiveTab('generate')}
        >
          <Ionicons name="create" size={18} color={activeTab === 'generate' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'generate' && styles.activeTabText]}>Generate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="time" size={18} color={activeTab === 'history' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History ({proposals.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'generate' ? renderGenerateForm() : renderHistory()}

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Proposal Preview</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPreview(false)}
                data-testid="close-preview-btn"
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            {selectedProposal && (
              <WebView
                source={{ html: selectedProposal.proposal_html }}
                style={styles.webView}
                originWhitelist={['*']}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.shareButton}>
                <Ionicons name="share-outline" size={20} color="#ffffff" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.downloadButton}>
                <Ionicons name="download-outline" size={20} color="#0a1929" />
                <Text style={styles.downloadButtonText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0f1a2e',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#f59e0b20',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#f59e0b',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 15,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    color: '#64748b',
    fontSize: 18,
    marginRight: 8,
  },
  currencyField: {
    flex: 1,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 15,
  },
  roofTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roofTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
  },
  roofTypeSelected: {
    backgroundColor: '#f59e0b',
  },
  roofTypeText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  roofTypeTextSelected: {
    color: '#0a1929',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  switchLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  switchDescription: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  generateButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f620',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  historyContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  proposalCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  proposalCustomer: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  proposalAddress: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
    maxWidth: SCREEN_WIDTH - 140,
  },
  proposalBadge: {
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proposalBadgeText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  proposalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  proposalStat: {
    alignItems: 'center',
  },
  proposalStatValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  proposalStatLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  proposalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  proposalDate: {
    color: '#64748b',
    fontSize: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    flex: 1,
    marginTop: 50,
    backgroundColor: '#0a1929',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a5f',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  downloadButtonText: {
    color: '#0a1929',
    fontSize: 15,
    fontWeight: '600',
  },
});
