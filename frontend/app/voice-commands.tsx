import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { startRecording, stopRecording, VoiceNote, speak } from '../src/services/voiceService';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const VOICE_COMMANDS = [
  { icon: 'navigate', label: 'Navigate', example: '"Navigate to next appointment"', action: 'navigation' },
  { icon: 'call', label: 'Call', example: '"Call John Smith"', action: 'call' },
  { icon: 'create', label: 'Note', example: '"Add note: customer interested"', action: 'note' },
  { icon: 'calendar', label: 'Schedule', example: '"What\'s my next appointment?"', action: 'schedule' },
  { icon: 'search', label: 'Search', example: '"Find leads in Phoenix"', action: 'search' },
  { icon: 'stats-chart', label: 'Stats', example: '"Show my stats"', action: 'stats' },
];

interface CommandResult {
  understood: boolean;
  action: string;
  response: string;
  data?: any;
}

export default function VoiceCommandScreen() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [response, setResponse] = useState('Tap the microphone to start');
  const [commandHistory, setCommandHistory] = useState<{command: string; response: string; time: Date}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    // Request microphone permission on mount
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed for voice commands.');
      }
    })();
  }, []);

  useEffect(() => {
    if (isListening) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
      
      // Wave animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isListening]);

  const processCommand = async (command: string): Promise<CommandResult> => {
    const lowerCommand = command.toLowerCase();
    
    // Navigation commands
    if (lowerCommand.includes('navigate') || lowerCommand.includes('directions') || lowerCommand.includes('go to')) {
      // Extract address or "next appointment"
      if (lowerCommand.includes('next appointment') || lowerCommand.includes('appointment')) {
        return {
          understood: true,
          action: 'navigate',
          response: '🗺️ Opening navigation to your next appointment at 456 Oak Ave...',
        };
      }
      const address = command.replace(/navigate to|directions to|go to/gi, '').trim();
      if (address) {
        // Open maps
        const url = Platform.select({
          ios: `maps:?q=${encodeURIComponent(address)}`,
          android: `geo:0,0?q=${encodeURIComponent(address)}`,
          default: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
        });
        Linking.openURL(url!);
        return {
          understood: true,
          action: 'navigate',
          response: `🗺️ Opening navigation to ${address}...`,
        };
      }
    }
    
    // Call commands
    if (lowerCommand.includes('call')) {
      const contactName = command.replace(/call/gi, '').trim();
      return {
        understood: true,
        action: 'call',
        response: `📞 Looking up ${contactName || 'contact'}... Ready to dial.`,
        data: { contactName },
      };
    }
    
    // Note commands
    if (lowerCommand.includes('note') || lowerCommand.includes('add note') || lowerCommand.includes('remember')) {
      const noteContent = command.replace(/add note|note|remember/gi, '').replace(/:/g, '').trim();
      // Save note to backend
      try {
        await fetch(`${API_URL}/api/voice/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: noteContent, created_at: new Date().toISOString() }),
        }).catch(() => {});
      } catch {}
      return {
        understood: true,
        action: 'note',
        response: `📝 Note saved: "${noteContent}"`,
        data: { noteContent },
      };
    }
    
    // Schedule/appointment commands
    if (lowerCommand.includes('appointment') || lowerCommand.includes('schedule') || lowerCommand.includes('next')) {
      // Fetch from API
      try {
        const res = await fetch(`${API_URL}/api/appointments?limit=1`);
        const appointments = await res.json();
        if (appointments && appointments.length > 0) {
          const appt = appointments[0];
          const time = new Date(appt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            understood: true,
            action: 'schedule',
            response: `📅 Your next appointment is at ${time} with ${appt.lead_name || 'a customer'} at ${appt.lead_address || 'their location'}.`,
            data: appt,
          };
        }
      } catch {}
      return {
        understood: true,
        action: 'schedule',
        response: '📅 No upcoming appointments found.',
      };
    }
    
    // Search commands
    if (lowerCommand.includes('find') || lowerCommand.includes('search') || lowerCommand.includes('show leads')) {
      const searchTerm = command.replace(/find|search|show leads in|show leads/gi, '').trim();
      return {
        understood: true,
        action: 'search',
        response: `🔍 Searching for leads${searchTerm ? ` in ${searchTerm}` : ''}...`,
        data: { searchTerm },
      };
    }
    
    // Stats commands
    if (lowerCommand.includes('stats') || lowerCommand.includes('performance') || lowerCommand.includes('how am i doing')) {
      try {
        const res = await fetch(`${API_URL}/api/analytics/performance`);
        const stats = await res.json();
        return {
          understood: true,
          action: 'stats',
          response: `📊 You have ${stats.total_leads || 0} leads, ${stats.total_appointments || 0} appointments, and ${stats.total_installations || 0} closed deals.`,
          data: stats,
        };
      } catch {}
      return {
        understood: true,
        action: 'stats',
        response: '📊 Loading your performance stats...',
      };
    }
    
    // Help command
    if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
      return {
        understood: true,
        action: 'help',
        response: '🎤 I can help you navigate, call contacts, add notes, check your schedule, search leads, and show your stats. Try saying one of these commands!',
      };
    }
    
    // Default - not understood
    return {
      understood: false,
      action: 'unknown',
      response: '❓ I didn\'t understand that. Try saying "Help" to see what I can do.',
    };
  };

  const handleMicPress = async () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      setResponse('Processing...');
      
      // Stop recording if active
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch {}
        setRecording(null);
      }
      
      // Simulate voice recognition (in production, use speech-to-text API)
      setTimeout(async () => {
        // Demo commands for now - in production integrate with Whisper API
        const demoCommands = [
          'Navigate to 123 Main Street',
          'Add note: Customer has south-facing roof, very interested',
          'Call Sarah Johnson',
          'What\'s my next appointment?',
          'Show my stats',
          'Find leads in Phoenix',
        ];
        const randomCommand = demoCommands[Math.floor(Math.random() * demoCommands.length)];
        setLastCommand(randomCommand);
        
        const result = await processCommand(randomCommand);
        setResponse(result.response);
        
        // Add to history
        setCommandHistory(prev => [
          { command: randomCommand, response: result.response, time: new Date() },
          ...prev.slice(0, 9),
        ]);
        
        // Speak response
        speak(result.response.replace(/[^\w\s]/gi, ''), { rate: 1.0 });
      }, 1500);
    } else {
      // Start listening
      setIsListening(true);
      setLastCommand('');
      setResponse('Listening...');
      
      // Start recording
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
      } catch (err) {
        console.log('Failed to start recording', err);
      }
      
      // Speak prompt
      speak('How can I help you?', { rate: 1.1 });
    }
  };

  const waveStyle = {
    opacity: waveAnim,
    transform: [{
      scale: waveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2],
      }),
    }],
  };

  return (
    <SafeAreaView style={styles.container} data-testid="voice-commands-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Voice Commands</Text>
          <Text style={styles.subtitle}>Hands-Free Control</Text>
        </View>
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Ionicons name="time" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Response Display */}
          <View style={styles.responseCard}>
            <Text style={styles.responseText}>{response}</Text>
            {lastCommand ? (
              <View style={styles.commandDisplay}>
                <Text style={styles.commandLabel}>You said:</Text>
                <Text style={styles.commandText}>"{lastCommand}"</Text>
              </View>
            ) : null}
          </View>

          {/* Microphone Button */}
          <View style={styles.micContainer}>
            {isListening && (
              <>
                <Animated.View style={[styles.wave, styles.wave1, waveStyle]} />
                <Animated.View style={[styles.wave, styles.wave2, waveStyle]} />
              </>
            )}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isListening && styles.micButtonActive,
                ]}
                onPress={handleMicPress}
                data-testid="mic-button"
              >
                <Ionicons
                  name={isListening ? 'mic' : 'mic-outline'}
                  size={48}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={styles.hint}>
            {isListening ? 'Tap to stop' : 'Tap to speak'}
          </Text>

          {/* Command History */}
          {showHistory && commandHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Recent Commands</Text>
              {commandHistory.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyCommand}>"{item.command}"</Text>
                  <Text style={styles.historyResponse}>{item.response}</Text>
                  <Text style={styles.historyTime}>
                    {item.time.toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Command Examples */}
          <View style={styles.commandsSection}>
            <Text style={styles.sectionTitle}>Try saying:</Text>
            {VOICE_COMMANDS.map((cmd, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.commandItem}
                onPress={() => {
                  setLastCommand(cmd.example.replace(/"/g, ''));
                  processCommand(cmd.example.replace(/"/g, '')).then(result => {
                    setResponse(result.response);
                    speak(result.response.replace(/[^\w\s]/gi, ''), { rate: 1.0 });
                  });
                }}
              >
                <View style={styles.commandIcon}>
                  <Ionicons name={cmd.icon as any} size={20} color="#f59e0b" />
                </View>
                <View style={styles.commandInfo}>
                  <Text style={styles.commandName}>{cmd.label}</Text>
                  <Text style={styles.commandExample}>{cmd.example}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  responseCard: {
    width: '100%',
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    minHeight: 120,
    justifyContent: 'center',
  },
  responseText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 26,
  },
  commandDisplay: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  commandLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  commandText: {
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: 4,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  wave: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  wave1: {
    opacity: 0.3,
  },
  wave2: {
    opacity: 0.2,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#334155',
  },
  micButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  hint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 40,
  },
  commandsSection: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  commandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commandInfo: {
    flex: 1,
  },
  commandName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  commandExample: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
