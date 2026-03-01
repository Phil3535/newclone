import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let recording: Audio.Recording | null = null;
let isRecording = false;

export interface VoiceNote {
  id: string;
  uri: string;
  duration: number;
  createdAt: string;
  transcript?: string;
}

// Text-to-Speech for voice feedback
export async function speak(text: string, options?: { rate?: number; pitch?: number }) {
  try {
    await Speech.speak(text, {
      rate: options?.rate || 1.0,
      pitch: options?.pitch || 1.0,
      language: 'en-US',
    });
  } catch (error) {
    console.error('Speech error:', error);
  }
}

export function stopSpeaking() {
  Speech.stop();
}

// Voice Recording for voice notes
export async function startRecording(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      console.log('Recording not supported on web');
      return false;
    }
    
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      console.log('Recording permission not granted');
      return false;
    }
    
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    
    recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    isRecording = true;
    
    return true;
  } catch (error) {
    console.error('Start recording error:', error);
    return false;
  }
}

export async function stopRecording(): Promise<VoiceNote | null> {
  try {
    if (!recording || !isRecording) return null;
    
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();
    
    isRecording = false;
    
    if (!uri) return null;
    
    const voiceNote: VoiceNote = {
      id: Date.now().toString(),
      uri,
      duration: status.durationMillis || 0,
      createdAt: new Date().toISOString(),
    };
    
    recording = null;
    return voiceNote;
  } catch (error) {
    console.error('Stop recording error:', error);
    return null;
  }
}

export function getIsRecording(): boolean {
  return isRecording;
}

// Play back a voice note
export async function playVoiceNote(uri: string): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
  } catch (error) {
    console.error('Playback error:', error);
  }
}

// Voice command keywords
export const VOICE_COMMANDS = {
  navigate: ['navigate', 'directions', 'take me', 'go to'],
  call: ['call', 'phone', 'dial'],
  note: ['note', 'add note', 'record'],
  next: ['next appointment', 'next meeting', 'what\'s next'],
  schedule: ['schedule', 'book', 'appointment'],
};

export function parseVoiceCommand(text: string): { command: string; params: string } | null {
  const lowerText = text.toLowerCase();
  
  for (const [command, keywords] of Object.entries(VOICE_COMMANDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        const params = lowerText.replace(keyword, '').trim();
        return { command, params };
      }
    }
  }
  
  return null;
}
