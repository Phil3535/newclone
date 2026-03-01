import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { startRecording, stopRecording, VoiceNote, speak } from '../src/services/voiceService';

const VOICE_COMMANDS = [
  { icon: 'navigate', label: 'Navigate', example: '"Navigate to next appointment"' },
  { icon: 'call', label: 'Call', example: '"Call John Smith"' },
  { icon: 'create', label: 'Note', example: '"Add note: customer interested"' },
  { icon: 'calendar', label: 'Schedule', example: '"What\'s my next appointment?"' },
];

export default function VoiceCommandScreen() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [response, setResponse] = useState('Tap the microphone to start');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

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

  const handleMicPress = async () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      setResponse('Processing...');
      
      // Simulate voice recognition result
      setTimeout(() => {
        const commands = [
          'Navigate to 123 Main Street',
          'Add note: Customer has south-facing roof',
          'Call Sarah Johnson',
          'What\'s my next appointment?',
        ];
        const randomCommand = commands[Math.floor(Math.random() * commands.length)];
        setLastCommand(randomCommand);
        processCommand(randomCommand);
      }, 1500);
    } else {
      // Start listening
      setIsListening(true);
      setLastCommand('');
      setResponse('Listening...');
      
      // Speak prompt
      speak('How can I help you?', { rate: 1.1 });
    }
  };

  const processCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('navigate')) {
      setResponse('🗺️ Opening navigation to the address...');
      speak('Opening navigation');
    } else if (lowerCommand.includes('call')) {
      setResponse('📞 Calling the contact...');
      speak('Placing call');
    } else if (lowerCommand.includes('note')) {
      setResponse('📝 Note saved successfully!');
      speak('Note saved');
    } else if (lowerCommand.includes('appointment') || lowerCommand.includes('next')) {
      setResponse('📅 Your next appointment is at 2:30 PM with John Smith at 456 Oak Ave');
      speak('Your next appointment is at 2:30 PM with John Smith');
    } else {
      setResponse('❓ I didn\'t understand that. Please try again.');
      speak('I didn\'t understand. Please try again.');
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Voice Commands</Text>
          <Text style={styles.subtitle}>Hands-Free Control</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

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

        {/* Command Examples */}
        <View style={styles.commandsSection}>
          <Text style={styles.sectionTitle}>Try saying:</Text>
          {VOICE_COMMANDS.map((cmd, index) => (
            <View key={index} style={styles.commandItem}>
              <View style={styles.commandIcon}>
                <Ionicons name={cmd.icon as any} size={20} color="#f59e0b" />
              </View>
              <View style={styles.commandInfo}>
                <Text style={styles.commandName}>{cmd.label}</Text>
                <Text style={styles.commandExample}>{cmd.example}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
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
