import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  assigned_rep_id?: string;
}

interface TerritoryCardProps {
  territory: Territory;
  onPress?: () => void;
}

export default function TerritoryCard({ territory, onPress }: TerritoryCardProps) {
  const getPriorityColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#f97316';
    return '#ef4444';
  };

  const priorityColor = getPriorityColor(territory.priority_score);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="location" size={20} color={priorityColor} />
          <Text style={styles.name}>{territory.name}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: `${priorityColor}20` }]}>
          <Text style={[styles.scoreText, { color: priorityColor }]}>
            {Math.round(territory.priority_score)}
          </Text>
        </View>
      </View>

      <View style={styles.zipCodes}>
        {territory.zip_codes.slice(0, 4).map((zip, index) => (
          <View key={index} style={styles.zipBadge}>
            <Text style={styles.zipText}>{zip}</Text>
          </View>
        ))}
        {territory.zip_codes.length > 4 && (
          <View style={styles.zipBadge}>
            <Text style={styles.zipText}>+{territory.zip_codes.length - 4}</Text>
          </View>
        )}
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={14} color="#22c55e" />
          <Text style={styles.statLabel}>Close Rate</Text>
          <Text style={styles.statValue}>{(territory.close_rate * 100).toFixed(0)}%</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="home" size={14} color="#3b82f6" />
          <Text style={styles.statLabel}>Avg Home</Text>
          <Text style={styles.statValue}>${(territory.avg_home_value / 1000).toFixed(0)}K</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people" size={14} color="#f59e0b" />
          <Text style={styles.statLabel}>Leads</Text>
          <Text style={styles.statValue}>{territory.lead_count}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="flash" size={12} color="#64748b" />
          <Text style={styles.footerText}>${territory.utility_rate.toFixed(2)}/kWh</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="gift" size={12} color="#64748b" />
          <Text style={styles.footerText}>
            ${territory.incentives_available.toLocaleString()} incentives
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  zipCodes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  zipBadge: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zipText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
  },
});
