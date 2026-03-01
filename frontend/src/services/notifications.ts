import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'appointment_reminder' | 'lead_alert' | 'performance_update';
  title: string;
  body: string;
  data?: any;
}

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Solar Empire Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f59e0b',
      });

      await Notifications.setNotificationChannelAsync('appointments', {
        name: 'Appointment Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22c55e',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

// Schedule an appointment reminder
export async function scheduleAppointmentReminder(
  appointmentId: string,
  leadName: string,
  address: string,
  scheduledTime: Date,
  reminderMinutesBefore: number = 30
): Promise<string | null> {
  try {
    const triggerTime = new Date(scheduledTime.getTime() - reminderMinutesBefore * 60 * 1000);
    
    // Don't schedule if the reminder time has passed
    if (triggerTime <= new Date()) {
      console.log('Reminder time has already passed');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Appointment Reminder',
        body: `You have an appointment with ${leadName} at ${address} in ${reminderMinutesBefore} minutes`,
        data: {
          type: 'appointment_reminder',
          appointmentId,
          leadName,
          address,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });

    // Store the notification ID for later cancellation
    const storedReminders = await AsyncStorage.getItem('appointmentReminders');
    const reminders = storedReminders ? JSON.parse(storedReminders) : {};
    reminders[appointmentId] = notificationId;
    await AsyncStorage.setItem('appointmentReminders', JSON.stringify(reminders));

    console.log(`Scheduled reminder for ${leadName} at ${triggerTime}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling appointment reminder:', error);
    return null;
  }
}

// Cancel an appointment reminder
export async function cancelAppointmentReminder(appointmentId: string): Promise<void> {
  try {
    const storedReminders = await AsyncStorage.getItem('appointmentReminders');
    if (storedReminders) {
      const reminders = JSON.parse(storedReminders);
      if (reminders[appointmentId]) {
        await Notifications.cancelScheduledNotificationAsync(reminders[appointmentId]);
        delete reminders[appointmentId];
        await AsyncStorage.setItem('appointmentReminders', JSON.stringify(reminders));
        console.log(`Cancelled reminder for appointment ${appointmentId}`);
      }
    }
  } catch (error) {
    console.error('Error cancelling appointment reminder:', error);
  }
}

// Send immediate notification for hot lead
export async function sendHotLeadAlert(
  leadName: string,
  score: number,
  territory: string
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Hot Lead Alert!',
        body: `${leadName} scored ${score}/100 in ${territory}. High probability to close!`,
        data: {
          type: 'lead_alert',
          leadName,
          score,
          territory,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immediate notification
    });
  } catch (error) {
    console.error('Error sending hot lead alert:', error);
  }
}

// Send performance milestone notification
export async function sendPerformanceUpdate(
  milestone: string,
  value: string
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏆 Achievement Unlocked!',
        body: `${milestone}: ${value}`,
        data: {
          type: 'performance_update',
          milestone,
          value,
        },
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Error sending performance update:', error);
  }
}

// Get all scheduled notifications
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem('appointmentReminders');
}

// Add notification response listener
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Add notification received listener
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

// Send team chat message notification
export async function sendTeamChatNotification(
  senderName: string,
  message: string,
  chatId?: string
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 ${senderName}`,
        body: message.length > 100 ? message.substring(0, 100) + '...' : message,
        data: {
          type: 'team_chat',
          senderName,
          chatId,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immediate notification
    });
  } catch (error) {
    console.error('Error sending team chat notification:', error);
  }
}

// Configure team chat notification channel (Android)
export async function setupTeamChatChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('team_chat', {
      name: 'Team Chat',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#ec4899',
      sound: 'default',
    });
  }
}
