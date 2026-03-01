import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScoreIndicator from './ScoreIndicator';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  zip_code: string;
  homeowner: boolean;
  roof_type: string;
  bill_amount: number;
  timeline: string;
  source: string;
  ai_score: number;
  probability_to_close: number;
  ai_insights?: string;
  status: string;
}

interface LeadCardProps {
  lead: Lead;
  onPress?: () => void;
}

export default function LeadCard({ lead, onPress }: LeadCardProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: '#3b82f6',
      contacted: '#8b5cf6',
      qualified: '#22c55e',
      appointment_set: '#f59e0b',
      closed_won: '#10b981',
      closed_lost: '#ef4444',
    };
    return colors[status] || '#64748b';
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.leadInfo}>
          <Text style={styles.name}>{lead.name}</Text>
          <View style={styles.contactRow}>
            <Ionicons name="location-outline" size={12} color="#64748b" />
            <Text style={styles.contactText}>{lead.address}</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={12} color="#64748b" />
            <Text style={styles.contactText}>{lead.phone}</Text>
          </View>
        </View>
        <ScoreIndicator score={lead.ai_score} size="small" />
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Ionicons name="home-outline" size={14} color="#64748b" />
          <Text style={styles.detailText}>
            {lead.homeowner ? 'Homeowner' : 'Renter'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="flash-outline" size={14} color="#64748b" />
          <Text style={styles.detailText}>${lead.bill_amount}/mo</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color="#64748b" />
          <Text style={styles.detailText}>{lead.timeline}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(lead.status)}20` },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: getStatusColor(lead.status) }]}
          />
          <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
            {formatStatus(lead.status)}
          </Text>
        </View>
        <Text style={styles.probability}>
          {Math.round(lead.probability_to_close * 100)}% to close
        </Text>
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadInfo: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  contactText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  probability: {
    fontSize: 12,
    color: '#64748b',
  },
});
