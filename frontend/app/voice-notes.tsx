import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  startRecording,
  stopRecording,
  playVoiceNote,
  VoiceNote,
} from '../src/services/voiceService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ExtractedLead {
  name: string;
  phone: string;
  email?: string;
  address: string;
  zip_code: string;
  monthly_bill: number;
  roof_type: string;
  notes: string;
  timeline: string;
}

export default function VoiceNotesScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [converting, setConverting] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [extractedLead, setExtractedLead] = useState<ExtractedLead | null>(null);
  const [transcription, setTranscription] = useState('');
  const [manualTranscription, setManualTranscription] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    loadVoiceNotes();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      setRecordingTime(0);
      pulseAnim.setValue(1);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadVoiceNotes = async () => {
    try {
      const data = await AsyncStorage.getItem('voice_notes');
      if (data) {
        setVoiceNotes(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading voice notes:', error);
    }
  };

  const saveVoiceNotes = async (notes: VoiceNote[]) => {
    try {
      await AsyncStorage.setItem('voice_notes', JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving voice notes:', error);
    }
  };

  const convertToLead = async (noteId: string, transcript?: string) => {
    setConverting(noteId);
    try {
      // Use provided transcript or prompt for manual input
      const textToConvert = transcript || manualTranscription;
      
      if (!textToConvert) {
        setShowManualInput(true);
        setConverting(null);
        return;
      }
      
      const response = await fetch(`${API_URL}/api/voice/create-lead?transcription=${encodeURIComponent(textToConvert)}&rep_id=solar-empire-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setExtractedLead(data.extracted_data);
        setTranscription(textToConvert);
        setShowLeadModal(true);
        
        // Mark note as converted
        const updatedNotes = voiceNotes.map(n => 
          n.id === noteId ? { ...n, transcript: textToConvert } : n
        );
        setVoiceNotes(updatedNotes);
        await saveVoiceNotes(updatedNotes);
      } else {
        Alert.alert('Error', 'Failed to create lead from voice note');
      }
    } catch (error) {
      console.error('Convert to lead error:', error);
      Alert.alert('Error', 'Failed to process voice note');
    } finally {
      setConverting(null);
      setShowManualInput(false);
      setManualTranscription('');
    }
  };

  const handleManualConvert = () => {
    if (manualTranscription.trim()) {
      convertToLead('manual', manualTranscription);
    }
  };

  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording
      const note = await stopRecording();
      setIsRecording(false);
      
      if (note) {
        const newNotes = [note, ...voiceNotes];
        setVoiceNotes(newNotes);
        await saveVoiceNotes(newNotes);
        Alert.alert('Success', 'Voice note saved!');
      }
    } else {
      // Start recording
      const success = await startRecording();
      if (success) {
        setIsRecording(true);
      } else {
        Alert.alert(
          'Permission Required',
          'Please allow microphone access to record voice notes.'
        );
      }
    }
  };

  const handlePlay = async (uri: string) => {
    try {
      await playVoiceNote(uri);
    } catch (error) {
      Alert.alert('Error', 'Could not play voice note');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Voice Note',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const newNotes = voiceNotes.filter((n) => n.id !== id);
            setVoiceNotes(newNotes);
            await saveVoiceNotes(newNotes);
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (ms: number) => {
    return formatTime(Math.floor(ms / 1000));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderVoiceNote = ({ item }: { item: VoiceNote }) => (
    <View style={styles.noteCard}>
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => handlePlay(item.uri)}
      >
        <Ionicons name="play" size={24} color="#ffffff" />
      </TouchableOpacity>
      <View style={styles.noteInfo}>
        <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.noteDuration}>{formatDuration(item.duration)}</Text>
        {item.transcript && (
          <View style={styles.convertedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
            <Text style={styles.convertedText}>Converted</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[styles.convertButton, item.transcript && styles.convertButtonDisabled]}
        onPress={() => !item.transcript && convertToLead(item.id)}
        disabled={!!item.transcript || converting === item.id}
      >
        {converting === item.id ? (
          <ActivityIndicator size="small" color="#f59e0b" />
        ) : (
          <>
            <Ionicons name="person-add" size={16} color={item.transcript ? '#64748b' : '#f59e0b'} />
            <Text style={[styles.convertButtonText, item.transcript && styles.convertButtonTextDisabled]}>
              {item.transcript ? 'Done' : 'Lead'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Voice Notes</Text>
          <Text style={styles.subtitle}>Quick Audio Memos</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Recording Section */}
      <View style={styles.recordingSection}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPress={handleRecord}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={48}
              color="#ffffff"
            />
          </TouchableOpacity>
        </Animated.View>
        
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
          </View>
        )}
        
        <Text style={styles.recordingHint}>
          {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
        </Text>
      </View>

      {/* Quick Convert Banner */}
      <TouchableOpacity 
        style={styles.quickConvertBanner}
        onPress={() => setShowManualInput(true)}
      >
        <View style={styles.quickConvertIcon}>
          <Ionicons name="flash" size={20} color="#f59e0b" />
        </View>
        <View style={styles.quickConvertContent}>
          <Text style={styles.quickConvertTitle}>Quick Voice-to-Lead</Text>
          <Text style={styles.quickConvertSubtitle}>Type or paste lead info to convert instantly</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#f59e0b" />
      </TouchableOpacity>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Ionicons name="bulb" size={20} color="#f59e0b" />
        <Text style={styles.tipsText}>
          Record quick notes during site visits: roof condition, customer preferences, follow-up tasks. Tap "Lead" to convert to a contact!
        </Text>
      </View>

      {/* Voice Notes List */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          Your Recordings ({voiceNotes.length})
        </Text>
        <FlatList
          data={voiceNotes}
          renderItem={renderVoiceNote}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mic-off-outline" size={48} color="#1e3a5f" />
              <Text style={styles.emptyText}>No voice notes yet</Text>
              <Text style={styles.emptyHint}>Tap the mic to record your first note</Text>
            </View>
          }
        />
      </View>

      {/* Manual Transcription Modal */}
      <Modal visible={showManualInput} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Voice-to-Lead</Text>
              <TouchableOpacity onPress={() => setShowManualInput(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Type or paste lead information and AI will extract contact details
            </Text>
            <TextInput
              style={styles.transcriptionInput}
              value={manualTranscription}
              onChangeText={setManualTranscription}
              placeholder="e.g., John Smith at 123 Main St, Beverly Hills. Monthly bill around $250. Interested in solar, has tile roof..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[styles.convertNowButton, !manualTranscription && styles.convertNowButtonDisabled]}
              onPress={handleManualConvert}
              disabled={!manualTranscription || converting !== null}
            >
              {converting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#ffffff" />
                  <Text style={styles.convertNowButtonText}>Convert to Lead with AI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Lead Created Modal */}
      <Modal visible={showLeadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successHeader}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
              </View>
              <Text style={styles.successTitle}>Lead Created!</Text>
              <Text style={styles.successSubtitle}>AI extracted the following info:</Text>
            </View>
            
            {extractedLead && (
              <ScrollView style={styles.leadDetails}>
                <View style={styles.leadField}>
                  <Text style={styles.leadLabel}>Name</Text>
                  <Text style={styles.leadValue}>{extractedLead.name}</Text>
                </View>
                <View style={styles.leadField}>
                  <Text style={styles.leadLabel}>Phone</Text>
                  <Text style={styles.leadValue}>{extractedLead.phone || 'Not detected'}</Text>
                </View>
                <View style={styles.leadField}>
                  <Text style={styles.leadLabel}>Address</Text>
                  <Text style={styles.leadValue}>{extractedLead.address}</Text>
                </View>
                <View style={styles.leadField}>
                  <Text style={styles.leadLabel}>ZIP Code</Text>
                  <Text style={styles.leadValue}>{extractedLead.zip_code}</Text>
                </View>
                <View style={styles.leadField}>
                  <Text style={styles.leadLabel}>Monthly Bill</Text>
                  <Text style={styles.leadValue}>${extractedLead.monthly_bill}</Text>
                </View>
                <View style={styles.leadField}>
                  <Text style={styles.leadLabel}>Roof Type</Text>
                  <Text style={styles.leadValue}>{extractedLead.roof_type}</Text>
                </View>
                <View style={styles.leadField}>
                  <Text style={styles.leadLabel}>Timeline</Text>
                  <Text style={styles.leadValue}>{extractedLead.timeline}</Text>
                </View>
                {extractedLead.notes && (
                  <View style={styles.leadField}>
                    <Text style={styles.leadLabel}>Notes</Text>
                    <Text style={styles.leadValue}>{extractedLead.notes}</Text>
                  </View>
                )}
              </ScrollView>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.viewLeadsButton}
                onPress={() => {
                  setShowLeadModal(false);
                  router.push('/(tabs)/leads');
                }}
              >
                <Ionicons name="people" size={18} color="#ffffff" />
                <Text style={styles.viewLeadsButtonText}>View Leads</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setShowLeadModal(false)}
              >
                <Text style={styles.closeModalButtonText}>Done</Text>
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
  recordingSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#334155',
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  recordingHint: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noteInfo: {
    flex: 1,
  },
  noteDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  noteDuration: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    gap: 4,
  },
  convertButtonDisabled: {
    backgroundColor: '#1e3a5f30',
  },
  convertButtonText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  convertButtonTextDisabled: {
    color: '#64748b',
  },
  convertedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  convertedText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '500',
  },
  quickConvertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  quickConvertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f59e0b20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickConvertContent: {
    flex: 1,
  },
  quickConvertTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  quickConvertSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 16,
  },
  transcriptionInput: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minHeight: 120,
    marginBottom: 16,
  },
  convertNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  convertNowButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  convertNowButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  successSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  leadDetails: {
    maxHeight: 300,
  },
  leadField: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  leadLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  leadValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  viewLeadsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewLeadsButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  closeModalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a5f',
    padding: 14,
    borderRadius: 12,
  },
  closeModalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
});
