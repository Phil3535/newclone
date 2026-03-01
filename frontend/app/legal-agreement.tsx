import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const BACKGROUND_IMAGE_URL = 'https://customer-assets.emergentagent.com/job_ea12ba3d-28e3-4591-bf98-7eb6fef7d6b7/artifacts/n0gl0yn4_IMG_8501.jpeg';

interface LegalAgreementScreenProps {
  onAccept: () => void;
  isReaccept?: boolean;
}

interface Agreement {
  id: string;
  title: string;
  icon: string;
  required: boolean;
  content: string;
}

const AGREEMENTS: Agreement[] = [
  {
    id: 'terms',
    title: 'Terms of Service',
    icon: 'document-text',
    required: true,
    content: `TERMS OF SERVICE

Last Updated: February 2026

1. ACCEPTANCE OF TERMS
By accessing or using Solar Empire ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Platform.

2. DESCRIPTION OF SERVICE
Solar Empire provides AI-powered solar sales intelligence tools, including lead management, territory mapping, proposal generation, and team collaboration features.

3. USER ACCOUNTS
- You must provide accurate information when creating an account
- You are responsible for maintaining the security of your account
- You must be at least 18 years old to use this service
- One person or legal entity may not maintain more than one account

4. SUBSCRIPTION AND PAYMENTS
- Paid features require an active subscription
- Subscriptions auto-renew unless cancelled
- Refunds are handled according to our refund policy
- Prices may change with 30 days notice

5. USER CONDUCT
You agree NOT to:
- Use the Platform for any illegal purpose
- Attempt to gain unauthorized access to any systems
- Interfere with the proper functioning of the Platform
- Upload malicious code or content
- Harass, abuse, or harm other users

6. INTELLECTUAL PROPERTY
All content, features, and functionality of the Platform are owned by Solar Empire and protected by intellectual property laws.

7. LIMITATION OF LIABILITY
Solar Empire shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Platform.

8. TERMINATION
We may terminate or suspend your account at any time for violations of these terms.

9. CHANGES TO TERMS
We reserve the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.

10. CONTACT
For questions about these Terms, contact: legal@solarempire.app`
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: 'shield-checkmark',
    required: true,
    content: `PRIVACY POLICY

Last Updated: February 2026

1. INFORMATION WE COLLECT

Personal Information:
- Name, email address, phone number
- Company/organization details
- Payment information (processed securely via Stripe)

Usage Data:
- App usage patterns and features accessed
- Device information and IP addresses
- Location data (with your permission)

Lead & Customer Data:
- Contact information you input
- Notes and communications
- Sales pipeline data

2. HOW WE USE YOUR INFORMATION
- To provide and improve our services
- To process payments and subscriptions
- To send service-related communications
- To provide customer support
- To analyze usage and improve features
- To comply with legal obligations

3. DATA SHARING
We do NOT sell your personal data. We may share data with:
- Service providers (hosting, payment processing)
- Legal authorities when required by law
- Business partners with your consent

4. DATA SECURITY
We implement industry-standard security measures including:
- Encryption in transit and at rest
- Regular security audits
- Access controls and monitoring

5. YOUR RIGHTS
You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data (subject to legal requirements)
- Export your data
- Opt-out of marketing communications

6. DATA RETENTION
We retain your data for as long as your account is active or as needed to provide services. You may request deletion at any time.

7. COOKIES AND TRACKING
We use cookies and similar technologies for authentication, preferences, and analytics.

8. CHILDREN'S PRIVACY
Our service is not intended for users under 18 years of age.

9. CHANGES TO THIS POLICY
We will notify you of material changes via email or in-app notification.

10. CONTACT US
Privacy inquiries: privacy@solarempire.app`
  },
  {
    id: 'nda',
    title: 'Confidentiality Agreement',
    icon: 'lock-closed',
    required: true,
    content: `NON-DISCLOSURE & CONFIDENTIALITY AGREEMENT

Last Updated: February 2026

This Non-Disclosure Agreement ("Agreement") is entered into between Solar Empire ("Company") and you ("User").

1. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" includes, but is not limited to:
- Proprietary AI algorithms and scoring methods
- Software architecture and source code concepts
- Business strategies and pricing models
- Customer lists and lead databases
- Training materials and methodologies
- Any information marked as confidential

2. OBLIGATIONS OF CONFIDENTIALITY

As a User, you agree to:
- Keep all Confidential Information strictly confidential
- Not disclose Confidential Information to any third party
- Not use Confidential Information for any purpose other than using the Platform
- Not reverse engineer, decompile, or attempt to derive algorithms
- Not screenshot, record, or reproduce proprietary features for competitive purposes
- Protect Confidential Information with the same degree of care you use for your own confidential information

3. EXCEPTIONS

This Agreement does not apply to information that:
- Is publicly available through no fault of yours
- Was known to you prior to disclosure
- Is independently developed without use of Confidential Information
- Is required to be disclosed by law (with prompt notice to Company)

4. INTELLECTUAL PROPERTY

- All AI models, algorithms, and proprietary technology remain the exclusive property of Solar Empire
- You acquire no rights to any intellectual property through use of the Platform
- Any feedback or suggestions you provide may be used by Company without compensation

5. NON-COMPETE CLAUSE

During your use of the Platform and for 12 months thereafter, you agree not to:
- Develop competing AI-powered solar sales tools using knowledge gained from the Platform
- Solicit Company employees or contractors
- Disparage the Company or its products

6. TERM AND TERMINATION

This Agreement remains in effect:
- During your use of the Platform
- For 3 years following termination of your account
- Indefinitely for trade secrets

7. REMEDIES

You acknowledge that breach of this Agreement may cause irreparable harm, and Company shall be entitled to seek injunctive relief in addition to any other remedies.

8. GOVERNING LAW

This Agreement shall be governed by the laws of the State of Delaware, USA.

By checking the box below, you acknowledge that you have read, understood, and agree to be bound by this Confidentiality Agreement.`
  },
  {
    id: 'acceptable_use',
    title: 'Acceptable Use Policy',
    icon: 'checkmark-circle',
    required: true,
    content: `ACCEPTABLE USE POLICY

Last Updated: February 2026

This Acceptable Use Policy governs your use of Solar Empire's AI-powered features and services.

1. PERMITTED USES

You MAY use the Platform to:
- Manage legitimate solar sales leads and customers
- Generate proposals for real potential customers
- Track your sales performance and commissions
- Collaborate with your team members
- Use AI features for genuine business purposes

2. PROHIBITED USES

You may NOT use the Platform to:

A. Illegal Activities
- Violate any applicable laws or regulations
- Conduct fraudulent or deceptive activities
- Engage in money laundering or financial crimes

B. Harmful Content
- Upload malicious software or code
- Transmit spam or unsolicited communications
- Share offensive, defamatory, or harmful content

C. System Abuse
- Attempt to bypass security measures
- Overload systems with excessive requests
- Scrape or harvest data without permission
- Share account credentials with unauthorized users

D. AI Feature Misuse
- Use AI to generate fake leads or data
- Manipulate AI scoring for fraudulent purposes
- Use generated proposals for non-solar purposes
- Attempt to extract or replicate AI models

E. Competitive Activities
- Use the Platform to develop competing products
- Benchmark features for competitive analysis
- Share insights with competitors

3. LEAD DATA INTEGRITY

You agree that:
- All leads entered are legitimate potential customers
- Contact information is accurate and obtained legally
- You have consent to contact individuals in your database
- You will not import purchased or scraped lead lists

4. AI USAGE LIMITS

- AI features are subject to fair use limits based on your subscription
- Excessive or abusive usage may result in throttling or suspension
- AI-generated content should be reviewed before use

5. REPORTING VIOLATIONS

If you become aware of any violations, report to: abuse@solarempire.app

6. CONSEQUENCES OF VIOLATIONS

Violations may result in:
- Warning and request to cease activity
- Temporary suspension of account
- Permanent termination of account
- Legal action for serious violations
- Reporting to appropriate authorities

7. CHANGES TO THIS POLICY

We may update this policy at any time. Continued use constitutes acceptance.

By using Solar Empire, you agree to comply with this Acceptable Use Policy.`
  }
];

export default function LegalAgreementScreen({ onAccept, isReaccept = false }: LegalAgreementScreenProps) {
  const [agreements, setAgreements] = useState<Record<string, boolean>>({
    terms: false,
    privacy: false,
    nda: false,
    acceptable_use: false,
  });
  const [expandedAgreement, setExpandedAgreement] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allChecked = Object.values(agreements).every(v => v);

  const toggleAgreement = (id: string) => {
    setAgreements(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAccept = async () => {
    if (!allChecked) return;
    
    setSubmitting(true);
    try {
      // Store acceptance locally
      const acceptanceData = {
        accepted_at: new Date().toISOString(),
        agreements: Object.keys(agreements),
        version: '1.0',
      };
      await AsyncStorage.setItem('legal_agreements_accepted', JSON.stringify(acceptanceData));
      
      // Also send to backend for record keeping
      await fetch(`${API_URL}/api/legal/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '301b2e32-f221-48df-a8c1-bfae3a76c4c6',
          ...acceptanceData,
        }),
      }).catch(() => {}); // Silent fail - local storage is primary
      
      onAccept();
    } catch (error) {
      console.error('Error saving agreement acceptance:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View 
      style={[
        styles.fullContainer,
        Platform.OS === 'web' ? {
          backgroundImage: `url(${BACKGROUND_IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } as any : {}
      ]}
    >
      {/* Background Image - for native only */}
      {Platform.OS !== 'web' && (
        <Image 
          source={{ uri: BACKGROUND_IMAGE_URL }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container} data-testid="legal-agreement-screen">
        {/* Header */}
        <View style={styles.header} data-testid="legal-header">
          <View style={styles.logoContainer}>
            <Ionicons name="sunny" size={40} color="#f59e0b" />
          </View>
          <Text style={styles.title} data-testid="legal-title">
            {isReaccept ? 'Updated Agreements' : 'Welcome to Solar Empire'}
          </Text>
          <Text style={styles.subtitle}>
            {isReaccept 
              ? 'Our legal documents have been updated. Please review and accept to continue.'
              : 'Please review and accept our agreements to continue'}
          </Text>
        </View>

        {/* Agreements List */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isReaccept && (
            <View style={styles.updateBanner}>
              <Ionicons name="information-circle" size={20} color="#f59e0b" />
              <Text style={styles.updateBannerText}>
                We've updated our legal documents. Please review and accept the new terms.
              </Text>
            </View>
          )}
          <View style={styles.agreementsList}>
            {AGREEMENTS.map((agreement) => (
              <View key={agreement.id} style={styles.agreementCard} data-testid={`agreement-card-${agreement.id}`}>
                <TouchableOpacity
                  style={styles.agreementHeader}
                  onPress={() => setExpandedAgreement(
                    expandedAgreement === agreement.id ? null : agreement.id
                  )}
                  data-testid={`agreement-expand-${agreement.id}`}
                >
                  <View style={styles.agreementTitleRow}>
                    <View style={[styles.agreementIcon, { backgroundColor: agreements[agreement.id] ? '#22c55e20' : '#1e3a5f' }]}>
                      <Ionicons 
                        name={agreement.icon as any} 
                        size={20}
                        color={agreements[agreement.id] ? '#22c55e' : '#64748b'} 
                      />
                    </View>
                    <View style={styles.agreementTitleSection}>
                      <Text style={styles.agreementTitle}>{agreement.title}</Text>
                      <Text style={styles.agreementRequired}>
                      {agreement.required ? 'Required' : 'Optional'}
                    </Text>
                  </View>
                </View>
                <Ionicons 
                  name={expandedAgreement === agreement.id ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>

              {expandedAgreement === agreement.id && (
                <View style={styles.agreementContent}>
                  <ScrollView style={styles.agreementTextScroll} nestedScrollEnabled>
                    <Text style={styles.agreementText}>{agreement.content}</Text>
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => toggleAgreement(agreement.id)}
                data-testid={`checkbox-${agreement.id}`}
              >
                <View style={[
                  styles.checkbox,
                  agreements[agreement.id] && styles.checkboxChecked
                ]} data-testid={`checkbox-state-${agreement.id}`}>
                  {agreements[agreement.id] && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  I have read and agree to the {agreement.title}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <Text style={styles.summaryText}>
            By continuing, you acknowledge that you have read and agree to all agreements above. 
            These protect both you and Solar Empire.
          </Text>
        </View>
      </ScrollView>

      {/* Accept Button */}
      <View style={styles.footer}>
        <View style={styles.progressRow}>
          {AGREEMENTS.map((agreement) => (
            <View 
              key={agreement.id}
              style={[
                styles.progressDot,
                agreements[agreement.id] && styles.progressDotActive
              ]} 
            />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.acceptButton, !allChecked && styles.acceptButtonDisabled]}
          onPress={handleAccept}
          disabled={!allChecked || submitting}
          data-testid="accept-agreements-btn"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.acceptButtonText}>
                {allChecked ? 'Accept & Continue' : `Accept All Agreements (${Object.values(agreements).filter(Boolean).length}/${AGREEMENTS.length})`}
              </Text>
              {allChecked && <Ionicons name="arrow-forward" size={20} color="#ffffff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </View>
  );
}

// Helper to check if user has already accepted
export async function hasAcceptedAgreements(): Promise<boolean> {
  try {
    const acceptance = await AsyncStorage.getItem('legal_agreements_accepted');
    return !!acceptance;
  } catch {
    return false;
  }
}

// Helper to clear acceptance (for testing or if terms update)
export async function clearAgreementAcceptance(): Promise<void> {
  await AsyncStorage.removeItem('legal_agreements_accepted');
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 22, 40, 0.45)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f59e0b20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  updateBannerText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#f59e0b',
    lineHeight: 20,
  },
  agreementsList: {
    gap: 16,
  },
  agreementCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  agreementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  agreementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  agreementTitleSection: {
    flex: 1,
  },
  agreementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  agreementRequired: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 2,
  },
  agreementContent: {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  agreementTextScroll: {
    maxHeight: 200,
    padding: 16,
  },
  agreementText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#3b82f610',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: '#3b82f6',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e3a5f',
  },
  progressDotActive: {
    backgroundColor: '#22c55e',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
