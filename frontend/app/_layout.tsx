import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { requestNotificationPermissions, addNotificationResponseListener } from '../src/services/notifications';
import { initializeOfflineService, startNetworkListener } from '../src/services/offline';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LegalAgreementScreen from './legal-agreement';
import { View, ActivityIndicator, Platform, Text, TouchableOpacity, StyleSheet } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Development mode bypass for legal agreement screen
// Set to true to skip legal agreement in preview/development
// eslint-disable-next-line no-undef
const DEV_SKIP_LEGAL = typeof __DEV__ !== 'undefined' && __DEV__ || process.env.EXPO_PUBLIC_SKIP_LEGAL === 'true';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <View style={errorStyles.iconContainer}>
            <Text style={errorStyles.icon}>!</Text>
          </View>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>{this.state.error?.message || 'Unknown error'}</Text>
          <TouchableOpacity 
            style={errorStyles.retryButton} 
            onPress={() => {
              this.setState({ hasError: false, error: null });
              this.props.onRetry();
            }}
          >
            <Text style={errorStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

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

      // Try to get acceptance from storage, but handle failures gracefully
      let acceptance = null;
      try {
        acceptance = await AsyncStorage.getItem('legal_agreements_accepted');
      } catch (storageError) {
        console.warn('AsyncStorage read failed, showing legal agreement:', storageError);
        // If storage fails, show the agreement screen
        setShowLegalAgreement(true);
        setCheckingLegal(false);
        return;
      }
      
      if (!acceptance) {
        setShowLegalAgreement(true);
        setCheckingLegal(false);
        return;
      }

      // Check with backend if version has changed and re-acceptance is needed
      try {
        const acceptanceData = JSON.parse(acceptance);
        const userId = '301b2e32-f221-48df-a8c1-bfae3a76c4c6'; // Demo user ID
        
        const response = await fetch(`${API_URL}/api/legal/status/${userId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const status = await response.json();
          if (status.needs_reaccept) {
            // Clear local storage and show legal screen again
            try {
              await AsyncStorage.removeItem('legal_agreements_accepted');
            } catch (e) {
              console.warn('Failed to clear storage:', e);
            }
            setShowLegalAgreement(true);
            setIsReaccept(true);
          }
        }
        // If API fails or returns not OK, just continue - don't block
      } catch (apiError) {
        // If API fails, use local storage check as fallback - don't block the app
        console.log('API check failed, using local storage:', apiError);
      }
    } catch (error) {
      console.error('Error checking legal acceptance:', error);
      // On any error, show the legal agreement to be safe
      setShowLegalAgreement(true);
    } finally {
      setCheckingLegal(false);
    }
  };

  const handleLegalAccept = () => {
    console.log('Legal agreements accepted, transitioning to main app...');
    // Force the state changes to happen immediately and synchronously
    setShowLegalAgreement(false);
    setIsReaccept(false);
    // Log to confirm state change
    console.log('State updated: showLegalAgreement = false');
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
    return (
      <ErrorBoundary onRetry={() => {
        setShowLegalAgreement(false);
        setCheckingLegal(true);
        checkLegalAcceptance();
      }}>
        <LegalAgreementScreen onAccept={handleLegalAccept} isReaccept={isReaccept} />
      </ErrorBoundary>
    );
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
