import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
}

interface TerritoryMapProps {
  territories: Territory[];
  onTerritorySelect?: (territory: Territory) => void;
}

// Mock coordinates for ZIP codes (in a real app, you'd use a geocoding service)
const ZIP_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '90210': { lat: 34.0901, lng: -118.4065 },
  '90211': { lat: 34.0656, lng: -118.3850 },
  '90212': { lat: 34.0622, lng: -118.4014 },
  '90220': { lat: 33.8758, lng: -118.2410 },
  '90221': { lat: 33.8731, lng: -118.2175 },
  '90222': { lat: 33.9164, lng: -118.2311 },
  '90230': { lat: 33.9925, lng: -118.3917 },
  '90231': { lat: 33.9897, lng: -118.4042 },
  '90232': { lat: 34.0094, lng: -118.3950 },
  '90240': { lat: 33.9425, lng: -118.1306 },
  '90241': { lat: 33.9361, lng: -118.1075 },
  '90250': { lat: 33.9161, lng: -118.3531 },
  '90251': { lat: 33.9028, lng: -118.3453 },
};

const { width } = Dimensions.get('window');

export default function TerritoryMap({ territories, onTerritorySelect }: TerritoryMapProps) {
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);

  const getPriorityColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#f97316';
    return '#ef4444';
  };

  const getColorOpacity = (score: number) => {
    return Math.max(0.3, score / 100);
  };

  // Calculate bounds for the visual representation
  const gridSize = 5;
  const cellWidth = (width - 40) / gridSize;
  const cellHeight = 60;

  const handleTerritoryPress = (territory: Territory) => {
    setSelectedTerritory(territory);
    onTerritorySelect?.(territory);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="map" size={20} color="#f59e0b" />
        <Text style={styles.title}>Territory Heat Map</Text>
      </View>

      {/* Visual Heat Map Grid */}
      <View style={styles.mapContainer}>
        <View style={styles.gridContainer}>
          {territories.map((territory, index) => {
            const color = getPriorityColor(territory.priority_score);
            const opacity = getColorOpacity(territory.priority_score);
            const row = Math.floor(index / 2);
            const col = index % 2;
            
            return (
              <TouchableOpacity
                key={territory.id}
                style={[
                  styles.territoryCell,
                  {
                    backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                    borderColor: selectedTerritory?.id === territory.id ? '#ffffff' : color,
                    borderWidth: selectedTerritory?.id === territory.id ? 3 : 1,
                  },
                ]}
                onPress={() => handleTerritoryPress(territory)}
                activeOpacity={0.8}
              >
                <View style={styles.cellContent}>
                  <Text style={styles.territoryName} numberOfLines={1}>
                    {territory.name}
                  </Text>
                  <View style={styles.scoreContainer}>
                    <Text style={[styles.scoreText, { color }]}>
                      {Math.round(territory.priority_score)}
                    </Text>
                  </View>
                  <Text style={styles.zipCount}>
                    {territory.zip_codes.length} ZIPs
                  </Text>
                </View>
                
                {/* Heat indicator */}
                <View style={[styles.heatIndicator, { backgroundColor: color }]}>
                  <Ionicons 
                    name={territory.priority_score >= 70 ? "flame" : territory.priority_score >= 50 ? "sunny" : "snow"} 
                    size={12} 
                    color="#ffffff" 
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Selected Territory Details */}
      {selectedTerritory && (
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>{selectedTerritory.name}</Text>
            <View style={[
              styles.priorityBadge, 
              { backgroundColor: getPriorityColor(selectedTerritory.priority_score) }
            ]}>
              <Text style={styles.priorityBadgeText}>
                {Math.round(selectedTerritory.priority_score)}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="trending-up" size={16} color="#22c55e" />
              <Text style={styles.detailLabel}>Close Rate</Text>
              <Text style={styles.detailValue}>
                {(selectedTerritory.close_rate * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="home" size={16} color="#3b82f6" />
              <Text style={styles.detailLabel}>Avg Home</Text>
              <Text style={styles.detailValue}>
                ${(selectedTerritory.avg_home_value / 1000).toFixed(0)}K
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="flash" size={16} color="#f59e0b" />
              <Text style={styles.detailLabel}>Utility</Text>
              <Text style={styles.detailValue}>
                ${selectedTerritory.utility_rate.toFixed(2)}/kWh
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="gift" size={16} color="#8b5cf6" />
              <Text style={styles.detailLabel}>Incentives</Text>
              <Text style={styles.detailValue}>
                ${selectedTerritory.incentives_available.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.zipCodesContainer}>
            <Text style={styles.zipCodesLabel}>ZIP Codes:</Text>
            <View style={styles.zipCodesList}>
              {selectedTerritory.zip_codes.map((zip) => (
                <View key={zip} style={styles.zipBadge}>
                  <Text style={styles.zipBadgeText}>{zip}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Priority Level:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Hot (70+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>Warm (50-69)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.legendText}>Cool (30-49)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Cold (&lt;30)</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    backgroundColor: '#0a1628',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  territoryCell: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    position: 'relative',
  },
  cellContent: {
    flex: 1,
  },
  territoryName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreContainer: {
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  zipCount: {
    color: '#94a3b8',
    fontSize: 11,
  },
  heatIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCard: {
    backgroundColor: '#0a1628',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    width: '46%',
    backgroundColor: '#0f1a2e',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  zipCodesContainer: {
    marginTop: 8,
  },
  zipCodesLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
  },
  zipCodesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  zipBadge: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zipBadgeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  legend: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  legendTitle: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 10,
  },
});
