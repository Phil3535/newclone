import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { requestNotificationPermissions, addNotificationResponseListener } from '../src/services/notifications';
import { initializeOfflineService, startNetworkListener } from '../src/services/offline';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LegalAgreementScreen from './legal-agreement';
import { View, ActivityIndicator, Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Development mode bypass for legal agreement screen
// Set to true to skip legal agreement in preview/development
// eslint-disable-next-line no-undef
const DEV_SKIP_LEGAL = typeof __DEV__ !== 'undefined' && __DEV__ || process.env.EXPO_PUBLIC_SKIP_LEGAL === 'true';

function RootLayoutContent() {
  const router = useRouter();
  const [checkingLegal, setCheckingLegal] = useState(true);
  const [showLegalAgreement, setShowLegalAgreement] = useState(false);
  const [isReaccept, setIsReaccept] = useState(false);

  useEffect(() => {
    // Check if user has accepted legal agreements
    checkLegalAcceptance();
    
    // Request notification permissions on app start
    requestNotificationPermissions();

    // Initialize offline service
    initializeOfflineService();

    // Handle notification taps
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'appointment_reminder') {
        router.push('/calendar');
      } else if (data?.type === 'lead_alert') {
        router.push('/leads');
      }
    });

    return () => subscription.remove();
  }, [router]);

  const checkLegalAcceptance = async () => {
    try {
      // Development bypass - skip legal agreement check
      if (DEV_SKIP_LEGAL) {
        console.log('DEV MODE: Skipping legal agreement check');
        setCheckingLegal(false);
        return;
      }

      const acceptance = await AsyncStorage.getItem('legal_agreements_accepted');
      if (!acceptance) {
        setShowLegalAgreement(true);
        setCheckingLegal(false);
        return;
      }

      // Check with backend if version has changed and re-acceptance is needed
      const acceptanceData = JSON.parse(acceptance);
      const userId = '301b2e32-f221-48df-a8c1-bfae3a76c4c6'; // Demo user ID
      
      try {
        const response = await fetch(`${API_URL}/api/legal/status/${userId}`);
        const status = await response.json();
        
        if (status.needs_reaccept) {
          // Clear local storage and show legal screen again
          await AsyncStorage.removeItem('legal_agreements_accepted');
          setShowLegalAgreement(true);
          setIsReaccept(true);
        }
      } catch (apiError) {
        // If API fails, use local storage check as fallback
        console.log('API check failed, using local storage');
      }
    } catch (error) {
      console.error('Error checking legal acceptance:', error);
    } finally {
      setCheckingLegal(false);
    }
  };

  const handleLegalAccept = () => {
    setShowLegalAgreement(false);
    setIsReaccept(false);
  };

  // Show loading while checking legal status
  if (checkingLegal) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  // Show legal agreement if not accepted or re-acceptance needed (unless dev bypass is enabled)
  if (showLegalAgreement && !DEV_SKIP_LEGAL) {
    return <LegalAgreementScreen onAccept={handleLegalAccept} isReaccept={isReaccept} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <RootLayoutContent />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
