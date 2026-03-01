import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_URL = API_BASE ? `${API_BASE}/api` : '/api';

interface PropertyLead {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  year_built: number | null;
  roof_age: number | null;
  estimated_electric_bill: number;
  lat: number;
  lng: number;
  source: string;
  ai_score: number;
  score_breakdown: Record<string, number>;
  recommended_action: string;
  best_time_to_contact: string;
}

interface HotZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lead_count: number;
  avg_score: number;
  new_construction: number;
  heat_level: string;
  recommendation: string;
}

interface MarketInsights {
  total_properties_scanned: number;
  average_lead_score: number;
  hot_leads_found: number;
  new_construction_count: number;
  recently_sold_count: number;
  permits_filed_count: number;
  best_zip_code: string;
  market_temperature: string;
}

interface RouteStop {
  order: number;
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  lat: number;
  lng: number;
  ai_score: number;
  property_type: string;
  price: number;
  estimated_electric_bill: number;
  recommended_action: string;
  distance_from_previous: number;
  estimated_drive_time: number;
}

interface OptimizedRouteData {
  optimized_route: RouteStop[];
  stats: {
    total_stops: number;
    total_distance_miles: number;
    estimated_drive_time_minutes: number;
    average_ai_score: number;
    estimated_knocks_per_hour: number;
    total_knock_time_minutes: number;
    total_route_time_minutes: number;
    new_construction_stops: number;
    high_electric_bill_stops: number;
  };
  maps_url: string;
  tips: string[];
}

export default function LeadHunterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'zones'>('leads');
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [hotZones, setHotZones] = useState<HotZone[]>([]);
  const [insights, setInsights] = useState<MarketInsights | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<PropertyLead | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRouteData | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch leads
      const leadsRes = await fetch(`${API_URL}/lead-hunter/scan?limit=20`);
      const leadsData = await leadsRes.json();
      setLeads(leadsData.hot_leads || []);
      setInsights(leadsData.market_insights || null);
      setRecommendations(leadsData.ai_recommendations || []);

      // Fetch hot zones
      const zonesRes = await fetch(`${API_URL}/lead-hunter/hot-zones`);
      const zonesData = await zonesRes.json();
      setHotZones(zonesData.hot_zones || []);
    } catch (error) {
      console.error('Error fetching lead hunter data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const optimizeKnockRoute = async () => {
    setOptimizing(true);
    try {
      const response = await fetch(`${API_URL}/lead-hunter/optimize-route?max_stops=10`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setOptimizedRoute(data);
      setShowRouteModal(true);
    } catch (error) {
      console.error('Error optimizing route:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const startNavigation = () => {
    if (optimizedRoute?.maps_url) {
      Linking.openURL(optimizedRoute.maps_url);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#f59e0b';
    if (score >= 55) return '#3b82f6';
    return '#64748b';
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'new_construction': return 'construct';
      case 'recently_sold': return 'home';
      case 'permit_filed': return 'document-text';
      default: return 'business';
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'new_construction': return 'New Build';
      case 'recently_sold': return 'Just Sold';
      case 'permit_filed': return 'Permit Filed';
      default: return 'Standard';
    }
  };

  const getHeatColor = (level: string) => {
    switch (level) {
      case 'hot': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const openNavigation = (lat: number, lng: number, address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>🔍 AI scanning for leads...</Text>
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
        <View style={styles.headerCenter}>
          <Text style={styles.title}>AI Lead Hunter</Text>
          <Text style={styles.subtitle}>🤖 Auto-Discovery Engine</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {/* Market Temperature Banner */}
      {insights && (
        <View style={styles.tempBanner}>
          <Text style={styles.tempLabel}>Market Temperature</Text>
          <Text style={styles.tempValue}>{insights.market_temperature}</Text>
          <Text style={styles.tempStats}>
            {insights.hot_leads_found} hot leads • {insights.new_construction_count} new builds
          </Text>
        </View>
      )}

      {/* AI Recommendations */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.recommendationsContainer}
      >
        {recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationCard}>
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leads' && styles.activeTab]}
          onPress={() => setActiveTab('leads')}
        >
          <Ionicons name="flame" size={18} color={activeTab === 'leads' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'leads' && styles.activeTabText]}>
            Hot Leads ({leads.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'zones' && styles.activeTab]}
          onPress={() => setActiveTab('zones')}
        >
          <Ionicons name="location" size={18} color={activeTab === 'zones' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'zones' && styles.activeTabText]}>
            Hot Zones ({hotZones.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Optimize Route Button */}
      {leads.length > 0 && (
        <TouchableOpacity
          style={styles.optimizeRouteButton}
          onPress={optimizeKnockRoute}
          disabled={optimizing}
          data-testid="optimize-route-btn"
        >
          {optimizing ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.optimizeRouteText}>Optimizing Route...</Text>
            </>
          ) : (
            <>
              <Ionicons name="map" size={20} color="#ffffff" />
              <Text style={styles.optimizeRouteText}>Optimize Knock Route</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
      >
        {activeTab === 'leads' ? (
          <>
            {leads.map((lead) => (
              <TouchableOpacity
                key={lead.id}
                style={styles.leadCard}
                onPress={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
              >
                <View style={styles.leadHeader}>
                  <View style={styles.leadTypeContainer}>
                    <View style={[styles.leadTypeIcon, { backgroundColor: getScoreColor(lead.ai_score) + '20' }]}>
                      <Ionicons 
                        name={getPropertyTypeIcon(lead.property_type)} 
                        size={16} 
                        color={getScoreColor(lead.ai_score)} 
                      />
                    </View>
                    <View>
                      <Text style={styles.leadAddress}>{lead.address}</Text>
                      <Text style={styles.leadCity}>{lead.city}, {lead.state} {lead.zip_code}</Text>
                    </View>
                  </View>
                  <View style={styles.scoreContainer}>
                    <Text style={[styles.scoreValue, { color: getScoreColor(lead.ai_score) }]}>
                      {lead.ai_score}
                    </Text>
                    <Text style={styles.scoreLabel}>AI Score</Text>
                  </View>
                </View>

                <View style={styles.leadStats}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{formatPrice(lead.price)}</Text>
                    <Text style={styles.statLabel}>Price</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{lead.sqft.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Sq Ft</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>${lead.estimated_electric_bill}</Text>
                    <Text style={styles.statLabel}>Electric/mo</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{lead.roof_age || '?'} yrs</Text>
                    <Text style={styles.statLabel}>Roof Age</Text>
                  </View>
                </View>

                <View style={styles.leadBadges}>
                  <View style={[styles.badge, { backgroundColor: getScoreColor(lead.ai_score) + '20' }]}>
                    <Text style={[styles.badgeText, { color: getScoreColor(lead.ai_score) }]}>
                      {getPropertyTypeLabel(lead.property_type)}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>📍 {lead.source}</Text>
                  </View>
                </View>

                {selectedLead?.id === lead.id && (
                  <View style={styles.expandedDetails}>
                    <Text style={styles.actionText}>{lead.recommended_action}</Text>
                    <Text style={styles.bestTimeText}>🕐 Best time: {lead.best_time_to_contact}</Text>
                    
                    <View style={styles.scoreBreakdown}>
                      <Text style={styles.breakdownTitle}>Score Breakdown:</Text>
                      {Object.entries(lead.score_breakdown).map(([key, value]) => (
                        <View key={key} style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>{key.replace('_', ' ')}</Text>
                          <View style={styles.breakdownBar}>
                            <View style={[styles.breakdownFill, { width: `${(value / 25) * 100}%` }]} />
                          </View>
                          <Text style={styles.breakdownValue}>{value}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.navButton}
                        onPress={() => openNavigation(lead.lat, lead.lng, lead.address)}
                      >
                        <Ionicons name="navigate" size={18} color="#ffffff" />
                        <Text style={styles.navButtonText}>Navigate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.addLeadButton}>
                        <Ionicons name="person-add" size={18} color="#ffffff" />
                        <Text style={styles.addLeadButtonText}>Add as Lead</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {hotZones.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={styles.zoneCard}
                onPress={() => openNavigation(zone.lat, zone.lng, zone.name)}
              >
                <View style={styles.zoneHeader}>
                  <View style={[styles.heatIndicator, { backgroundColor: getHeatColor(zone.heat_level) }]}>
                    <Ionicons name="flame" size={16} color="#ffffff" />
                  </View>
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <Text style={styles.zoneStats}>
                      {zone.lead_count} leads • {zone.new_construction} new builds
                    </Text>
                  </View>
                  <View style={styles.zoneScore}>
                    <Text style={[styles.zoneScoreValue, { color: getHeatColor(zone.heat_level) }]}>
                      {zone.avg_score}
                    </Text>
                    <Text style={styles.zoneScoreLabel}>Avg Score</Text>
                  </View>
                </View>
                <Text style={styles.zoneRecommendation}>{zone.recommendation}</Text>
                <View style={styles.zoneAction}>
                  <Ionicons name="navigate-circle" size={20} color="#f59e0b" />
                  <Text style={styles.zoneActionText}>Tap to navigate</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Optimized Route Modal */}
      <Modal
        visible={showRouteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRouteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.routeModal}>
            {/* Modal Header */}
            <View style={styles.routeModalHeader}>
              <View>
                <Text style={styles.routeModalTitle}>Smart Knock Route</Text>
                <Text style={styles.routeModalSubtitle}>AI-Optimized Path</Text>
              </View>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowRouteModal(false)}
                data-testid="close-route-modal-btn"
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {optimizedRoute && (
              <>
                {/* Route Stats */}
                <View style={styles.routeStatsContainer}>
                  <View style={styles.routeStat}>
                    <Text style={styles.routeStatValue}>{optimizedRoute.stats.total_stops}</Text>
                    <Text style={styles.routeStatLabel}>Stops</Text>
                  </View>
                  <View style={styles.routeStat}>
                    <Text style={styles.routeStatValue}>{optimizedRoute.stats.total_distance_miles}mi</Text>
                    <Text style={styles.routeStatLabel}>Distance</Text>
                  </View>
                  <View style={styles.routeStat}>
                    <Text style={styles.routeStatValue}>{optimizedRoute.stats.estimated_drive_time_minutes}m</Text>
                    <Text style={styles.routeStatLabel}>Drive Time</Text>
                  </View>
                  <View style={styles.routeStat}>
                    <Text style={styles.routeStatValue}>{optimizedRoute.stats.average_ai_score}</Text>
                    <Text style={styles.routeStatLabel}>Avg Score</Text>
                  </View>
                </View>

                {/* Tips Carousel */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipsContainer}>
                  {optimizedRoute.tips.map((tip, index) => (
                    <View key={index} style={styles.tipCard}>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Route Stops List */}
                <ScrollView style={styles.routeStopsList}>
                  {optimizedRoute.optimized_route.map((stop, index) => (
                    <View key={stop.id} style={styles.routeStopCard}>
                      <View style={styles.stopOrderBadge}>
                        <Text style={styles.stopOrderText}>{stop.order}</Text>
                      </View>
                      <View style={styles.stopDetails}>
                        <Text style={styles.stopAddress}>{stop.address}</Text>
                        <Text style={styles.stopCity}>{stop.city}, {stop.state}</Text>
                        <View style={styles.stopMeta}>
                          <Text style={styles.stopMetaText}>
                            Score: {stop.ai_score} • {stop.distance_from_previous}mi • {stop.estimated_drive_time}min
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.stopScoreBadge, { backgroundColor: getScoreColor(stop.ai_score) + '20' }]}>
                        <Ionicons 
                          name={getPropertyTypeIcon(stop.property_type)} 
                          size={16} 
                          color={getScoreColor(stop.ai_score)} 
                        />
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Start Navigation Button */}
                <TouchableOpacity
                  style={styles.startNavigationButton}
                  onPress={startNavigation}
                  data-testid="start-navigation-btn"
                >
                  <Ionicons name="navigate" size={22} color="#ffffff" />
                  <Text style={styles.startNavigationText}>Start Navigation in Google Maps</Text>
                </TouchableOpacity>

                {/* Total Route Time */}
                <Text style={styles.totalRouteTime}>
                  Total Route Time: ~{optimizedRoute.stats.total_route_time_minutes} minutes
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#f59e0b',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempBanner: {
    backgroundColor: '#1e3a5f',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  tempLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  tempValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  tempStats: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  recommendationsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  recommendationCard: {
    backgroundColor: '#f59e0b20',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  recommendationText: {
    color: '#f59e0b',
    fontSize: 13,
    maxWidth: 250,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#f59e0b20',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#f59e0b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  leadCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leadTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leadAddress: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  leadCity: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  leadStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  leadBadges: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  badge: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  actionText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  bestTimeText: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 16,
  },
  scoreBreakdown: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  breakdownTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    color: '#94a3b8',
    fontSize: 11,
    width: 80,
    textTransform: 'capitalize',
  },
  breakdownBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#0a1929',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  breakdownValue: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  addLeadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  addLeadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  zoneCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heatIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  zoneStats: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  zoneScore: {
    alignItems: 'center',
  },
  zoneScoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  zoneScoreLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  zoneRecommendation: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  zoneAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  zoneActionText: {
    color: '#f59e0b',
    fontSize: 13,
  },
  // Optimize Route Button
  optimizeRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  optimizeRouteText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  routeModal: {
    backgroundColor: '#0a1929',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 30,
  },
  routeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  routeModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  routeModalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#0f1a2e',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  routeStat: {
    alignItems: 'center',
  },
  routeStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
  },
  routeStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  tipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipCard: {
    backgroundColor: '#22c55e20',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
    maxWidth: 280,
  },
  tipText: {
    color: '#22c55e',
    fontSize: 13,
  },
  routeStopsList: {
    maxHeight: 280,
    paddingHorizontal: 16,
  },
  routeStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  stopOrderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stopOrderText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  stopDetails: {
    flex: 1,
  },
  stopAddress: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  stopCity: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  stopMeta: {
    marginTop: 4,
  },
  stopMetaText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  stopScoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startNavigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  startNavigationText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  totalRouteTime: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    marginTop: 12,
  },
});
