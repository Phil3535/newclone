import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color = '#f59e0b',
  subtitle,
  trend,
  trendValue,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
              size={14}
              color={trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#64748b'}
            />
            {trendValue && (
              <Text
                style={[
                  styles.trendText,
                  {
                    color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#64748b',
                  },
                ]}
              >
                {trendValue}
              </Text>
            )}
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
});
