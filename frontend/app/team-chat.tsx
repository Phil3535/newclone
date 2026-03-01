import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendTeamChatNotification, setupTeamChatChannel, requestNotificationPermissions } from '../src/services/notifications';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
  isMe?: boolean;
  reactions?: { emoji: string; users: string[] }[];
  mentions?: string[];
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

const AVAILABLE_REACTIONS = ['👍', '❤️', '🔥', '🎉', '👏', '💪'];

export default function TeamChatScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = '1'; // Current logged-in user

  // Fetch team members and messages on mount
  useEffect(() => {
    fetchTeamMembers();
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const pollInterval = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chat/team-members`);
      const data = await response.json();
      setTeamMembers(data);
      setOnlineCount(data.length);
    } catch (error) {
      console.error('Error fetching team members:', error);
      // Fallback to default members
      setTeamMembers([
        { id: '1', name: 'Alex Johnson', avatar: 'AJ', color: '#f59e0b' },
        { id: '2', name: 'Sarah Miller', avatar: 'SM', color: '#3b82f6' },
        { id: '3', name: 'Mike Davis', avatar: 'MD', color: '#22c55e' },
        { id: '4', name: 'Emily Brown', avatar: 'EB', color: '#8b5cf6' },
      ]);
      setOnlineCount(4);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chat/messages?limit=50`);
      const data = await response.json();
      const formattedMessages = data.map((msg: any) => ({
        ...msg,
        isMe: msg.user_id === currentUserId,
      }));
      setMessages(formattedMessages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  // Add or toggle reaction on a message
  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      // Optimistic update
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        
        const currentReactions = msg.reactions || [];
        const existingReaction = currentReactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {
          if (existingReaction.users.includes(currentUserId)) {
            const newUsers = existingReaction.users.filter(u => u !== currentUserId);
            if (newUsers.length === 0) {
              return { ...msg, reactions: currentReactions.filter(r => r.emoji !== emoji) };
            }
            return { ...msg, reactions: currentReactions.map(r => r.emoji === emoji ? { ...r, users: newUsers } : r) };
          } else {
            return { ...msg, reactions: currentReactions.map(r => r.emoji === emoji ? { ...r, users: [...r.users, currentUserId] } : r) };
          }
        } else {
          return { ...msg, reactions: [...currentReactions, { emoji, users: [currentUserId] }] };
        }
      }));
      
      // API call
      await fetch(`${API_URL}/api/chat/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, user_id: currentUserId }),
      });
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
    setShowReactionPicker(null);
  };

  // Check for @ symbol to trigger mention picker
  const handleTextChange = (text: string) => {
    setInputText(text);
    
    // Find if we're typing a mention
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.substring(lastAtIndex + 1);
      // Check if there's no space after @ (still typing the mention)
      if (!textAfterAt.includes(' ')) {
        setMentionFilter(textAfterAt.toLowerCase());
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
    setMentionFilter('');
  };

  // Get filtered team members for mention picker
  const getFilteredMembers = () => {
    // Don't show current user in mention list
    return teamMembers.filter(m => 
      m.id !== currentUserId && // Exclude self
      m.name.toLowerCase().includes(mentionFilter)
    );
  };

  // Insert mention into text
  const insertMention = (member: TeamMember) => {
    const lastAtIndex = inputText.lastIndexOf('@');
    const textBefore = inputText.substring(0, lastAtIndex);
    const newText = `${textBefore}@${member.name} `;
    setInputText(newText);
    setShowMentionPicker(false);
    setMentionFilter('');
    inputRef.current?.focus();
  };

  // Extract mentioned user IDs from text
  const extractMentions = (text: string): string[] => {
    const mentions: string[] = [];
    teamMembers.forEach(member => {
      if (text.includes(`@${member.name}`)) {
        mentions.push(member.id);
      }
    });
    return mentions;
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const mentions = extractMentions(inputText);
    const currentUser = teamMembers.find(m => m.id === currentUserId) || { name: 'Alex Johnson' };
    
    try {
      // Send to API
      const response = await fetch(`${API_URL}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          user_name: currentUser.name,
          text: inputText.trim(),
          mentions: mentions,
        }),
      });
      
      const newMessage = await response.json();
      newMessage.isMe = true;
      
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Send notifications to mentioned users
      if (mentions.length > 0 && notificationsEnabled) {
        mentions.forEach(mentionedId => {
          const mentionedUser = teamMembers.find(m => m.id === mentionedId);
          if (mentionedUser) {
            sendTeamChatNotification(currentUser.name, `mentioned you: "${inputText.substring(0, 50)}${inputText.length > 50 ? '...' : ''}"`);
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await setupTeamChatChannel();
        const teamChatPref = await AsyncStorage.getItem('teamChatNotifications');
        setNotificationsEnabled(teamChatPref !== 'false');
      }
    };
    initNotifications();

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getMemberColor = (userId: string) => {
    return teamMembers.find(m => m.id === userId)?.color || '#64748b';
  };

  // Render text with highlighted mentions
  const renderMessageText = (text: string, isMe: boolean) => {
    // Find all @mentions in the text
    const mentionRegex = /@(\w+\s\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={[styles.messageText, isMe && styles.messageTextMe]}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }
      // Add the highlighted mention
      parts.push(
        <Text key={`mention-${match.index}`} style={styles.mentionHighlight}>
          @{match[1]}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text key={`text-${lastIndex}`} style={[styles.messageText, isMe && styles.messageTextMe]}>
          {text.substring(lastIndex)}
        </Text>
      );
    }

    return parts.length > 0 ? parts : (
      <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{text}</Text>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const showAvatar = index === 0 || messages[index - 1].user_id !== item.user_id;
    const memberColor = getMemberColor(item.user_id);
    const isMentionedMessage = item.mentions?.includes(currentUserId);
    const isReactionPickerOpen = showReactionPicker === item.id;

    return (
      <View style={[styles.messageRow, item.isMe && styles.messageRowMe]}>
        {!item.isMe && showAvatar && (
          <View style={[styles.avatar, { backgroundColor: memberColor }]}>
            <Text style={styles.avatarText}>
              {item.user_name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        )}
        {!item.isMe && !showAvatar && <View style={styles.avatarPlaceholder} />}
        <View style={styles.messageContainer}>
          <TouchableOpacity
            onLongPress={() => setShowReactionPicker(isReactionPickerOpen ? null : item.id)}
            activeOpacity={0.8}
            style={[
              styles.messageBubble,
              item.isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
              isMentionedMessage && !item.isMe && styles.messageBubbleMentioned,
            ]}
          >
            {!item.isMe && showAvatar && (
              <Text style={[styles.senderName, { color: memberColor }]}>{item.user_name}</Text>
            )}
            <Text style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {renderMessageText(item.text, item.isMe || false)}
            </Text>
            <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
          </TouchableOpacity>
          
          {/* Reactions Display */}
          {item.reactions && item.reactions.length > 0 && (
            <View style={[styles.reactions, item.isMe && styles.reactionsMe]}>
              {item.reactions.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.reactionBadge,
                    r.users.includes(currentUserId) && styles.reactionBadgeActive
                  ]}
                  onPress={() => toggleReaction(item.id, r.emoji)}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  <Text style={styles.reactionCount}>{r.users.length}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addReactionButton}
                onPress={() => setShowReactionPicker(isReactionPickerOpen ? null : item.id)}
              >
                <Ionicons name="add" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Reaction Picker */}
          {isReactionPickerOpen && (
            <View style={[styles.reactionPicker, item.isMe && styles.reactionPickerMe]}>
              {AVAILABLE_REACTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionOption}
                  onPress={() => toggleReaction(item.id, emoji)}
                >
                  <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Team Chat</Text>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{onlineCount} online</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.membersButton}>
          <Ionicons name="people" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <View style={styles.typingIndicator}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
          <Text style={styles.typingText}>
            {typingUsers.length === 1 
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`
            }
          </Text>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Mention Picker */}
        {showMentionPicker && getFilteredMembers().length > 0 && (
          <View style={styles.mentionPicker}>
            <Text style={styles.mentionPickerTitle}>Mention someone</Text>
            {getFilteredMembers().map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.mentionItem}
                onPress={() => insertMention(member)}
              >
                <View style={[styles.mentionAvatar, { backgroundColor: member.color }]}>
                  <Text style={styles.mentionAvatarText}>{member.avatar}</Text>
                </View>
                <Text style={styles.mentionName}>{member.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle" size={28} color="#64748b" />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Message your team... (type @ to mention)"
            placeholderTextColor="#64748b"
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    color: '#22c55e',
  },
  membersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleOther: {
    backgroundColor: '#0f1a2e',
    borderBottomLeftRadius: 4,
  },
  messageBubbleMe: {
    backgroundColor: '#f59e0b',
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    gap: 8,
  },
  attachButton: {
    paddingBottom: 6,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  // Mention Picker Styles
  mentionPicker: {
    backgroundColor: '#0f1a2e',
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mentionPickerTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    marginBottom: 6,
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mentionAvatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  mentionName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Mention Highlight in Messages
  mentionHighlight: {
    color: '#3b82f6',
    fontWeight: '600',
    backgroundColor: '#3b82f620',
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  messageBubbleMentioned: {
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    backgroundColor: '#3b82f610',
  },
  // Message Container for reactions positioning
  messageContainer: {
    flexDirection: 'column',
    maxWidth: '75%',
  },
  // Reaction Styles
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionsMe: {
    justifyContent: 'flex-end',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  reactionBadgeActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b20',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  addReactionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2d4a6f',
  },
  // Reaction Picker
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    padding: 8,
    marginTop: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignSelf: 'flex-start',
  },
  reactionPickerMe: {
    alignSelf: 'flex-end',
  },
  reactionOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionOptionEmoji: {
    fontSize: 20,
  },
  // Typing Indicator Styles
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0a1929',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 3,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748b',
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  typingText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
});
