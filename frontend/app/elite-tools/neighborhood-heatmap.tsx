import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://elite-solar-rep.preview.emergentagent.com';

interface Installation {
  latitude: number;
  longitude: number;
  system_size_kw: number;
  install_date: string;
  distance_miles: number;
  is_our_customer: boolean;
}

interface HeatmapData {
  center: { latitude: number; longitude: number; zip_code: string };
  radius_miles: number;
  installations: Installation[];
  stats: {
    total_installations: number;
    our_installations: number;
    competitor_installations: number;
    market_share_percent: number;
    total_kw_installed: number;
    average_system_size_kw: number;
  };
  sales_pitch: {
    talking_points: string[];
    nearest_installation: {
      distance_miles: number;
      system_size_kw: number;
      pitch: string;
    } | null;
  };
  heatmap_intensity: string;
}

export default function NeighborhoodHeatmapScreen() {
  const router = useRouter();
  const [zipCode, setZipCode] = useState('90210');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HeatmapData | null>(null);

  const fetchHeatmap = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/intelligence/heatmap/installations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: 34.0901,
          longitude: -118.4065,
          radius_miles: 3.0,
          zip_code: zipCode,
        }),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch heatmap data');
    } finally {
      setLoading(false);
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f97316';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  const openMapsLocation = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          data-testid="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerBadge}>
          <Ionicons name="map" size={16} color="#22c55e" />
          <Text style={styles.headerBadgeText}>INTELLIGENCE</Text>
        </View>
        <Text style={styles.headerTitle}>Neighborhood Heatmap</Text>
        <Text style={styles.headerSubtitle}>See solar installations in your territory</Text>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="location" size={20} color="#64748b" />
          <TextInput
            style={styles.input}
            placeholder="Enter ZIP Code"
            placeholderTextColor="#64748b"
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="number-pad"
            data-testid="zip-input"
          />
        </View>
        
        <TouchableOpacity
          style={styles.searchButton}
          onPress={fetchHeatmap}
          disabled={loading}
          data-testid="search-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.searchButtonText}>Scan Area</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {data && (
        <>
          {/* Intensity Indicator */}
          <View style={[styles.intensityCard, { borderLeftColor: getIntensityColor(data.heatmap_intensity) }]}>
            <View style={styles.intensityHeader}>
              <Ionicons name="flame" size={24} color={getIntensityColor(data.heatmap_intensity)} />
              <Text style={styles.intensityText}>
                {data.heatmap_intensity.toUpperCase()} Solar Activity
              </Text>
            </View>
            <Text style={styles.intensitySubtext}>
              {data.stats.total_installations} installations within {data.radius_miles} miles
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data.stats.total_installations}</Text>
              <Text style={styles.statLabel}>Total Installs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>{data.stats.our_installations}</Text>
              <Text style={styles.statLabel}>Our Customers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#f97316' }]}>{data.stats.competitor_installations}</Text>
              <Text style={styles.statLabel}>Competitors</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#3b82f6' }]}>{data.stats.market_share_percent}%</Text>
              <Text style={styles.statLabel}>Market Share</Text>
            </View>
          </View>

          {/* Sales Pitch */}
          <View style={styles.pitchContainer}>
            <Text style={styles.sectionTitle}>Sales Talking Points</Text>
            
            {data.sales_pitch.talking_points.map((point, index) => (
              <View key={index} style={styles.talkingPoint}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.talkingPointText}>{point}</Text>
              </View>
            ))}

            {data.sales_pitch.nearest_installation && (
              <View style={styles.pitchCard}>
                <Ionicons name="megaphone" size={24} color="#fbbf24" />
                <View style={styles.pitchContent}>
                  <Text style={styles.pitchTitle}>Perfect Pitch</Text>
                  <Text style={styles.pitchText}>{data.sales_pitch.nearest_installation.pitch}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Installation List */}
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Nearby Installations</Text>
            
            {data.installations.slice(0, 10).map((install, index) => (
              <TouchableOpacity
                key={index}
                style={styles.installCard}
                onPress={() => openMapsLocation(install.latitude, install.longitude)}
                data-testid={`installation-${index}`}
              >
                <View style={[
                  styles.installBadge,
                  { backgroundColor: install.is_our_customer ? '#22c55e' : '#f97316' }
                ]}>
                  <Ionicons 
                    name={install.is_our_customer ? 'checkmark' : 'close'} 
                    size={14} 
                    color="#fff" 
                  />
                </View>
                
                <View style={styles.installContent}>
                  <Text style={styles.installSize}>{install.system_size_kw} kW System</Text>
                  <Text style={styles.installMeta}>
                    {install.distance_miles} mi away • {install.install_date}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.mapButton}
                  onPress={() => openMapsLocation(install.latitude, install.longitude)}
                >
                  <Ionicons name="navigate" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>

          {/* System Stats */}
          <View style={styles.systemStats}>
            <Text style={styles.sectionTitle}>Market Analysis</Text>
            
            <View style={styles.analysisRow}>
              <View style={styles.analysisItem}>
                <Ionicons name="flash" size={24} color="#fbbf24" />
                <Text style={styles.analysisValue}>{data.stats.total_kw_installed} kW</Text>
                <Text style={styles.analysisLabel}>Total Capacity</Text>
              </View>
              <View style={styles.analysisItem}>
                <Ionicons name="resize" size={24} color="#3b82f6" />
                <Text style={styles.analysisValue}>{data.stats.average_system_size_kw} kW</Text>
                <Text style={styles.analysisLabel}>Avg System</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {!data && !loading && (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={64} color="#64748b" />
          <Text style={styles.emptyTitle}>Enter a ZIP Code</Text>
          <Text style={styles.emptyText}>
            See solar installations in any neighborhood to power your sales pitch
          </Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 30,
  },
  headerBadgeText: {
    color: '#22c55e',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
    marginLeft: 12,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  intensityCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
  },
  intensityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  intensityText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
  },
  intensitySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginLeft: 36,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  pitchContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  talkingPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  talkingPointText: {
    fontSize: 14,
    color: '#e2e8f0',
    marginLeft: 12,
    flex: 1,
  },
  pitchCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  pitchContent: {
    flex: 1,
    marginLeft: 12,
  },
  pitchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 4,
  },
  pitchText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 22,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  installCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  installBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  installContent: {
    flex: 1,
    marginLeft: 14,
  },
  installSize: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  installMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  mapButton: {
    padding: 8,
  },
  systemStats: {
    padding: 20,
    paddingTop: 0,
  },
  analysisRow: {
    flexDirection: 'row',
    gap: 12,
  },
  analysisItem: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  analysisValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  analysisLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
});
