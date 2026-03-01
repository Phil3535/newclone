import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ImportResult {
  success: boolean;
  imported_count: number;
  error_count: number;
  errors: { row: number; error: string }[];
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  zip_code: string;
  ai_score: number;
  status: string;
}

export default function LeadImportExportScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showResult, setShowResult] = useState(false);

  // Export filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMinScore, setFilterMinScore] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await fetch(`${API_URL}/api/leads?limit=1000`);
      const data = await response.json();
      setLeads(data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const downloadTemplate = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, open the template URL directly
        window.open(`${API_URL}/api/leads/export/template`, '_blank');
      } else {
        // For mobile, download and share
        const fileUri = FileSystem.documentDirectory + 'lead_import_template.csv';
        const result = await FileSystem.downloadAsync(
          `${API_URL}/api/leads/export/template`,
          fileUri
        );
        if (result.status === 200) {
          await Sharing.shareAsync(result.uri);
        }
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template');
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      await uploadFile(file);
    } catch (error) {
      console.error('Error picking file:', error);
      alert('Failed to select file');
    }
  };

  const uploadFile = async (file: DocumentPicker.DocumentPickerAsset) => {
    setLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // For web, fetch the file and create a blob
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('file', blob, file.name);
      } else {
        // For mobile
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: 'text/csv',
        } as any);
      }

      const uploadResponse = await fetch(`${API_URL}/api/leads/import`, {
        method: 'POST',
        body: formData,
      });

      const data = await uploadResponse.json();
      setImportResult(data);
      setShowResult(true);
      
      // Refresh leads list
      fetchLeads();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to import leads');
    } finally {
      setLoading(false);
    }
  };

  const exportLeads = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/leads/export?`;
      if (filterStatus !== 'all') {
        url += `status=${filterStatus}&`;
      }
      if (filterMinScore) {
        url += `min_score=${filterMinScore}&`;
      }

      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const timestamp = new Date().toISOString().split('T')[0];
        const fileUri = FileSystem.documentDirectory + `leads_export_${timestamp}.csv`;
        const result = await FileSystem.downloadAsync(url, fileUri);
        if (result.status === 200) {
          await Sharing.shareAsync(result.uri);
        }
      }
    } catch (error) {
      console.error('Error exporting leads:', error);
      alert('Failed to export leads');
    } finally {
      setLoading(false);
    }
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: leads.length };
    leads.forEach((lead) => {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const renderImportTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
          <Ionicons name="cloud-upload" size={32} color="#22c55e" />
        </View>
        <Text style={styles.infoTitle}>Import Leads from CSV</Text>
        <Text style={styles.infoDescription}>
          Upload a CSV file with your leads. The system will automatically score each lead using AI and assign them to territories.
        </Text>
      </View>

      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>How it works:</Text>
        <View style={styles.step}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
          <Text style={styles.stepText}>Download our CSV template</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
          <Text style={styles.stepText}>Fill in your lead data</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
          <Text style={styles.stepText}>Upload and let AI do the rest</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.templateButton}
        onPress={downloadTemplate}
        data-testid="download-template-btn"
      >
        <Ionicons name="download-outline" size={20} color="#3b82f6" />
        <Text style={styles.templateButtonText}>Download CSV Template</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
        onPress={pickFile}
        disabled={loading}
        data-testid="upload-csv-btn"
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.uploadButtonText}>Importing...</Text>
          </>
        ) : (
          <>
            <Ionicons name="cloud-upload" size={22} color="#ffffff" />
            <Text style={styles.uploadButtonText}>Select CSV File to Import</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.formatCard}>
        <Text style={styles.formatTitle}>Required Fields:</Text>
        <View style={styles.formatRow}>
          <Text style={styles.formatField}>name</Text>
          <Text style={styles.formatField}>phone</Text>
        </View>
        <Text style={styles.formatTitle}>Optional Fields:</Text>
        <View style={styles.formatRow}>
          <Text style={styles.formatFieldOptional}>email</Text>
          <Text style={styles.formatFieldOptional}>address</Text>
          <Text style={styles.formatFieldOptional}>zip_code</Text>
        </View>
        <View style={styles.formatRow}>
          <Text style={styles.formatFieldOptional}>homeowner</Text>
          <Text style={styles.formatFieldOptional}>roof_type</Text>
          <Text style={styles.formatFieldOptional}>bill_amount</Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderExportTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{leads.length}</Text>
          <Text style={styles.statLabel}>Total Leads</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>
            {leads.filter(l => l.ai_score >= 70).length}
          </Text>
          <Text style={styles.statLabel}>Hot Leads</Text>
        </View>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Export Filters</Text>
        
        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'new', 'contacted', 'qualified', 'appointment_set', 'closed_won', 'closed_lost'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
                {statusCounts[status] ? ` (${statusCounts[status]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Minimum AI Score</Text>
        <View style={styles.scoreInputRow}>
          <TextInput
            style={styles.scoreInput}
            placeholder="0"
            placeholderTextColor="#64748b"
            value={filterMinScore}
            onChangeText={setFilterMinScore}
            keyboardType="numeric"
          />
          <Text style={styles.scoreInputLabel}>/ 100</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.exportButton, loading && styles.exportButtonDisabled]}
        onPress={exportLeads}
        disabled={loading}
        data-testid="export-leads-btn"
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#0a1929" />
            <Text style={styles.exportButtonText}>Exporting...</Text>
          </>
        ) : (
          <>
            <Ionicons name="download" size={22} color="#0a1929" />
            <Text style={styles.exportButtonText}>Export to CSV</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.exportInfo}>
        <Ionicons name="information-circle" size={18} color="#64748b" />
        <Text style={styles.exportInfoText}>
          Export includes: ID, Name, Email, Phone, Address, AI Score, Status, and more
        </Text>
      </View>

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
          <Text style={styles.title}>Lead Import / Export</Text>
          <Text style={styles.subtitle}>Bulk operations for your leads</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'import' && styles.activeTab]}
          onPress={() => setActiveTab('import')}
        >
          <Ionicons name="cloud-upload" size={18} color={activeTab === 'import' ? '#22c55e' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'import' && styles.activeTabText]}>Import</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'export' && styles.activeTab]}
          onPress={() => setActiveTab('export')}
        >
          <Ionicons name="cloud-download" size={18} color={activeTab === 'export' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'export' && styles.activeTabTextExport]}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'import' ? renderImportTab() : renderExportTab()}

      {/* Import Result Modal */}
      <Modal
        visible={showResult}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowResult(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              {importResult?.error_count === 0 ? (
                <Ionicons name="checkmark-circle" size={60} color="#22c55e" />
              ) : (
                <Ionicons name="warning" size={60} color="#f59e0b" />
              )}
            </View>
            
            <Text style={styles.modalTitle}>
              {importResult?.error_count === 0 ? 'Import Successful!' : 'Import Complete'}
            </Text>
            
            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatValue, { color: '#22c55e' }]}>
                  {importResult?.imported_count || 0}
                </Text>
                <Text style={styles.resultStatLabel}>Imported</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatValue, { color: '#ef4444' }]}>
                  {importResult?.error_count || 0}
                </Text>
                <Text style={styles.resultStatLabel}>Failed</Text>
              </View>
            </View>

            {importResult?.errors && importResult.errors.length > 0 && (
              <View style={styles.errorList}>
                <Text style={styles.errorListTitle}>Errors:</Text>
                {importResult.errors.slice(0, 5).map((err, i) => (
                  <Text key={i} style={styles.errorItem}>
                    Row {err.row}: {err.error}
                  </Text>
                ))}
                {importResult.errors.length > 5 && (
                  <Text style={styles.errorMore}>
                    +{importResult.errors.length - 5} more errors
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowResult(false)}
              data-testid="close-result-btn"
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
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
    backgroundColor: '#22c55e20',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#22c55e',
  },
  activeTabTextExport: {
    color: '#f59e0b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoDescription: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  stepsCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  stepsTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
  },
  stepText: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f620',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  templateButtonText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  uploadButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  formatCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
  },
  formatTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  formatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatField: {
    backgroundColor: '#22c55e20',
    color: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  formatFieldOptional: {
    backgroundColor: '#1e3a5f',
    color: '#94a3b8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  filterCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  filterTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 12,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#f59e0b',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#0a1929',
    fontWeight: '600',
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreInput: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
    width: 80,
  },
  scoreInputLabel: {
    color: '#64748b',
    fontSize: 14,
    marginLeft: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  exportButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  exportButtonText: {
    color: '#0a1929',
    fontSize: 16,
    fontWeight: '700',
  },
  exportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportInfoText: {
    flex: 1,
    color: '#64748b',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  resultStats: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 20,
  },
  resultStat: {
    alignItems: 'center',
  },
  resultStatValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  resultStatLabel: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  errorList: {
    width: '100%',
    backgroundColor: '#ef444420',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorListTitle: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorItem: {
    color: '#fca5a5',
    fontSize: 12,
    marginBottom: 4,
  },
  errorMore: {
    color: '#ef4444',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
