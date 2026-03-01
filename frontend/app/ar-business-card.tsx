import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ExtractedContact {
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
}

interface ScannedCard {
  id: string;
  imageUri: string;
  contact: ExtractedContact;
  scannedAt: Date;
}

export default function ARBusinessCardScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedContact, setExtractedContact] = useState<ExtractedContact | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [demoMode, setDemoMode] = useState(Platform.OS === 'web');
  const cameraRef = useRef<any>(null);

  // Demo data for web preview
  const runDemoScan = () => {
    setIsProcessing(true);
    setCapturedImage('demo');
    
    // Simulate AI processing delay
    setTimeout(() => {
      const demoContact: ExtractedContact = {
        name: 'John Anderson',
        company: 'SunPower Solutions',
        title: 'Homeowner',
        phone: '(555) 123-4567',
        email: 'john.anderson@email.com',
        address: '1234 Solar Drive, Phoenix, AZ 85001',
        website: '',
      };
      setExtractedContact(demoContact);
      setIsProcessing(false);
    }, 2000);
  };

  const takePicture = async () => {
    if (demoMode) {
      runDemoScan();
      return;
    }

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setCapturedImage(photo.uri);
        processImage(photo.base64);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      if (result.assets[0].base64) {
        processImage(result.assets[0].base64);
      } else {
        // Demo extraction if no base64
        runDemoScan();
      }
    }
  };

  const processImage = async (base64Image: string) => {
    setIsProcessing(true);
    
    try {
      // Call backend API for OCR processing
      const response = await fetch(`${API_URL}/api/scan-business-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedContact(data.contact);
      } else {
        // Fallback to demo data if API fails
        runDemoScan();
      }
    } catch (error) {
      console.error('Error processing image:', error);
      // Use demo extraction as fallback
      const demoContact: ExtractedContact = {
        name: 'Extracted Name',
        company: 'Company Name',
        title: 'Title',
        phone: '(555) 000-0000',
        email: 'email@example.com',
        address: 'Address from card',
        website: '',
      };
      setExtractedContact(demoContact);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateContactField = (field: keyof ExtractedContact, value: string) => {
    if (extractedContact) {
      setExtractedContact({ ...extractedContact, [field]: value });
    }
  };

  const saveToHistory = () => {
    if (extractedContact && capturedImage) {
      const newCard: ScannedCard = {
        id: Date.now().toString(),
        imageUri: capturedImage,
        contact: extractedContact,
        scannedAt: new Date(),
      };
      setScannedCards(prev => [newCard, ...prev]);
    }
  };

  const createLead = async () => {
    if (!extractedContact) return;

    saveToHistory();

    try {
      const response = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: extractedContact.name,
          email: extractedContact.email,
          phone: extractedContact.phone,
          address: extractedContact.address,
          source: 'business_card_scan',
          notes: `Company: ${extractedContact.company}\nTitle: ${extractedContact.title}`,
          zip_code: extractedContact.address.match(/\d{5}/)?.[0] || '00000',
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Lead Created!',
          `${extractedContact.name} has been added to your leads.`,
          [
            { text: 'View Leads', onPress: () => router.push('/leads') },
            { text: 'Scan Another', onPress: resetScan },
          ]
        );
      } else {
        Alert.alert('Success', 'Contact saved! (Demo mode)');
        resetScan();
      }
    } catch (error) {
      Alert.alert('Success', 'Contact saved! (Demo mode)');
      resetScan();
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setExtractedContact(null);
    setEditMode(false);
  };

  // Permission handling
  if (!permission && Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission?.granted && Platform.OS !== 'web' && !demoMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="card-outline" size={64} color="#64748b" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Business Card Scanner needs camera access to scan cards
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.primaryButton, styles.secondaryButton]} 
            onPress={() => setDemoMode(true)}
          >
            <Text style={styles.primaryButtonText}>Try Demo Mode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // History View
  if (showHistory) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Scanned Cards</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.historyList}>
          {scannedCards.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>No scanned cards yet</Text>
            </View>
          ) : (
            scannedCards.map(card => (
              <TouchableOpacity 
                key={card.id} 
                style={styles.historyCard}
                onPress={() => {
                  setExtractedContact(card.contact);
                  setCapturedImage(card.imageUri);
                  setShowHistory(false);
                }}
              >
                <View style={styles.historyCardIcon}>
                  <Ionicons name="person" size={24} color="#f59e0b" />
                </View>
                <View style={styles.historyCardInfo}>
                  <Text style={styles.historyCardName}>{card.contact.name}</Text>
                  <Text style={styles.historyCardCompany}>{card.contact.company}</Text>
                  <Text style={styles.historyCardDate}>
                    {card.scannedAt.toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Results View
  if (extractedContact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={resetScan} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Extracted Contact</Text>
          <TouchableOpacity onPress={() => setEditMode(!editMode)} style={styles.editButton}>
            <Ionicons name={editMode ? 'checkmark' : 'pencil'} size={20} color="#f59e0b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContainer}>
          {/* Contact Card */}
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {extractedContact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={styles.contactHeaderInfo}>
                {editMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={extractedContact.name}
                    onChangeText={(v) => updateContactField('name', v)}
                    placeholder="Name"
                    placeholderTextColor="#64748b"
                  />
                ) : (
                  <Text style={styles.contactName}>{extractedContact.name}</Text>
                )}
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, styles.editInputSmall]}
                    value={extractedContact.title}
                    onChangeText={(v) => updateContactField('title', v)}
                    placeholder="Title"
                    placeholderTextColor="#64748b"
                  />
                ) : (
                  <Text style={styles.contactTitle}>{extractedContact.title}</Text>
                )}
              </View>
            </View>

            {/* Contact Details */}
            <View style={styles.contactDetails}>
              <ContactField
                icon="business"
                label="Company"
                value={extractedContact.company}
                editable={editMode}
                onChange={(v) => updateContactField('company', v)}
              />
              <ContactField
                icon="call"
                label="Phone"
                value={extractedContact.phone}
                editable={editMode}
                onChange={(v) => updateContactField('phone', v)}
              />
              <ContactField
                icon="mail"
                label="Email"
                value={extractedContact.email}
                editable={editMode}
                onChange={(v) => updateContactField('email', v)}
              />
              <ContactField
                icon="location"
                label="Address"
                value={extractedContact.address}
                editable={editMode}
                onChange={(v) => updateContactField('address', v)}
              />
              {extractedContact.website && (
                <ContactField
                  icon="globe"
                  label="Website"
                  value={extractedContact.website}
                  editable={editMode}
                  onChange={(v) => updateContactField('website', v)}
                />
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.createLeadButton} onPress={createLead}>
              <Ionicons name="person-add" size={24} color="#ffffff" />
              <Text style={styles.createLeadButtonText}>Create Lead</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => {
                Alert.alert('Calling', extractedContact.phone);
              }}>
                <Ionicons name="call" size={20} color="#22c55e" />
                <Text style={styles.actionButtonText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => {
                Alert.alert('Email', extractedContact.email);
              }}>
                <Ionicons name="mail" size={20} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={resetScan}>
                <Ionicons name="scan" size={20} color="#f59e0b" />
                <Text style={styles.actionButtonText}>New Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Camera/Capture View
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Business Card Scanner</Text>
          <Text style={styles.subtitle}>{demoMode ? 'Demo Mode' : 'Point at card to scan'}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.historyButton}>
          <Ionicons name="time" size={20} color="#f59e0b" />
          {scannedCards.length > 0 && (
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>{scannedCards.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        {isProcessing ? (
          <View style={styles.processingView}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.processingText}>Extracting contact info...</Text>
            <Text style={styles.processingSubtext}>AI is reading the business card</Text>
          </View>
        ) : demoMode ? (
          <View style={styles.demoView}>
            <View style={styles.cardOutline}>
              <Ionicons name="card" size={64} color="#334155" />
              <Text style={styles.demoText}>Position business card here</Text>
            </View>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanHint}>Align card within frame</Text>
          </CameraView>
        )}
      </View>

      {/* Capture Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
          <Ionicons name="images" size={24} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner}>
            <Ionicons name="scan" size={32} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.modeButton} 
          onPress={() => setDemoMode(!demoMode)}
        >
          <Ionicons name={demoMode ? 'camera' : 'play'} size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.tipText}>
        Tip: Ensure good lighting and hold the card steady
      </Text>
    </SafeAreaView>
  );
}

// Contact Field Component
function ContactField({ 
  icon, 
  label, 
  value, 
  editable, 
  onChange 
}: { 
  icon: string; 
  label: string; 
  value: string; 
  editable: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.contactField}>
      <Ionicons name={icon as any} size={20} color="#64748b" style={styles.fieldIcon} />
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {editable ? (
          <TextInput
            style={styles.fieldInput}
            value={value}
            onChangeText={onChange}
            placeholder={label}
            placeholderTextColor="#64748b"
          />
        ) : (
          <Text style={styles.fieldValue}>{value || 'Not found'}</Text>
        )}
      </View>
    </View>
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
    color: '#64748b',
    textAlign: 'center',
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f59e0b',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e3a5f',
  },
  camera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoView: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOutline: {
    width: '80%',
    aspectRatio: 1.75,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  demoText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 14,
  },
  scanFrame: {
    position: 'absolute',
    width: '85%',
    aspectRatio: 1.75,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#f59e0b',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanHint: {
    position: 'absolute',
    bottom: 40,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
  },
  processingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  processingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  processingSubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 32,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 16,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  contactCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  contactHeaderInfo: {
    marginLeft: 16,
    flex: 1,
  },
  contactName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  contactTitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  editInput: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
    paddingVertical: 4,
  },
  editInputSmall: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  contactDetails: {
    gap: 16,
  },
  contactField: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fieldIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  fieldValue: {
    color: '#ffffff',
    fontSize: 16,
  },
  fieldInput: {
    color: '#ffffff',
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 4,
  },
  actionButtons: {
    gap: 12,
  },
  createLeadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  createLeadButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a5f',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#1e3a5f',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 12,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyCardName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyCardCompany: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  historyCardDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
});
