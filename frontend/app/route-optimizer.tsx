import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, isToday, parseISO } from 'date-fns';
import { appointmentsApi } from '../src/services/api';
import { useStore } from '../src/store/useStore';
import { optimizeRoute, formatDistance, formatDuration } from '../src/services/routeOptimizer';
import { getWeatherByAddress } from '../src/services/weatherService';

interface Appointment {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_address: string;
  scheduled_time: string;
  status: string;
}

interface OptimizedStop {
  id: string;
  name: string;
  address: string;
  time?: string;
  weather?: {
    temperature: number;
    condition: string;
    icon: string;
  };
  order: number;
}

export default function RouteOptimizerScreen() {
  const router = useRouter();
  const { currentRepId } = useStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [optimizedStops, setOptimizedStops] = useState<OptimizedStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [routeStats, setRouteStats] = useState<{
    totalDistance: number;
    estimatedTime: number;
    savings: number;
  } | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      const data = await appointmentsApi.getAll();
      // Filter for today's appointments that are scheduled
      const todayAppts = data.filter((appt: Appointment) => {
        try {
          const apptDate = parseISO(appt.scheduled_time);
          return isToday(apptDate) && appt.status === 'scheduled';
        } catch {
          return false;
        }
      });
      setAppointments(todayAppts);
      
      // Set initial stops without optimization
      setOptimizedStops(todayAppts.map((appt: Appointment, index: number) => ({
        id: appt.id,
        name: appt.lead_name,
        address: appt.lead_address,
        time: format(parseISO(appt.scheduled_time), 'h:mm a'),
        order: index + 1,
      })));
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentRepId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const handleOptimize = async () => {
    if (appointments.length < 2) return;
    
    setOptimizing(true);
    try {
      const result = await optimizeRoute(appointments);
      
      // Update stops with optimized order and fetch weather
      const stopsWithWeather: OptimizedStop[] = await Promise.all(
        result.locations.map(async (loc, index) => {
          const appt = appointments.find(a => a.id === loc.id);
          let weather;
          try {
            const weatherData = await getWeatherByAddress(loc.address);
            if (weatherData) {
              weather = {
                temperature: weatherData.temperature,
                condition: weatherData.condition,
                icon: weatherData.icon,
              };
            }
          } catch (e) {
            console.log('Weather fetch failed for:', loc.address);
          }
          
          return {
            id: loc.id,
            name: loc.name,
            address: loc.address,
            time: appt ? format(parseISO(appt.scheduled_time), 'h:mm a') : undefined,
            weather,
            order: index + 1,
          };
        })
      );
      
      setOptimizedStops(stopsWithWeather);
      setRouteStats({
        totalDistance: result.totalDistance,
        estimatedTime: result.estimatedTime,
        savings: result.savings,
      });
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const openNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?daddr=${encodedAddress}`,
      android: `google.navigation:q=${encodedAddress}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
    });
    Linking.openURL(url as string);
  };

  const openFullRoute = () => {
    if (optimizedStops.length === 0) return;
    
    const waypoints = optimizedStops.map(s => encodeURIComponent(s.address)).join('/');
    const url = `https://www.google.com/maps/dir/${waypoints}`;
    Linking.openURL(url);
  };

  const getWeatherIcon = (icon: string) => {
    const iconMap: Record<string, string> = {
      sunny: 'sunny',
      'partly-sunny': 'partly-sunny',
      cloudy: 'cloudy',
      rainy: 'rainy',
      snow: 'snow',
      thunderstorm: 'thunderstorm',
    };
    return (iconMap[icon] || 'cloudy') as keyof typeof Ionicons.glyphMap;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Route Optimizer</Text>
          <Text style={styles.subtitle}>Today's Appointments</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
      >
        {/* Stats Card */}
        {routeStats && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Ionicons name="navigate-circle" size={24} color="#3b82f6" />
              <Text style={styles.statValue}>{formatDistance(routeStats.totalDistance)}</Text>
              <Text style={styles.statLabel}>Total Distance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{formatDuration(routeStats.estimatedTime)}</Text>
              <Text style={styles.statLabel}>Drive Time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="trending-down" size={24} color="#22c55e" />
              <Text style={[styles.statValue, { color: '#22c55e' }]}>{routeStats.savings}%</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
        )}

        {/* Optimize Button */}
        <TouchableOpacity
          style={[styles.optimizeButton, optimizing && styles.optimizeButtonDisabled]}
          onPress={handleOptimize}
          disabled={optimizing || appointments.length < 2}
        >
          {optimizing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#ffffff" />
              <Text style={styles.optimizeButtonText}>
                {appointments.length < 2 ? 'Need 2+ appointments' : 'Optimize Route'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Stops List */}
        <View style={styles.stopsSection}>
          <View style={styles.stopsHeader}>
            <Text style={styles.stopsTitle}>Route Stops ({optimizedStops.length})</Text>
            {routeStats && (
              <TouchableOpacity style={styles.openMapButton} onPress={openFullRoute}>
                <Ionicons name="map" size={16} color="#3b82f6" />
                <Text style={styles.openMapText}>Open in Maps</Text>
              </TouchableOpacity>
            )}
          </View>

          {optimizedStops.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#1e3a5f" />
              <Text style={styles.emptyText}>No appointments scheduled for today</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/calendar')}
              >
                <Text style={styles.emptyButtonText}>Go to Calendar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            optimizedStops.map((stop, index) => (
              <View key={stop.id} style={styles.stopCard}>
                <View style={styles.stopOrder}>
                  <Text style={styles.stopOrderNumber}>{stop.order}</Text>
                </View>
                <View style={styles.stopContent}>
                  <View style={styles.stopMain}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopAddress}>{stop.address}</Text>
                    {stop.time && (
                      <View style={styles.stopMeta}>
                        <Ionicons name="time-outline" size={14} color="#64748b" />
                        <Text style={styles.stopTime}>{stop.time}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.stopActions}>
                    {stop.weather && (
                      <View style={styles.weatherBadge}>
                        <Ionicons
                          name={getWeatherIcon(stop.weather.icon)}
                          size={16}
                          color="#fbbf24"
                        />
                        <Text style={styles.weatherTemp}>{stop.weather.temperature}°</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={() => openNavigation(stop.address)}
                    >
                      <Ionicons name="navigate" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
                {index < optimizedStops.length - 1 && (
                  <View style={styles.connector}>
                    <View style={styles.connectorLine} />
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
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
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1e3a5f',
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  optimizeButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  optimizeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  stopsSection: {
    marginBottom: 16,
  },
  stopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stopsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openMapText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stopCard: {
    position: 'relative',
    marginBottom: 8,
  },
  stopOrder: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stopOrderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  stopContent: {
    flexDirection: 'row',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    paddingLeft: 44,
    marginLeft: 14,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  stopMain: {
    flex: 1,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  stopAddress: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  stopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  stopTime: {
    fontSize: 12,
    color: '#64748b',
  },
  stopActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  weatherTemp: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  connector: {
    position: 'absolute',
    left: 13,
    top: 44,
    bottom: -8,
    width: 2,
    alignItems: 'center',
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#1e3a5f',
  },
});
