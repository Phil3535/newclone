import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function EliteToolsScreen() {
  const router = useRouter();

  const toolCategories = [
    {
      title: 'Elite Sales Tools',
      badge: 'PHASE 1',
      badgeColor: '#22c55e',
      tools: [
        {
          id: 'deal-stacker',
          title: 'Deal Stacking Calculator',
          description: 'Federal + State + Utility incentives',
          icon: 'calculator',
          color: ['#10b981', '#059669'],
          route: '/elite-tools/deal-stacker',
        },
        {
          id: 'payment-calc',
          title: 'Payment Calculator',
          description: 'Financing options & monthly payments',
          icon: 'card',
          color: ['#3b82f6', '#2563eb'],
          route: '/elite-tools/payment-calculator',
        },
        {
          id: 'proposal',
          title: 'Proposal Builder',
          description: 'Generate professional proposals',
          icon: 'document-text',
          color: ['#8b5cf6', '#7c3aed'],
          route: '/elite-tools/proposal-builder',
        },
        {
          id: 'upsell',
          title: 'Upsell Recommender',
          description: 'AI-powered add-on suggestions',
          icon: 'trending-up',
          color: ['#f97316', '#ea580c'],
          route: '/elite-tools/upsell-recommender',
        },
      ],
    },
    {
      title: 'AI Power Tools',
      badge: 'PHASE 2',
      badgeColor: '#f97316',
      tools: [
        {
          id: 'objection',
          title: 'AI Objection Handler',
          description: 'Perfect rebuttals for any objection',
          icon: 'chatbubbles',
          color: ['#f97316', '#dc2626'],
          route: '/elite-tools/ai-objection-handler',
        },
        {
          id: 'close-prob',
          title: 'Close Probability',
          description: 'AI predicts which leads will close',
          icon: 'analytics',
          color: ['#8b5cf6', '#6d28d9'],
          route: '/elite-tools/close-probability',
        },
        {
          id: 'timing',
          title: 'Smart Follow-up Timing',
          description: 'Best time to contact each lead',
          icon: 'time',
          color: ['#06b6d4', '#0891b2'],
          route: '/elite-tools/follow-up-timing',
        },
      ],
    },
    {
      title: 'Intelligence & Data',
      badge: 'PHASE 3',
      badgeColor: '#ef4444',
      tools: [
        {
          id: 'heatmap',
          title: 'Neighborhood Heatmap',
          description: 'See nearby solar installations',
          icon: 'map',
          color: ['#22c55e', '#16a34a'],
          route: '/elite-tools/neighborhood-heatmap',
        },
        {
          id: 'weather',
          title: 'Weather Outreach',
          description: 'Auto-campaigns based on conditions',
          icon: 'sunny',
          color: ['#fbbf24', '#f59e0b'],
          route: '/elite-tools/weather-outreach',
        },
        {
          id: 'competitor',
          title: 'Competitor Intel',
          description: 'Track pricing & win strategies',
          icon: 'eye',
          color: ['#ef4444', '#dc2626'],
          route: '/elite-tools/competitor-intel',
        },
      ],
    },
  ];

  const quickStats = [
    { label: 'Tools', value: '10', icon: 'construct' },
    { label: 'AI Features', value: '6', icon: 'sparkles' },
    { label: 'States', value: '10', icon: 'map' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerBadge}>
            <Ionicons name="diamond" size={16} color="#fbbf24" />
            <Text style={styles.headerBadgeText}>ELITE</Text>
          </View>
          <Text style={styles.headerTitle}>Sales Power Tools</Text>
          <Text style={styles.headerSubtitle}>
            AI-powered tools to close more deals faster
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {quickStats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <Ionicons name={stat.icon as any} size={20} color="#60a5fa" />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Tool Categories */}
      {toolCategories.map((category, catIndex) => (
        <View key={catIndex} style={styles.categoryContainer}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <View style={[styles.phaseBadge, { backgroundColor: category.badgeColor }]}>
              <Text style={styles.phaseBadgeText}>{category.badge}</Text>
            </View>
          </View>
          
          {category.tools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolCard}
              onPress={() => router.push(tool.route as any)}
              activeOpacity={0.8}
              data-testid={`elite-tool-${tool.id}`}
            >
              <LinearGradient
                colors={tool.color}
                style={styles.toolIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={tool.icon as any} size={24} color="#fff" />
              </LinearGradient>
              
              <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolDescription}>{tool.description}</Text>
              </View>
              
              <Ionicons name="chevron-forward" size={24} color="#64748b" />
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Pro Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.sectionTitle}>Pro Tips</Text>
        
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={24} color="#fbbf24" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Stack the Savings</Text>
            <Text style={styles.tipText}>
              Always show customers the TOTAL incentives first. A $30K system becomes $17K after incentives - that's the number that closes deals.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="flash" size={24} color="#f97316" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Beat the Competition</Text>
            <Text style={styles.tipText}>
              Use Competitor Intel to know their pricing before the customer tells you. Come prepared with your win strategy.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="time" size={24} color="#06b6d4" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Timing is Everything</Text>
            <Text style={styles.tipText}>
              Smart Follow-up Timing increases connection rates by 3x. Contact leads at their optimal time.
            </Text>
          </View>
        </View>
      </View>

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
  headerContent: {
    marginBottom: 24,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  headerBadgeText: {
    color: '#fbbf24',
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  categoryContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phaseBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolContent: {
    flex: 1,
    marginLeft: 14,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  toolDescription: {
    fontSize: 12,
    color: '#94a3b8',
  },
  tipsContainer: {
    padding: 20,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
});
