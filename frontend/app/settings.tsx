import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';
import {
  useOfflineStore,
  syncPendingActions,
  clearOfflineData,
  checkNetworkStatus,
  getPendingActions,
} from '../src/services/offline';
import { leadsApi, appointmentsApi } from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const { theme, toggleTheme, branding } = useTheme();
  const { isOnline, isSyncing, lastSyncTime, pendingActionsCount } = useOfflineStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [teamChatNotifications, setTeamChatNotifications] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Load saved notification preferences
    const loadPreferences = async () => {
      const teamChatPref = await AsyncStorage.getItem('teamChatNotifications');
      if (teamChatPref !== null) {
        setTeamChatNotifications(teamChatPref === 'true');
      }
    };
    loadPreferences();
  }, []);

  const handleTeamChatNotificationsChange = async (value: boolean) => {
    setTeamChatNotifications(value);
    await AsyncStorage.setItem('teamChatNotifications', value.toString());
  };

  const handleLanguageChange = async (newLocale: string) => {
    await setLocale(newLocale);
    Alert.alert(
      newLocale === 'es' ? 'Idioma Cambiado' : 'Language Changed',
      newLocale === 'es' 
        ? 'La aplicación ahora está en español.' 
        : 'The app is now in English.'
    );
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert(t('common.error'), t('common.offline'));
      return;
    }

    setSyncing(true);
    try {
      const result = await syncPendingActions({
        createLead: async (data) => {
          await leadsApi.create(data);
        },
        updateLead: async (id, updates) => {
          await leadsApi.update(id, updates);
        },
        createAppointment: async (data) => {
          await appointmentsApi.create(data);
        },
        updateAppointment: async (id, updates) => {
          await appointmentsApi.update(id, updates);
        },
      });

      if (result.success > 0 || result.failed === 0) {
        Alert.alert(
          t('common.success'),
          locale === 'es'
            ? `Sincronizado: ${result.success} exitosos, ${result.failed} fallidos`
            : `Synced: ${result.success} successful, ${result.failed} failed`
        );
      } else {
        Alert.alert(
          t('common.error'),
          locale === 'es'
            ? `Falló la sincronización de ${result.failed} acciones`
            : `Failed to sync ${result.failed} actions`
        );
      }
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert(t('common.error'), 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      locale === 'es' ? 'Borrar Caché' : 'Clear Cache',
      locale === 'es'
        ? '¿Estás seguro de que quieres borrar todos los datos almacenados localmente?'
        : 'Are you sure you want to clear all locally stored data?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            await clearOfflineData();
            Alert.alert(t('common.success'), locale === 'es' ? 'Caché borrado' : 'Cache cleared');
          },
        },
      ]
    );
  };

  const formatLastSync = () => {
    if (!lastSyncTime) {
      return locale === 'es' ? 'Nunca' : 'Never';
    }
    const date = new Date(lastSyncTime);
    return date.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>{locale === 'es' ? 'Configuración' : 'Settings'}</Text>
        </View>

        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.statusText}>
              {isOnline 
                ? (locale === 'es' ? 'Conectado' : 'Online') 
                : (locale === 'es' ? 'Sin Conexión' : 'Offline')}
            </Text>
          </View>
          {pendingActionsCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>
                {pendingActionsCount} {locale === 'es' ? 'pendiente(s)' : 'pending'}
              </Text>
            </View>
          )}
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'es' ? 'Idioma' : 'Language'}
          </Text>
          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[styles.languageOption, locale === 'en' && styles.languageOptionActive]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={styles.flagEmoji}>🇺🇸</Text>
              <Text style={[styles.languageText, locale === 'en' && styles.languageTextActive]}>
                English
              </Text>
              {locale === 'en' && (
                <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, locale === 'es' && styles.languageOptionActive]}
              onPress={() => handleLanguageChange('es')}
            >
              <Text style={styles.flagEmoji}>🇪🇸</Text>
              <Text style={[styles.languageText, locale === 'es' && styles.languageTextActive]}>
                Español
              </Text>
              {locale === 'es' && (
                <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'es' ? 'Apariencia' : 'Appearance'}
          </Text>
          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[styles.languageOption, theme === 'dark' && styles.languageOptionActive]}
              onPress={() => theme !== 'dark' && toggleTheme()}
              data-testid="dark-theme-button"
            >
              <Ionicons name="moon" size={20} color={theme === 'dark' ? '#f59e0b' : '#64748b'} />
              <Text style={[styles.languageText, theme === 'dark' && styles.languageTextActive]}>
                {locale === 'es' ? 'Oscuro' : 'Dark'}
              </Text>
              {theme === 'dark' && (
                <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, theme === 'light' && styles.languageOptionActive]}
              onPress={() => theme !== 'light' && toggleTheme()}
              data-testid="light-theme-button"
            >
              <Ionicons name="sunny" size={20} color={theme === 'light' ? '#f59e0b' : '#64748b'} />
              <Text style={[styles.languageText, theme === 'light' && styles.languageTextActive]}>
                {locale === 'es' ? 'Claro' : 'Light'}
              </Text>
              {theme === 'light' && (
                <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'es' ? 'Tema' : 'Theme'}
          </Text>
          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[styles.languageOption, styles.languageOptionActive]}
            >
              <Ionicons name="moon" size={20} color="#8b5cf6" />
              <Text style={[styles.languageText, styles.languageTextActive]}>
                {locale === 'es' ? 'Modo Oscuro' : 'Dark Mode'}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.languageOption}
              onPress={() => Alert.alert(
                locale === 'es' ? 'Próximamente' : 'Coming Soon',
                locale === 'es' ? 'El modo claro estará disponible pronto!' : 'Light mode coming soon!'
              )}
            >
              <Ionicons name="sunny" size={20} color="#fbbf24" />
              <Text style={styles.languageText}>
                {locale === 'es' ? 'Modo Claro' : 'Light Mode'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'es' ? 'Modo Sin Conexión' : 'Offline Mode'}
          </Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="cloud-offline" size={20} color="#64748b" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>
                    {locale === 'es' ? 'Última Sincronización' : 'Last Sync'}
                  </Text>
                  <Text style={styles.settingValue}>{formatLastSync()}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.syncButton, (!isOnline || syncing) && styles.syncButtonDisabled]}
              onPress={handleSync}
              disabled={!isOnline || syncing}
            >
              {syncing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="sync" size={20} color="#ffffff" />
                  <Text style={styles.syncButtonText}>
                    {locale === 'es' ? 'Sincronizar Ahora' : 'Sync Now'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearCacheButton} onPress={handleClearCache}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={styles.clearCacheText}>
                {locale === 'es' ? 'Borrar Caché' : 'Clear Cache'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'es' ? 'Notificaciones' : 'Notifications'}
          </Text>
          <View style={styles.card}>
            <View style={styles.settingRowSwitch}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={20} color="#64748b" />
                <Text style={styles.settingLabel}>
                  {locale === 'es' ? 'Recordatorios de Citas' : 'Appointment Reminders'}
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#1e3a5f', true: '#f59e0b50' }}
                thumbColor={notificationsEnabled ? '#f59e0b' : '#64748b'}
              />
            </View>
            <View style={[styles.settingRowSwitch, { borderTopWidth: 1, borderTopColor: '#1e3a5f' }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="chatbubbles" size={20} color="#ec4899" />
                <View>
                  <Text style={styles.settingLabel}>
                    {locale === 'es' ? 'Chat de Equipo' : 'Team Chat'}
                  </Text>
                  <Text style={styles.settingValue}>
                    {locale === 'es' ? 'Recibir notificaciones de mensajes' : 'Get message notifications'}
                  </Text>
                </View>
              </View>
              <Switch
                value={teamChatNotifications}
                onValueChange={handleTeamChatNotificationsChange}
                trackColor={{ false: '#1e3a5f', true: '#ec489950' }}
                thumbColor={teamChatNotifications ? '#ec4899' : '#64748b'}
              />
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'es' ? 'Seguridad' : 'Security'}
          </Text>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/two-factor-auth' as any)}
            data-testid="2fa-settings-link"
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>
                    {locale === 'es' ? 'Autenticación de Dos Factores' : 'Two-Factor Authentication'}
                  </Text>
                  <Text style={styles.settingValue}>
                    {locale === 'es' 
                      ? 'Añade una capa extra de seguridad a tu cuenta' 
                      : 'Add extra security to your account'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Navigation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'es' ? 'Navegación GPS' : 'GPS Navigation'}
          </Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="navigate" size={20} color="#64748b" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>
                    {locale === 'es' ? 'Navegación Integrada' : 'Integrated Navigation'}
                  </Text>
                  <Text style={styles.settingValue}>
                    {locale === 'es' 
                      ? 'Usa Google Maps para navegar a las citas' 
                      : 'Use Google Maps to navigate to appointments'}
                  </Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'es' ? 'Acerca de' : 'About'}
          </Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Solar Empire</Text>
              <Text style={styles.aboutValue}>v1.0.0</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>
                {locale === 'es' ? 'Plataforma' : 'Platform'}
              </Text>
              <Text style={styles.aboutValue}>{Platform.OS}</Text>
            </View>
          </View>
        </View>

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
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionGroup: {
    gap: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    gap: 12,
  },
  languageOptionActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b10',
  },
  flagEmoji: {
    fontSize: 24,
  },
  languageText: {
    color: '#94a3b8',
    fontSize: 16,
    flex: 1,
  },
  languageTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  settingRowSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  settingValue: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    margin: 16,
    padding: 14,
    borderRadius: 10,
  },
  syncButtonDisabled: {
    backgroundColor: '#64748b',
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearCacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  clearCacheText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  aboutLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  aboutValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
