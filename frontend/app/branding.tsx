import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface BrandingSettings {
  organization_id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_domain: string | null;
  email_from_name: string | null;
  email_footer: string | null;
  is_default?: boolean;
}

interface FeatureAccess {
  custom_branding: boolean;
  custom_domain: boolean;
  white_label: boolean;
}

const COLOR_PRESETS = [
  { name: 'Solar Gold', primary: '#f59e0b', secondary: '#0a1628', accent: '#22c55e' },
  { name: 'Ocean Blue', primary: '#3b82f6', secondary: '#0f172a', accent: '#06b6d4' },
  { name: 'Forest Green', primary: '#22c55e', secondary: '#052e16', accent: '#84cc16' },
  { name: 'Royal Purple', primary: '#8b5cf6', secondary: '#1e1b4b', accent: '#ec4899' },
  { name: 'Sunset Orange', primary: '#f97316', secondary: '#1c1917', accent: '#eab308' },
  { name: 'Crimson Red', primary: '#ef4444', secondary: '#1c1917', accent: '#f59e0b' },
];

export default function BrandingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>({
    custom_branding: false,
    custom_domain: false,
    white_label: false,
  });
  const currentUserId = '301b2e32-f221-48df-a8c1-bfae3a76c4c6';
  const organizationId = 'org-' + currentUserId;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [brandingRes, usageRes] = await Promise.all([
        fetch(`${API_URL}/api/branding/${organizationId}`),
        fetch(`${API_URL}/api/features/usage/${currentUserId}`),
      ]);
      
      const brandingData = await brandingRes.json();
      const usageData = await usageRes.json();
      
      setBranding(brandingData);
      setFeatureAccess({
        custom_branding: usageData.features?.custom_branding || false,
        custom_domain: usageData.features?.custom_domain || false,
        white_label: usageData.features?.white_label || false,
      });
    } catch (error) {
      console.error('Error loading branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBranding = async () => {
    if (!branding) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/branding/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...branding,
          user_id: currentUserId,
        }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Branding settings saved!');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to save branding');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    if (!branding) return;
    setBranding({
      ...branding,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading branding settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canCustomize = featureAccess.custom_branding;
  const canCustomDomain = featureAccess.custom_domain;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Brand Settings</Text>
          <Text style={styles.subtitle}>Customize your app appearance</Text>
        </View>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveBranding}
          disabled={saving || !canCustomize}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {!canCustomize && (
        <View style={styles.upgradeBanner}>
          <Ionicons name="lock-closed" size={20} color="#f59e0b" />
          <Text style={styles.upgradeBannerText}>
            Custom branding requires Business or Enterprise plan
          </Text>
          <TouchableOpacity onPress={() => router.push('/subscription')}>
            <Text style={styles.upgradeLink}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Company Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Name</Text>
          <TextInput
            style={[styles.input, !canCustomize && styles.inputDisabled]}
            value={branding?.company_name || ''}
            onChangeText={(text) => branding && setBranding({ ...branding, company_name: text })}
            placeholder="Your Company Name"
            placeholderTextColor="#64748b"
            editable={canCustomize}
          />
        </View>

        {/* Logo URL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logo URL</Text>
          <TextInput
            style={[styles.input, !canCustomize && styles.inputDisabled]}
            value={branding?.logo_url || ''}
            onChangeText={(text) => branding && setBranding({ ...branding, logo_url: text })}
            placeholder="https://example.com/logo.png"
            placeholderTextColor="#64748b"
            editable={canCustomize}
          />
          {branding?.logo_url && (
            <View style={styles.logoPreview}>
              <Text style={styles.logoPreviewText}>Logo will appear in header & loading screens</Text>
            </View>
          )}
        </View>

        {/* Color Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color Presets</Text>
          <View style={styles.presetsGrid}>
            {COLOR_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.name}
                style={[styles.presetCard, !canCustomize && styles.presetCardDisabled]}
                onPress={() => canCustomize && applyPreset(preset)}
                disabled={!canCustomize}
              >
                <View style={styles.presetColors}>
                  <View style={[styles.presetColor, { backgroundColor: preset.primary }]} />
                  <View style={[styles.presetColor, { backgroundColor: preset.secondary }]} />
                  <View style={[styles.presetColor, { backgroundColor: preset.accent }]} />
                </View>
                <Text style={styles.presetName}>{preset.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Colors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Colors</Text>
          
          <View style={styles.colorRow}>
            <Text style={styles.colorLabel}>Primary Color</Text>
            <View style={styles.colorInputRow}>
              <View style={[styles.colorSwatch, { backgroundColor: branding?.primary_color }]} />
              <TextInput
                style={[styles.colorInput, !canCustomize && styles.inputDisabled]}
                value={branding?.primary_color || '#f59e0b'}
                onChangeText={(text) => branding && setBranding({ ...branding, primary_color: text })}
                placeholder="#f59e0b"
                placeholderTextColor="#64748b"
                editable={canCustomize}
              />
            </View>
          </View>

          <View style={styles.colorRow}>
            <Text style={styles.colorLabel}>Secondary Color</Text>
            <View style={styles.colorInputRow}>
              <View style={[styles.colorSwatch, { backgroundColor: branding?.secondary_color }]} />
              <TextInput
                style={[styles.colorInput, !canCustomize && styles.inputDisabled]}
                value={branding?.secondary_color || '#0a1628'}
                onChangeText={(text) => branding && setBranding({ ...branding, secondary_color: text })}
                placeholder="#0a1628"
                placeholderTextColor="#64748b"
                editable={canCustomize}
              />
            </View>
          </View>

          <View style={styles.colorRow}>
            <Text style={styles.colorLabel}>Accent Color</Text>
            <View style={styles.colorInputRow}>
              <View style={[styles.colorSwatch, { backgroundColor: branding?.accent_color }]} />
              <TextInput
                style={[styles.colorInput, !canCustomize && styles.inputDisabled]}
                value={branding?.accent_color || '#22c55e'}
                onChangeText={(text) => branding && setBranding({ ...branding, accent_color: text })}
                placeholder="#22c55e"
                placeholderTextColor="#64748b"
                editable={canCustomize}
              />
            </View>
          </View>
        </View>

        {/* Custom Domain - Enterprise Only */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Custom Domain</Text>
            {!canCustomDomain && (
              <View style={styles.enterpriseBadge}>
                <Ionicons name="diamond" size={12} color="#8b5cf6" />
                <Text style={styles.enterpriseBadgeText}>Enterprise</Text>
              </View>
            )}
          </View>
          <TextInput
            style={[styles.input, !canCustomDomain && styles.inputDisabled]}
            value={branding?.custom_domain || ''}
            onChangeText={(text) => branding && setBranding({ ...branding, custom_domain: text })}
            placeholder="app.yourcompany.com"
            placeholderTextColor="#64748b"
            editable={canCustomDomain}
          />
          <Text style={styles.helperText}>
            {canCustomDomain 
              ? 'Contact support to configure DNS for your custom domain'
              : 'Upgrade to Enterprise to use your own domain'}
          </Text>
        </View>

        {/* Email Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Branding</Text>
          
          <TextInput
            style={[styles.input, !canCustomize && styles.inputDisabled]}
            value={branding?.email_from_name || ''}
            onChangeText={(text) => branding && setBranding({ ...branding, email_from_name: text })}
            placeholder="From Name (e.g., Your Company Sales)"
            placeholderTextColor="#64748b"
            editable={canCustomize}
          />
          
          <TextInput
            style={[styles.input, styles.multilineInput, !canCustomize && styles.inputDisabled]}
            value={branding?.email_footer || ''}
            onChangeText={(text) => branding && setBranding({ ...branding, email_footer: text })}
            placeholder="Email footer text..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            editable={canCustomize}
          />
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={[styles.previewCard, { backgroundColor: branding?.secondary_color }]}>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewTitle, { color: branding?.primary_color }]}>
                {branding?.company_name || 'Your Company'}
              </Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: branding?.primary_color }]}>
              <Text style={styles.previewButtonText}>Sample Button</Text>
            </View>
            <View style={[styles.previewAccent, { backgroundColor: branding?.accent_color }]}>
              <Text style={styles.previewAccentText}>Success Message</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  loadingText: {
    color: '#f59e0b',
    marginTop: 12,
    fontSize: 16,
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
  saveButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b20',
    padding: 12,
    gap: 8,
  },
  upgradeBannerText: {
    color: '#f59e0b',
    fontSize: 13,
  },
  upgradeLink: {
    color: '#f59e0b',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  enterpriseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf620',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  enterpriseBadgeText: {
    color: '#8b5cf6',
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    marginBottom: 12,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  logoPreview: {
    backgroundColor: '#1e3a5f30',
    padding: 12,
    borderRadius: 8,
  },
  logoPreviewText: {
    color: '#64748b',
    fontSize: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetCard: {
    width: '30%',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  presetCardDisabled: {
    opacity: 0.5,
  },
  presetColors: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  presetColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  presetName: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
  },
  colorRow: {
    marginBottom: 16,
  },
  colorLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  colorInput: {
    flex: 1,
    backgroundColor: '#0f1a2e',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  helperText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
  },
  previewCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  previewHeader: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  previewButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  previewAccent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  previewAccentText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
});
