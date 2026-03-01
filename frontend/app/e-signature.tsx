import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SignatureCanvas from 'react-native-signature-canvas';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export default function ESignatureScreen() {
  const router = useRouter();
  const signatureRef = useRef<any>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleSignature = (sig: string) => {
    setSignature(sig);
    setIsSigning(false);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
  };

  const handleEmpty = () => {
    Alert.alert('Signature Required', 'Please sign before submitting');
  };

  const generateContract = async () => {
    if (!signature) {
      Alert.alert('Signature Required', 'Please sign the contract first');
      return;
    }

    setGenerating(true);
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #f59e0b; }
            h1 { color: #1e293b; }
            .section { margin-bottom: 24px; }
            .section-title { font-weight: bold; color: #475569; margin-bottom: 8px; }
            .terms { background: #f8fafc; padding: 20px; border-radius: 8px; font-size: 14px; line-height: 1.6; }
            .signature-section { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 30px; }
            .signature-box { border: 1px solid #e2e8f0; padding: 10px; margin-top: 10px; }
            .signature-box img { max-width: 300px; height: auto; }
            .date { color: #64748b; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">☀️ SOLAR EMPIRE</div>
            <h1>Solar Installation Agreement</h1>
          </div>
          
          <div class="section">
            <div class="section-title">Agreement Terms</div>
            <div class="terms">
              <p>This Solar Installation Agreement ("Agreement") is entered into between Solar Empire ("Company") and the undersigned customer ("Customer").</p>
              <p><strong>1. Installation Services:</strong> Company agrees to install a solar panel system at Customer's property as specified in the attached proposal.</p>
              <p><strong>2. Warranty:</strong> Company provides a 25-year performance warranty and 10-year workmanship warranty.</p>
              <p><strong>3. Payment Terms:</strong> Payment shall be made according to the financing terms selected by Customer.</p>
              <p><strong>4. Permits:</strong> Company will obtain all necessary permits and inspections.</p>
              <p><strong>5. Timeline:</strong> Installation typically completed within 4-8 weeks of permit approval.</p>
            </div>
          </div>

          <div class="signature-section">
            <div class="section-title">Customer Signature</div>
            <div class="signature-box">
              <img src="${signature}" alt="Customer Signature" />
            </div>
            <div class="date">Date: ${new Date().toLocaleDateString()}</div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Signed Solar Contract',
        });
      }

      Alert.alert(
        '✅ Contract Signed!',
        'The signed contract has been generated and is ready to share.',
        [{ text: 'Awesome!' }]
      );
    } catch (error) {
      console.error('Contract generation error:', error);
      Alert.alert('Error', 'Failed to generate contract');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>E-Signature</Text>
          <Text style={styles.subtitle}>Close Deals Instantly</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contract Preview */}
        <View style={styles.contractCard}>
          <View style={styles.contractHeader}>
            <Ionicons name="document-text" size={24} color="#f59e0b" />
            <Text style={styles.contractTitle}>Solar Installation Agreement</Text>
          </View>
          <Text style={styles.contractText}>
            By signing below, customer agrees to the terms of the solar installation as outlined in the proposal.
          </Text>
          <View style={styles.contractDetails}>
            <View style={styles.contractRow}>
              <Text style={styles.contractLabel}>25-Year Warranty</Text>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            </View>
            <View style={styles.contractRow}>
              <Text style={styles.contractLabel}>30% Federal Tax Credit</Text>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            </View>
            <View style={styles.contractRow}>
              <Text style={styles.contractLabel}>Professional Installation</Text>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            </View>
          </View>
        </View>

        {/* Signature Pad */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Customer Signature</Text>
          <View style={styles.signaturePad}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={handleEmpty}
              onBegin={() => setIsSigning(true)}
              descriptionText="Sign above"
              clearText="Clear"
              confirmText="Save"
              webStyle={`
                .m-signature-pad { box-shadow: none; border: none; }
                .m-signature-pad--body { border: none; }
                .m-signature-pad--footer { display: none; }
                body, html { background-color: #0f1a2e; }
                canvas { background-color: #1e3a5f; border-radius: 12px; }
              `}
              backgroundColor="#1e3a5f"
              penColor="#ffffff"
              style={styles.signatureCanvas}
            />
          </View>
          
          <View style={styles.signatureActions}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            {signature && (
              <View style={styles.signedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.signedText}>Signed</Text>
              </View>
            )}
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, !signature && styles.generateButtonDisabled]}
          onPress={generateContract}
          disabled={generating || !signature}
        >
          {generating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="document-attach" size={24} color="#ffffff" />
              <Text style={styles.generateButtonText}>Generate Signed Contract</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          By signing, customer acknowledges receipt of all disclosures and agrees to the terms and conditions.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  contractCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  contractTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  contractText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  contractDetails: {
    gap: 10,
  },
  contractRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractLabel: {
    fontSize: 14,
    color: '#ffffff',
  },
  signatureSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  signaturePad: {
    height: 200,
    backgroundColor: '#1e3a5f',
    borderRadius: 16,
    overflow: 'hidden',
  },
  signatureCanvas: {
    flex: 1,
  },
  signatureActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#22c55e20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  signedText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
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
  legalText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});
