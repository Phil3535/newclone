import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Testimonial {
  id: string;
  customer_name: string;
  location: string;
  system_size: string;
  rating: number;
  review: string;
  savings_amount?: number;
  image_url?: string;
  verified: boolean;
  created_at: string;
}

export default function TestimonialsScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const response = await fetch(`${API_URL}/api/testimonials/`);
      const data = await response.json();
      setTestimonials(data);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate average rating
  const avgRating = testimonials.length > 0 
    ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1)
    : '5.0';
  
  const avgSavings = testimonials.length > 0
    ? Math.round(testimonials.reduce((sum, t) => sum + (t.savings_amount || 0), 0) / testimonials.length)
    : 2800;

  const renderStars = (rating: number) => {
    return (
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name="star"
            size={14}
            color={star <= rating ? '#fbbf24' : '#1e3a5f'}
          />
        ))}
      </View>
    );
  };

  const renderTestimonial = ({ item }: { item: Testimonial }) => {
    const isExpanded = expandedId === item.id;
    const hasVideo = item.image_url ? true : false;
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const savingsPerYear = item.savings_amount ? `$${item.savings_amount.toLocaleString()}/year` : 'Significant savings';

    return (
      <TouchableOpacity
        style={styles.testimonialCard}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.8}
        data-testid={`testimonial-card-${item.id}`}
      >
        {item.verified && (
          <View style={styles.videoBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#ffffff" />
            <Text style={styles.videoBadgeText}>VERIFIED</Text>
          </View>
        )}

        <View style={styles.testimonialHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.customer_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </Text>
            </View>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color="#64748b" />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
            {renderStars(item.rating)}
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </View>

        <Text style={styles.quoteText} numberOfLines={isExpanded ? undefined : 3}>
          "{item.review}"
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="sunny" size={16} color="#f59e0b" />
            <Text style={styles.statText}>{item.system_size}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="trending-up" size={16} color="#22c55e" />
            <Text style={[styles.statText, { color: '#22c55e' }]}>{savingsPerYear}</Text>
          </View>
        </View>

        {hasVideo && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => Linking.openURL('https://youtube.com')}
          >
            <Ionicons name="play-circle" size={20} color="#ffffff" />
            <Text style={styles.playButtonText}>Watch Video Testimonial</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Customer Stories</Text>
          <Text style={styles.subtitle}>{testimonials.length} Happy Customers</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading testimonials...</Text>
        </View>
      ) : (
        <>
          {/* Rating Summary */}
          <View style={styles.ratingSummary}>
            <View style={styles.ratingBig}>
              <Text style={styles.ratingNumber}>{avgRating}</Text>
              <View style={styles.starsLarge}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={20} color="#fbbf24" />
                ))}
              </View>
              <Text style={styles.ratingLabel}>{testimonials.length} Reviews</Text>
            </View>
            <View style={styles.ratingSeparator} />
            <View style={styles.ratingStats}>
              <View style={styles.ratingStatRow}>
                <Text style={styles.ratingStatLabel}>Would recommend</Text>
                <Text style={styles.ratingStatValue}>100%</Text>
              </View>
              <View style={styles.ratingStatRow}>
                <Text style={styles.ratingStatLabel}>Avg. savings</Text>
                <Text style={styles.ratingStatValue}>${avgSavings.toLocaleString()}/yr</Text>
              </View>
            </View>
          </View>

          {/* Testimonials List */}
          <FlatList
            data={testimonials}
            renderItem={renderTestimonial}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    padding: 20,
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
  ratingSummary: {
    flexDirection: 'row',
    backgroundColor: '#0f1a2e',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  ratingBig: {
    flex: 1,
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
  },
  starsLarge: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  ratingSeparator: {
    width: 1,
    backgroundColor: '#1e3a5f',
    marginHorizontal: 16,
  },
  ratingStats: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingStatLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  ratingStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  testimonialsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  testimonialCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    position: 'relative',
  },
  videoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  videoBadgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '700',
  },
  testimonialHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    gap: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#64748b',
  },
  stars: {
    flexDirection: 'row',
    marginTop: 2,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
  },
  quoteText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  playButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
