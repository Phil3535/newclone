import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../src/contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://solar-lead-monetize.preview.emergentagent.com';

export default function TwoFactorAuthScreen() {
  const router = useRouter();
  const { locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [twoFAStatus, setTwoFAStatus] = useState<any>(null);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [disableModalVisible, setDisableModalVisible] = useState(false);
  const [backupCodesModalVisible, setBackupCodesModalVisible] = useState(false);
  const [setupData, setSetupData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Load auth token
  useEffect(() => {
    const loadToken = async () => {
      const token = await AsyncStorage.getItem('adminAuthToken');
      setAuthToken(token);
      if (token) {
        fetchStatus(token);
      } else {
        setLoading(false);
      }
    };
    loadToken();
  }, []);

  const fetchStatus = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTwoFAStatus(data);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    if (!authToken) {
      Alert.alert(
        locale === 'es' ? 'Sesión Requerida' : 'Login Required',
        locale === 'es' 
          ? 'Por favor inicie sesión primero para configurar 2FA'
          : 'Please log in first to set up 2FA'
      );
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/setup/totp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
        setBackupCodes(data.backup_codes || []);
        setSetupModalVisible(true);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to start 2FA setup');
      }
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifySetup = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert(
        locale === 'es' ? 'Error' : 'Error',
        locale === 'es' ? 'Ingrese el código de 6 dígitos' : 'Enter the 6-digit code'
      );
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/verify-setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (response.ok) {
        setSetupModalVisible(false);
        setVerifyModalVisible(false);
        setVerificationCode('');
        setBackupCodesModalVisible(true);
        fetchStatus(authToken!);
        Alert.alert(
          locale === 'es' ? 'Éxito' : 'Success',
          locale === 'es' 
            ? '2FA habilitado correctamente'
            : '2FA enabled successfully'
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Verify error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable2FA = async () => {
    if (verificationCode.length < 6) {
      Alert.alert(
        locale === 'es' ? 'Error' : 'Error',
        locale === 'es' ? 'Ingrese el código de verificación' : 'Enter verification code'
      );
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/disable?code=${verificationCode}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setDisableModalVisible(false);
        setVerificationCode('');
        fetchStatus(authToken!);
        Alert.alert(
          locale === 'es' ? 'Éxito' : 'Success',
          locale === 'es' 
            ? '2FA deshabilitado'
            : '2FA disabled'
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Disable error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    Alert.alert(
      locale === 'es' ? 'Regenerar Códigos' : 'Regenerate Codes',
      locale === 'es' 
        ? 'Esto invalidará tus códigos de respaldo actuales. ¿Continuar?'
        : 'This will invalidate your current backup codes. Continue?',
      [
        { text: locale === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: locale === 'es' ? 'Sí' : 'Yes',
          onPress: () => setVerifyModalVisible(true),
        },
      ]
    );
  };

  const confirmRegenerateBackupCodes = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Error', locale === 'es' ? 'Ingrese el código de 6 dígitos' : 'Enter the 6-digit code');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/backup-codes/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backup_codes || []);
        setVerifyModalVisible(false);
        setVerificationCode('');
        setBackupCodesModalVisible(true);
        fetchStatus(authToken!);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            data-testid="2fa-back-button"
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {locale === 'es' ? 'Autenticación de Dos Factores' : 'Two-Factor Authentication'}
          </Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusIcon,
              { backgroundColor: twoFAStatus?.enabled ? '#22c55e20' : '#ef444420' }
            ]}>
              <Ionicons 
                name={twoFAStatus?.enabled ? 'shield-checkmark' : 'shield-outline'} 
                size={32} 
                color={twoFAStatus?.enabled ? '#22c55e' : '#ef4444'} 
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {twoFAStatus?.enabled 
                  ? (locale === 'es' ? '2FA Habilitado' : '2FA Enabled')
                  : (locale === 'es' ? '2FA Deshabilitado' : '2FA Disabled')
                }
              </Text>
              <Text style={styles.statusSubtitle}>
                {twoFAStatus?.enabled
                  ? (locale === 'es' ? 'Tu cuenta está protegida' : 'Your account is protected')
                  : (locale === 'es' ? 'Añade una capa extra de seguridad' : 'Add an extra layer of security')
                }
              </Text>
            </View>
          </View>

          {twoFAStatus?.enabled && (
            <View style={styles.methodBadge}>
              <Ionicons name="phone-portrait" size={16} color="#8b5cf6" />
              <Text style={styles.methodText}>
                {twoFAStatus?.method === 'totp' ? 'Authenticator App' : 'SMS'}
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={24} color="#3b82f6" />
            <Text style={styles.infoText}>
              {locale === 'es'
                ? '2FA agrega una segunda capa de verificación cuando inicias sesión, protegiendo tu cuenta incluso si tu contraseña es comprometida.'
                : '2FA adds a second verification step when you log in, protecting your account even if your password is compromised.'}
            </Text>
          </View>
        </View>

        {/* Backup Codes Status */}
        {twoFAStatus?.enabled && (
          <View style={styles.backupCard}>
            <View style={styles.backupHeader}>
              <Ionicons name="key" size={20} color="#f59e0b" />
              <Text style={styles.backupTitle}>
                {locale === 'es' ? 'Códigos de Respaldo' : 'Backup Codes'}
              </Text>
            </View>
            <Text style={styles.backupCount}>
              {twoFAStatus?.backup_codes_remaining || 0} {locale === 'es' ? 'códigos restantes' : 'codes remaining'}
            </Text>
            {twoFAStatus?.backup_codes_remaining < 3 && (
              <View style={styles.warningBadge}>
                <Ionicons name="warning" size={16} color="#f59e0b" />
                <Text style={styles.warningText}>
                  {locale === 'es' ? 'Considera regenerar tus códigos' : 'Consider regenerating your codes'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={handleRegenerateBackupCodes}
              data-testid="regenerate-backup-codes-button"
            >
              <Ionicons name="refresh" size={18} color="#ffffff" />
              <Text style={styles.regenerateText}>
                {locale === 'es' ? 'Regenerar Códigos' : 'Regenerate Codes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {!twoFAStatus?.enabled ? (
            <TouchableOpacity
              style={styles.enableButton}
              onPress={handleSetup2FA}
              disabled={processing}
              data-testid="enable-2fa-button"
            >
              {processing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#ffffff" />
                  <Text style={styles.enableText}>
                    {locale === 'es' ? 'Habilitar 2FA' : 'Enable 2FA'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.disableButton}
              onPress={() => setDisableModalVisible(true)}
              data-testid="disable-2fa-button"
            >
              <Ionicons name="shield-outline" size={20} color="#ef4444" />
              <Text style={styles.disableText}>
                {locale === 'es' ? 'Deshabilitar 2FA' : 'Disable 2FA'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* How it Works */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>
            {locale === 'es' ? 'Cómo Funciona' : 'How It Works'}
          </Text>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              {locale === 'es'
                ? 'Descarga Google Authenticator o Authy'
                : 'Download Google Authenticator or Authy'}
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              {locale === 'es'
                ? 'Escanea el código QR con la app'
                : 'Scan the QR code with the app'}
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              {locale === 'es'
                ? 'Ingresa el código de 6 dígitos para verificar'
                : 'Enter the 6-digit code to verify'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Setup Modal */}
      <Modal
        visible={setupModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSetupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {locale === 'es' ? 'Configurar 2FA' : 'Set Up 2FA'}
              </Text>
              <TouchableOpacity onPress={() => setSetupModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {setupData?.qr_code && (
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: setupData.qr_code }}
                  style={styles.qrCode}
                  resizeMode="contain"
                />
              </View>
            )}

            <Text style={styles.modalInstructions}>
              {locale === 'es'
                ? 'Escanea este código QR con tu app de autenticación'
                : 'Scan this QR code with your authenticator app'}
            </Text>

            {setupData?.secret && (
              <View style={styles.secretContainer}>
                <Text style={styles.secretLabel}>
                  {locale === 'es' ? 'O ingresa manualmente:' : 'Or enter manually:'}
                </Text>
                <Text style={styles.secretCode} selectable={true}>
                  {setupData.secret}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.codeInput}
              placeholder={locale === 'es' ? 'Código de 6 dígitos' : '6-digit code'}
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={6}
              value={verificationCode}
              onChangeText={setVerificationCode}
              data-testid="2fa-verification-code-input"
            />

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerifySetup}
              disabled={processing}
              data-testid="verify-2fa-button"
            >
              {processing ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.verifyButtonText}>
                  {locale === 'es' ? 'Verificar y Habilitar' : 'Verify & Enable'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Disable Modal */}
      <Modal
        visible={disableModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDisableModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {locale === 'es' ? 'Deshabilitar 2FA' : 'Disable 2FA'}
              </Text>
              <TouchableOpacity onPress={() => setDisableModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={24} color="#f59e0b" />
              <Text style={styles.warningBoxText}>
                {locale === 'es'
                  ? 'Deshabilitar 2FA hará tu cuenta menos segura'
                  : 'Disabling 2FA will make your account less secure'}
              </Text>
            </View>

            <TextInput
              style={styles.codeInput}
              placeholder={locale === 'es' ? 'Código de verificación' : 'Verification code'}
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={8}
              value={verificationCode}
              onChangeText={setVerificationCode}
            />

            <TouchableOpacity
              style={[styles.verifyButton, { backgroundColor: '#ef4444' }]}
              onPress={handleDisable2FA}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={[styles.verifyButtonText, { color: '#ffffff' }]}>
                  {locale === 'es' ? 'Deshabilitar 2FA' : 'Disable 2FA'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        visible={backupCodesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBackupCodesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {locale === 'es' ? 'Códigos de Respaldo' : 'Backup Codes'}
              </Text>
              <TouchableOpacity onPress={() => setBackupCodesModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={24} color="#f59e0b" />
              <Text style={styles.warningBoxText}>
                {locale === 'es'
                  ? 'Guarda estos códigos en un lugar seguro. Cada código solo se puede usar una vez.'
                  : 'Save these codes in a secure location. Each code can only be used once.'}
              </Text>
            </View>

            <View style={styles.codesGrid}>
              {backupCodes.map((code, index) => (
                <View key={index} style={styles.codeItem}>
                  <Text style={styles.codeText} selectable={true}>{code}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => setBackupCodesModalVisible(false)}
            >
              <Text style={styles.verifyButtonText}>
                {locale === 'es' ? 'Los he guardado' : "I've saved them"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Verify Modal for Regenerate */}
      <Modal
        visible={verifyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {locale === 'es' ? 'Verificar' : 'Verify'}
              </Text>
              <TouchableOpacity onPress={() => setVerifyModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstructions}>
              {locale === 'es'
                ? 'Ingresa el código de tu app de autenticación'
                : 'Enter the code from your authenticator app'}
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder={locale === 'es' ? 'Código de 6 dígitos' : '6-digit code'}
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={6}
              value={verificationCode}
              onChangeText={setVerificationCode}
            />

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={confirmRegenerateBackupCodes}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.verifyButtonText}>
                  {locale === 'es' ? 'Confirmar' : 'Confirm'}
                </Text>
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf620',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  methodText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#3b82f610',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f630',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  backupCard: {
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  backupTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backupCount: {
    color: '#64748b',
    fontSize: 14,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 12,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a5f',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  regenerateText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  enableText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef444420',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 10,
  },
  disableText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  howItWorksCard: {
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  howItWorksTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f59e0b20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  modalInstructions: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  secretContainer: {
    backgroundColor: '#1e3a5f',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  secretLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  secretCode: {
    color: '#f59e0b',
    fontSize: 14,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  codeInput: {
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    padding: 16,
    borderRadius: 10,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  verifyButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  warningBoxText: {
    color: '#f59e0b',
    fontSize: 14,
    flex: 1,
  },
  codesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  codeItem: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    width: '48%',
  },
  codeText: {
    color: '#22c55e',
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
