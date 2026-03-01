import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ScanData {
  id: string;
  roof_area: number;
  panel_count: number;
  system_size: number;
  estimated_savings: number;
  estimated_cost: number;
  payback_years: number;
  twenty_five_year_savings: number;
  address?: string;
  rep_name?: string;
  rep_phone?: string;
  rep_email?: string;
  created_at: string;
  views: number;
  lead_captured?: boolean;
}

export default function SolarEstimateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  useEffect(() => {
    fetchScanData();
  }, [id]);

  const fetchScanData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scan-results/${id}`);
      if (!response.ok) {
        throw new Error('Estimate not found');
      }
      const data = await response.json();
      setScanData(data);
      if (data.lead_captured) {
        setSmsSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load estimate');
    } finally {
      setLoading(false);
    }
  };

  const sendSMSFollowUp = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Phone Required', 'Please enter your phone number to receive your estimate.');
      return;
    }

    setSendingSMS(true);
    try {
      const response = await fetch(`${API_URL}/api/scan-results/${id}/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          name: userName || undefined,
          email: userEmail || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send SMS');
      }

      setSmsSent(true);
      Alert.alert('Sent!', userEmail 
        ? 'Check your phone for your estimate and your email for exclusive solar tips!' 
        : 'Check your phone for your solar savings estimate!');
    } catch (err) {
      Alert.alert('Error', 'Could not send SMS. Please try again.');
    } finally {
      setSendingSMS(false);
    }
  };

  const contactRep = (method: 'call' | 'email') => {
    if (!scanData) return;
    if (method === 'call' && scanData.rep_phone) {
      Linking.openURL(`tel:${scanData.rep_phone}`);
    } else if (method === 'email' && scanData.rep_email) {
      Linking.openURL(`mailto:${scanData.rep_email}?subject=Solar Estimate Inquiry`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading your solar estimate...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !scanData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Estimate Not Found</Text>
          <Text style={styles.errorText}>
            This solar estimate link may have expired or is invalid.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.sunIcon}>
            <Ionicons name="sunny" size={48} color="#f59e0b" />
          </View>
          <Text style={styles.title}>Your Solar Savings Estimate</Text>
          <Text style={styles.subtitle}>Powered by Solar Empire AI</Text>
        </View>

        {/* Main Savings Card */}
        <View style={styles.mainCard}>
          <Text style={styles.savingsLabel}>25-Year Savings</Text>
          <Text style={styles.savingsValue}>
            ${scanData.twenty_five_year_savings.toLocaleString()}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.annualLabel}>
            ${scanData.estimated_savings.toLocaleString()}/year in savings
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="resize" size={28} color="#3b82f6" />
            <Text style={styles.statValue}>{scanData.roof_area.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Sq Ft Roof</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="grid" size={28} color="#8b5cf6" />
            <Text style={styles.statValue}>{scanData.panel_count}</Text>
            <Text style={styles.statLabel}>Solar Panels</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={28} color="#f59e0b" />
            <Text style={styles.statValue}>{scanData.system_size} kW</Text>
            <Text style={styles.statLabel}>System Size</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={28} color="#22c55e" />
            <Text style={styles.statValue}>
              {isNaN(scanData.payback_years) ? 'N/A' : `${scanData.payback_years} yrs`}
            </Text>
            <Text style={styles.statLabel}>Payback</Text>
          </View>
        </View>

        {/* Investment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Investment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated System Cost</Text>
            <Text style={styles.summaryValue}>${scanData.estimated_cost.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Federal Tax Credit (30%)</Text>
            <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
              -${Math.round(scanData.estimated_cost * 0.3).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryLabelBold}>Net Cost After Credit</Text>
            <Text style={styles.summaryValueBold}>
              ${Math.round(scanData.estimated_cost * 0.7).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Contact Rep */}
        {(scanData.rep_name || scanData.rep_phone || scanData.rep_email) && (
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Ready to Go Solar?</Text>
            {scanData.rep_name && (
              <Text style={styles.repName}>Your Solar Consultant: {scanData.rep_name}</Text>
            )}
            <View style={styles.contactButtons}>
              {scanData.rep_phone && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => contactRep('call')}
                  data-testid="call-rep-btn"
                >
                  <Ionicons name="call" size={20} color="#ffffff" />
                  <Text style={styles.contactButtonText}>Call Now</Text>
                </TouchableOpacity>
              )}
              {scanData.rep_email && (
                <TouchableOpacity
                  style={[styles.contactButton, styles.emailButton]}
                  onPress={() => contactRep('email')}
                  data-testid="email-rep-btn"
                >
                  <Ionicons name="mail" size={20} color="#f59e0b" />
                  <Text style={[styles.contactButtonText, { color: '#f59e0b' }]}>Email</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* SMS Follow-Up Capture */}
        {!smsSent ? (
          <View style={styles.smsCard}>
            <View style={styles.smsHeader}>
              <Ionicons name="phone-portrait" size={28} color="#22c55e" />
              <Text style={styles.smsTitle}>Get Your Estimate via Text</Text>
            </View>
            <Text style={styles.smsSubtitle}>
              Enter your details and we'll text you this estimate + send exclusive solar savings tips
            </Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="Your name (optional)"
              placeholderTextColor="#64748b"
              value={userName}
              onChangeText={setUserName}
              data-testid="sms-name-input"
            />
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor="#64748b"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              data-testid="sms-phone-input"
            />
            <TextInput
              style={styles.phoneInput}
              placeholder="Email (for exclusive tips & offers)"
              placeholderTextColor="#64748b"
              value={userEmail}
              onChangeText={setUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              data-testid="sms-email-input"
            />
            <TouchableOpacity
              style={[styles.smsButton, sendingSMS && styles.smsButtonDisabled]}
              onPress={sendSMSFollowUp}
              disabled={sendingSMS}
              data-testid="send-sms-btn"
            >
              {sendingSMS ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#ffffff" />
                  <Text style={styles.smsButtonText}>Text Me My Estimate</Text>
                </>
              )}
            </TouchableOpacity>
            {userEmail ? (
              <Text style={styles.emailNote}>
                We'll also send you a welcome email with solar tips!
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.smsSuccessCard}>
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            <Text style={styles.smsSuccessTitle}>Estimate Sent!</Text>
            <Text style={styles.smsSuccessText}>
              Check your phone for your personalized solar savings estimate
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Estimate generated on {new Date(scanData.created_at).toLocaleDateString()}
          </Text>
          <Text style={styles.footerText}>
            Viewed {scanData.views} time{scanData.views !== 1 ? 's' : ''}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sunIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  mainCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  savingsLabel: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  savingsValue: {
    color: '#22c55e',
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    marginVertical: 12,
  },
  annualLabel: {
    color: '#86efac',
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(30, 58, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: 'rgba(30, 58, 95, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  summaryTotal: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  summaryLabelBold: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValueBold: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 20,
  },
  contactTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  repName: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 16,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emailButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  footerText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  smsCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  smsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  smsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  smsSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 16,
  },
  phoneInput: {
    backgroundColor: 'rgba(30, 58, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  smsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  smsButtonDisabled: {
    opacity: 0.6,
  },
  smsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  smsSuccessCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  smsSuccessTitle: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  smsSuccessText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  emailNote: {
    color: '#22c55e',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
