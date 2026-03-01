import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  thumbnail: string;
  views: number;
  isNew?: boolean;
}

const CATEGORIES = ['All', 'Sales Scripts', 'Objections', 'Products', 'Closing'];

const VIDEOS: Video[] = [
  {
    id: '1',
    title: 'The Perfect Door Pitch',
    description: 'Master the 30-second pitch that gets you inside',
    duration: '8:24',
    category: 'Sales Scripts',
    thumbnail: '🏠',
    views: 1250,
    isNew: true,
  },
  {
    id: '2',
    title: 'Handling "Too Expensive"',
    description: 'Turn price objections into closing opportunities',
    duration: '12:15',
    category: 'Objections',
    thumbnail: '💰',
    views: 2100,
  },
  {
    id: '3',
    title: 'Solar 101: Panel Technology',
    description: 'Everything you need to know about panel specs',
    duration: '15:30',
    category: 'Products',
    thumbnail: '☀️',
    views: 890,
  },
  {
    id: '4',
    title: 'The Assumptive Close',
    description: 'Close deals without being pushy',
    duration: '10:45',
    category: 'Closing',
    thumbnail: '✍️',
    views: 1800,
  },
  {
    id: '5',
    title: '"I Need to Talk to My Spouse"',
    description: 'Handle this common objection like a pro',
    duration: '7:30',
    category: 'Objections',
    thumbnail: '👥',
    views: 1650,
  },
  {
    id: '6',
    title: 'Battery Backup Systems',
    description: 'Sell battery storage with confidence',
    duration: '18:20',
    category: 'Products',
    thumbnail: '🔋',
    views: 720,
    isNew: true,
  },
  {
    id: '7',
    title: 'The Follow-Up Formula',
    description: 'Turn "maybe" into "yes" with strategic follow-ups',
    duration: '11:00',
    category: 'Sales Scripts',
    thumbnail: '📞',
    views: 1420,
  },
  {
    id: '8',
    title: 'Urgency Without Pressure',
    description: 'Create urgency ethically and effectively',
    duration: '9:15',
    category: 'Closing',
    thumbnail: '⏰',
    views: 980,
  },
];

export default function TrainingVideosScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredVideos = selectedCategory === 'All'
    ? VIDEOS
    : VIDEOS.filter(v => v.category === selectedCategory);

  const handlePlayVideo = (video: Video) => {
    // In production, this would open a video player or external link
    Linking.openURL('https://youtube.com');
  };

  const renderVideo = ({ item }: { item: Video }) => (
    <TouchableOpacity style={styles.videoCard} onPress={() => handlePlayVideo(item)}>
      <View style={styles.thumbnailContainer}>
        <View style={styles.thumbnail}>
          <Text style={styles.thumbnailEmoji}>{item.thumbnail}</Text>
        </View>
        <View style={styles.playOverlay}>
          <Ionicons name="play-circle" size={48} color="#ffffff" />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
        {item.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>NEW</Text>
          </View>
        )}
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{item.title}</Text>
        <Text style={styles.videoDescription}>{item.description}</Text>
        <View style={styles.videoMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <View style={styles.viewsContainer}>
            <Ionicons name="eye-outline" size={12} color="#64748b" />
            <Text style={styles.viewsText}>{item.views.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Training Videos</Text>
          <Text style={styles.subtitle}>{VIDEOS.length} Videos Available</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressInfo}>
          <Ionicons name="school" size={24} color="#f59e0b" />
          <View style={styles.progressText}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <Text style={styles.progressSubtitle}>3 of 8 completed</Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '37.5%' }]} />
          </View>
          <Text style={styles.progressPercent}>37%</Text>
        </View>
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === item && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === item && styles.categoryButtonTextActive,
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Videos List */}
      <FlatList
        data={filteredVideos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.videosList}
        showsVerticalScrollIndicator={false}
      />
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
  progressCard: {
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    marginLeft: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f59e0b',
  },
  categoriesList: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#f59e0b',
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  videosList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  videoCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  thumbnailContainer: {
    position: 'relative',
    height: 160,
  },
  thumbnail: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailEmoji: {
    fontSize: 48,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '700',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  videoDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  categoryBadge: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    fontSize: 12,
    color: '#64748b',
  },
});
