import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TerritoryCard from '../../src/components/TerritoryCard';
import TerritoryMap from '../../src/components/TerritoryMap';
import { territoriesApi } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface Territory {
  id: string;
  name: string;
  zip_codes: string[];
  close_rate: number;
  avg_home_value: number;
  utility_rate: number;
  incentives_available: number;
  priority_score: number;
  lead_count: number;
  assigned_rep_id?: string;
}

interface HeatmapData {
  zip_code: string;
  territory_id: string;
  territory_name: string;
  priority_score: number;
  close_rate: number;
  lead_count: number;
}

export default function TerritoriesScreen() {
  const { currentRepId } = useStore();
  const { t } = useLanguage();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'heatmap' | 'map'>('map');

  const loadData = useCallback(async () => {
    try {
      const [territoriesRes, heatmapRes] = await Promise.all([
        territoriesApi.getAll(),
        territoriesApi.getHeatmapData(),
      ]);
      setTerritories(territoriesRes.data);
      setHeatmapData(heatmapRes.data.heatmap);
    } catch (error) {
      console.error('Error loading territories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getPriorityColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#f97316';
    return '#ef4444';
  };

  const renderTerritoryItem = ({ item }: { item: Territory }) => (
    <TerritoryCard territory={item} />
  );

  const renderHeatmapItem = ({ item }: { item: HeatmapData }) => {
    const color = getPriorityColor(item.priority_score);
    return (
      <View style={[styles.heatmapItem, { borderLeftColor: color }]}>
        <View style={styles.heatmapHeader}>
          <Text style={styles.zipCode}>{item.zip_code}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: `${color}20` }]}>
            <Text style={[styles.priorityText, { color }]}>
              {Math.round(item.priority_score)}
            </Text>
          </View>
        </View>
        <Text style={styles.territoryName}>{item.territory_name}</Text>
        <View style={styles.heatmapStats}>
          <View style={styles.heatmapStat}>
            <Ionicons name="trending-up" size={12} color="#22c55e" />
            <Text style={styles.heatmapStatText}>
              {(item.close_rate * 100).toFixed(0)}% close rate
            </Text>
          </View>
          <View style={styles.heatmapStat}>
            <Ionicons name="people" size={12} color="#3b82f6" />
            <Text style={styles.heatmapStatText}>{item.lead_count} leads</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      </SafeAreaView>
    );
  }

  // Calculate summary stats
  const totalZipCodes = territories.reduce((sum, t) => sum + t.zip_codes.length, 0);
  const avgPriority = territories.length > 0
    ? territories.reduce((sum, t) => sum + t.priority_score, 0) / territories.length
    : 0;
  const highPriorityCount = territories.filter((t) => t.priority_score >= 60).length;

  return (
    <SafeAreaView style={styles.container} data-testid="territories-screen">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title} data-testid="territories-title">{t('territories.title')}</Text>
          <Text style={styles.subtitle}>{t('territories.subtitle')}</Text>
        </View>
        <View style={styles.viewToggle} data-testid="view-toggle">
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
            data-testid="map-view-button"
          >
            <Ionicons
              name="map"
              size={20}
              color={viewMode === 'map' ? '#ffffff' : '#64748b'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
            data-testid="list-view-button"
          >
            <Ionicons
              name="list"
              size={20}
              color={viewMode === 'list' ? '#ffffff' : '#64748b'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'heatmap' && styles.toggleBtnActive]}
            onPress={() => setViewMode('heatmap')}
            data-testid="heatmap-view-button"
          >
            <Ionicons
              name="grid"
              size={20}
              color={viewMode === 'heatmap' ? '#ffffff' : '#64748b'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer} data-testid="territories-summary">
        <View style={styles.summaryCard}>
          <Ionicons name="location" size={20} color="#3b82f6" />
          <Text style={styles.summaryValue} data-testid="territories-count">{territories.length}</Text>
          <Text style={styles.summaryLabel}>{t('territories.title')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="map" size={20} color="#22c55e" />
          <Text style={styles.summaryValue}>{totalZipCodes}</Text>
          <Text style={styles.summaryLabel}>{t('territories.zip_codes')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="flame" size={20} color="#f59e0b" />
          <Text style={styles.summaryValue}>{highPriorityCount}</Text>
          <Text style={styles.summaryLabel}>{t('territories.high_priority')}</Text>
        </View>
      </View>

      {/* Priority Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>{t('territories.priority_level')}:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>{t('territories.hot')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>{t('territories.warm')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.legendText}>{t('territories.cool')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>{t('territories.cold')}</Text>
          </View>
        </View>
      </View>

      {/* Map/List/Heatmap View */}
      {viewMode === 'map' && (
        <ScrollView 
          style={styles.mapScrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
          }
        >
          <View style={styles.listContent}>
            <TerritoryMap territories={territories} />
          </View>
        </ScrollView>
      )}
      
      {viewMode === 'list' && (
        <FlatList
          data={territories}
          renderItem={renderTerritoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={64} color="#1e3a5f" />
              <Text style={styles.emptyText}>{t('territories.no_territories')}</Text>
            </View>
          }
        />
      )}
      
      {viewMode === 'heatmap' && (
        <FlatList
          data={heatmapData.sort((a, b) => b.priority_score - a.priority_score)}
          renderItem={renderHeatmapItem}
          keyExtractor={(item) => `${item.territory_id}-${item.zip_code}`}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.heatmapRow}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
          }
        />
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
  mapScrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#f59e0b',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 6,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  legendContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  legendTitle: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  listContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 12,
  },
  heatmapRow: {
    justifyContent: 'space-between',
  },
  heatmapItem: {
    width: '48%',
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderLeftWidth: 4,
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  zipCode: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  territoryName: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 8,
  },
  heatmapStats: {
    gap: 4,
  },
  heatmapStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heatmapStatText: {
    color: '#94a3b8',
    fontSize: 10,
  },
});
