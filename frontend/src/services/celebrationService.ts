import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';

let successSound: Audio.Sound | null = null;
let levelUpSound: Audio.Sound | null = null;

export async function playCelebrationSound(type: 'success' | 'levelup' | 'deal' = 'success') {
  try {
    // Vibrate for haptic feedback
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 100, 50, 100]);
    }
    
    // For now, we'll just use vibration since sound files would need to be bundled
    // In production, you'd load actual sound files here
    console.log(`Playing ${type} celebration!`);
  } catch (error) {
    console.error('Error playing celebration:', error);
  }
}

export function triggerConfetti(): void {
  // This will be called to trigger the confetti component
  // The actual confetti is handled by the component
  console.log('Confetti triggered!');
}

export const CELEBRATION_MESSAGES = {
  deal_closed: [
    '🔥 DEAL CLOSED! You\'re on fire!',
    '💰 KA-CHING! Another one in the bag!',
    '🚀 BOOM! That\'s how it\'s done!',
    '⚡ LIGHTNING FAST! Keep crushing it!',
    '🏆 CHAMPION! You\'re unstoppable!',
  ],
  hot_lead: [
    '🌟 HOT LEAD ALERT! Strike while it\'s hot!',
    '🎯 BULLSEYE! This one\'s ready to close!',
    '💎 DIAMOND LEAD! Don\'t let this slip!',
  ],
  level_up: [
    '⬆️ LEVEL UP! You\'re getting stronger!',
    '🎮 NEW LEVEL UNLOCKED! Keep grinding!',
    '🌟 POWER UP! You\'re evolving!',
  ],
  streak: [
    '🔥 STREAK ACTIVATED! You\'re on a roll!',
    '⚡ COMBO! Keep the momentum going!',
    '💪 UNSTOPPABLE! Nothing can stop you now!',
  ],
};

export function getRandomMessage(type: keyof typeof CELEBRATION_MESSAGES): string {
  const messages = CELEBRATION_MESSAGES[type];
  return messages[Math.floor(Math.random() * messages.length)];
}
