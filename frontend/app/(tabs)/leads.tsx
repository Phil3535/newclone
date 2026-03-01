import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeadCard from '../../src/components/LeadCard';
import { leadsApi } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { sendHotLeadAlert } from '../../src/services/notifications';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  zip_code: string;
  homeowner: boolean;
  roof_type: string;
  bill_amount: number;
  timeline: string;
  source: string;
  ai_score: number;
  probability_to_close: number;
  ai_insights?: string;
  status: string;
  assigned_rep_id?: string;
}

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Appointment', value: 'appointment_set' },
  { label: 'Won', value: 'closed_won' },
  { label: 'Lost', value: 'closed_lost' },
];

const ROOF_TYPES = ['asphalt', 'tile', 'metal', 'flat'];
const TIMELINES = ['immediate', '1-3 months', '3-6 months', '6+ months'];
const SOURCES = ['web_form', 'ad_campaign', 'organic', 'referral'];

export default function LeadsScreen() {
  const { currentRepId } = useStore();
  const { t } = useLanguage();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  
  // New lead form state
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    zip_code: '',
    homeowner: true,
    roof_type: 'asphalt',
    bill_amount: '150',
    timeline: '3-6 months',
    source: 'web_form',
    notes: '',
  });

  const loadLeads = useCallback(async () => {
    try {
      const params: any = {};
      if (currentRepId) params.rep_id = currentRepId;
      if (statusFilter) params.status = statusFilter;
      
      const response = await leadsApi.getAll(params);
      setLeads(response.data);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  }, [currentRepId, statusFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    // Filter leads by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.address.toLowerCase().includes(query) ||
          lead.zip_code.includes(query)
      );
      setFilteredLeads(filtered);
    } else {
      setFilteredLeads(leads);
    }
  }, [leads, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeads();
    setRefreshing(false);
  }, [loadLeads]);

  const handleCreateLead = async () => {
    if (!newLead.name || !newLead.email || !newLead.phone || !newLead.address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const response = await leadsApi.create({
        ...newLead,
        bill_amount: parseFloat(newLead.bill_amount),
      });
      
      // Send hot lead alert if score is high
      if (response.data && response.data.ai_score >= 70) {
        await sendHotLeadAlert(
          newLead.name,
          Math.round(response.data.ai_score),
          newLead.zip_code || 'Unknown Territory'
        );
      }
      
      setShowNewLeadModal(false);
      setNewLead({
        name: '',
        email: '',
        phone: '',
        address: '',
        zip_code: '',
        homeowner: true,
        roof_type: 'asphalt',
        bill_amount: '150',
        timeline: '3-6 months',
        source: 'web_form',
        notes: '',
      });
      await loadLeads();
      Alert.alert('Success', 'Lead created and AI-scored successfully!');
    } catch (error) {
      console.error('Error creating lead:', error);
      Alert.alert('Error', 'Failed to create lead');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      await leadsApi.update(leadId, { status: newStatus });
      await loadLeads();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', 'Failed to update lead status');
    }
  };

  const handleRescore = async (leadId: string) => {
    try {
      const response = await leadsApi.rescore(leadId);
      setSelectedLead(response.data);
      await loadLeads();
      Alert.alert('Success', 'Lead re-scored with AI!');
    } catch (error) {
      console.error('Error rescoring lead:', error);
      Alert.alert('Error', 'Failed to rescore lead');
    }
  };

  const renderLeadItem = ({ item }: { item: Lead }) => (
    <LeadCard
      lead={item}
      onPress={() => {
        setSelectedLead(item);
        setShowDetailModal(true);
      }}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} data-testid="leads-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} data-testid="leads-title">{t('leads.title')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewLeadModal(true)}
          data-testid="add-lead-button"
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('leads.search_placeholder')}
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
          data-testid="lead-search-input"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} data-testid="clear-search-button">
            <Ionicons name="close-circle" size={20} color="#64748b" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
        data-testid="status-filter-scroll"
      >
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              statusFilter === filter.value && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === filter.value && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Leads List */}
      <FlatList
        data={filteredLeads}
        renderItem={renderLeadItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#1e3a5f" />
            <Text style={styles.emptyText}>{t('leads.no_leads')}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowNewLeadModal(true)}
            >
              <Text style={styles.emptyButtonText}>{t('leads.add_new_lead')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* New Lead Modal */}
      <Modal visible={showNewLeadModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('leads.new_lead')}</Text>
              <TouchableOpacity onPress={() => setShowNewLeadModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('leads.name')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Smith"
                placeholderTextColor="#64748b"
                value={newLead.name}
                onChangeText={(text) => setNewLead({ ...newLead, name: text })}
              />

              <Text style={styles.inputLabel}>{t('leads.email')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="john@email.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newLead.email}
                onChangeText={(text) => setNewLead({ ...newLead, email: text })}
              />

              <Text style={styles.inputLabel}>{t('leads.phone')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="555-123-4567"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={newLead.phone}
                onChangeText={(text) => setNewLead({ ...newLead, phone: text })}
              />

              <Text style={styles.inputLabel}>{t('leads.address')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main Street"
                placeholderTextColor="#64748b"
                value={newLead.address}
                onChangeText={(text) => setNewLead({ ...newLead, address: text })}
              />

              <Text style={styles.inputLabel}>{t('leads.zip_code')}</Text>
              <TextInput
                style={styles.input}
                placeholder="90210"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                value={newLead.zip_code}
                onChangeText={(text) => setNewLead({ ...newLead, zip_code: text })}
              />

              <Text style={styles.inputLabel}>{t('leads.bill_amount')}</Text>
              <TextInput
                style={styles.input}
                placeholder="150"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={newLead.bill_amount}
                onChangeText={(text) => setNewLead({ ...newLead, bill_amount: text })}
              />

              <Text style={styles.inputLabel}>{t('leads.homeowner')}</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, newLead.homeowner && styles.toggleBtnActive]}
                  onPress={() => setNewLead({ ...newLead, homeowner: true })}
                >
                  <Text style={[styles.toggleText, newLead.homeowner && styles.toggleTextActive]}>
                    {t('common.yes')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, !newLead.homeowner && styles.toggleBtnActive]}
                  onPress={() => setNewLead({ ...newLead, homeowner: false })}
                >
                  <Text style={[styles.toggleText, !newLead.homeowner && styles.toggleTextActive]}>
                    {t('common.no')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>{t('leads.roof_type')}</Text>
              <View style={styles.optionsRow}>
                {ROOF_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionBtn, newLead.roof_type === type && styles.optionBtnActive]}
                    onPress={() => setNewLead({ ...newLead, roof_type: type })}
                  >
                    <Text style={[styles.optionText, newLead.roof_type === type && styles.optionTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>{t('leads.timeline')}</Text>
              <View style={styles.optionsRow}>
                {TIMELINES.map((timeline) => (
                  <TouchableOpacity
                    key={timeline}
                    style={[styles.optionBtn, newLead.timeline === timeline && styles.optionBtnActive]}
                    onPress={() => setNewLead({ ...newLead, timeline })}
                  >
                    <Text style={[styles.optionText, newLead.timeline === timeline && styles.optionTextActive]}>
                      {timeline}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>{t('leads.source')}</Text>
              <View style={styles.optionsRow}>
                {SOURCES.map((source) => (
                  <TouchableOpacity
                    key={source}
                    style={[styles.optionBtn, newLead.source === source && styles.optionBtnActive]}
                    onPress={() => setNewLead({ ...newLead, source })}
                  >
                    <Text style={[styles.optionText, newLead.source === source && styles.optionTextActive]}>
                      {source.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>{t('leads.notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('leads.notes')}
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={3}
                value={newLead.notes}
                onChangeText={(text) => setNewLead({ ...newLead, notes: text })}
              />

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateLead}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="flash" size={20} color="#ffffff" />
                    <Text style={styles.submitButtonText}>{t('leads.create_score')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lead Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('leads.lead_details')}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedLead && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailScoreSection}>
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scoreValue}>{Math.round(selectedLead.ai_score)}</Text>
                    <Text style={styles.scoreLabel}>{t('leads.ai_score')}</Text>
                  </View>
                  <View style={styles.probabilityContainer}>
                    <Text style={styles.probabilityValue}>
                      {Math.round(selectedLead.probability_to_close * 100)}%
                    </Text>
                    <Text style={styles.probabilityLabel}>{t('leads.probability')}</Text>
                  </View>
                </View>

                {selectedLead.ai_insights && (
                  <View style={styles.insightsCard}>
                    <Ionicons name="bulb" size={16} color="#f59e0b" />
                    <Text style={styles.insightsText}>{selectedLead.ai_insights}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={18} color="#64748b" />
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{selectedLead.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail" size={18} color="#64748b" />
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedLead.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={18} color="#64748b" />
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedLead.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={18} color="#64748b" />
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>{selectedLead.address}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="home" size={18} color="#64748b" />
                    <Text style={styles.detailLabel}>Homeowner</Text>
                    <Text style={styles.detailValue}>{selectedLead.homeowner ? 'Yes' : 'No'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="flash" size={18} color="#64748b" />
                    <Text style={styles.detailLabel}>Bill</Text>
                    <Text style={styles.detailValue}>${selectedLead.bill_amount}/mo</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={18} color="#64748b" />
                    <Text style={styles.detailLabel}>Timeline</Text>
                    <Text style={styles.detailValue}>{selectedLead.timeline}</Text>
                  </View>
                </View>

                <Text style={styles.statusSectionTitle}>{t('leads.update_status')}</Text>
                <View style={styles.statusGrid}>
                  {STATUS_FILTERS.slice(1).map((status) => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.statusBtn,
                        selectedLead.status === status.value && styles.statusBtnActive,
                      ]}
                      onPress={() => handleUpdateStatus(selectedLead.id, status.value)}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          selectedLead.status === status.value && styles.statusBtnTextActive,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.rescoreButton}
                  onPress={() => handleRescore(selectedLead.id)}
                >
                  <Ionicons name="refresh" size={20} color="#f59e0b" />
                  <Text style={styles.rescoreButtonText}>{t('leads.rescore')}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 12,
  },
  filterContainer: {
    marginTop: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0f1a2e',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 12,
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  toggleBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  optionBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  optionText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 20,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f59e0b20',
    borderWidth: 3,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    color: '#f59e0b',
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: '#f59e0b',
    fontSize: 11,
    marginTop: 2,
  },
  probabilityContainer: {
    alignItems: 'center',
  },
  probabilityValue: {
    color: '#22c55e',
    fontSize: 28,
    fontWeight: 'bold',
  },
  probabilityLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  insightsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f59e0b10',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  insightsText: {
    color: '#f59e0b',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  detailSection: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 13,
    marginLeft: 10,
    width: 80,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  statusSectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0f1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statusBtnActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  statusBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  statusBtnTextActive: {
    color: '#ffffff',
  },
  rescoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
  },
  rescoreButtonText: {
    color: '#f59e0b',
    fontSize: 15,
    fontWeight: '600',
  },
});
