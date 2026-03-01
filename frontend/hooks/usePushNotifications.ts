import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Send token to backend
        registerTokenWithBackend(token);
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      console.log('Notification received:', notification);
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      
      // Navigate based on notification type
      if (data?.route) {
        router.push(data.route as any);
      } else if (data?.type === 'new_lead') {
        router.push('/qr-leads');
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return { expoPushToken, notification };
}

async function registerForPushNotifications(): Promise<string | undefined> {
  let token: string | undefined;

  // Check if we're on a physical device (required for push notifications)
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return undefined;
  }

  // Check and request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return undefined;
  }

  // Get the Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'solar-empire', // Your Expo project ID
    });
    token = tokenData.data;
    console.log('Push token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  // Configure notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f59e0b',
    });
  }

  return token;
}

async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/notifications/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        push_token: token,
        device_type: Platform.OS,
      }),
    });
    
    if (response.ok) {
      console.log('Device registered for push notifications');
    }
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
}

// Export a function to send test notification
export async function sendTestNotification(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/notifications/send-test`, {
      method: 'POST',
    });
    return response.ok;
  } catch (error) {
    console.error('Test notification failed:', error);
    return false;
  }
}
