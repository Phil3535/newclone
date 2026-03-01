import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Competitor {
  id: string;
  name: string;
  logo: string;
  pricePerWatt: number;
  warranty: number;
  panelEfficiency: number;
  installTime: string;
  financing: boolean;
  monitoring: boolean;
  rating: number;
}

const SOLAR_EMPIRE: Competitor = {
  id: 'solar-empire',
  name: 'Solar Empire',
  logo: '☀️',
  pricePerWatt: 2.50,
  warranty: 25,
  panelEfficiency: 22.5,
  installTime: '1-2 days',
  financing: true,
  monitoring: true,
  rating: 4.9,
};

// Fallback data
const FALLBACK_COMPETITORS: Competitor[] = [
  {
    id: '1',
    name: 'SunRun',
    logo: '🌅',
    pricePerWatt: 3.20,
    warranty: 20,
    panelEfficiency: 20.0,
    installTime: '3-5 days',
    financing: true,
    monitoring: true,
    rating: 4.2,
  },
  {
    id: '2',
    name: 'Tesla Solar',
    logo: '⚡',
    pricePerWatt: 2.85,
    warranty: 25,
    panelEfficiency: 21.5,
    installTime: '2-4 weeks',
    financing: true,
    monitoring: true,
    rating: 4.0,
  },
  {
    id: '3',
    name: 'Vivint Solar',
    logo: '🏠',
    pricePerWatt: 3.10,
    warranty: 20,
    panelEfficiency: 19.5,
    installTime: '4-6 weeks',
    financing: true,
    monitoring: false,
    rating: 3.8,
  },
];

const LOGO_MAP: Record<string, string> = {
  'SunRun': '🌅',
  'Tesla Solar': '⚡',
  'Vivint Solar': '🏠',
  'Palmetto Solar': '🌴',
  'Local Installer': '🔧',
};

export default function CompetitorComparisonScreen() {
  const router = useRouter();
  const [competitors, setCompetitors] = useState<Competitor[]>(FALLBACK_COMPETITORS);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor>(FALLBACK_COMPETITORS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/competitors/`);
      const data = await response.json();
      
      // Transform API data to match expected format
      const transformedData: Competitor[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        logo: LOGO_MAP[c.name] || '🏢',
        pricePerWatt: c.price_per_watt,
        warranty: c.warranty_years,
        panelEfficiency: 20.0, // Default value
        installTime: c.installation_time,
        financing: c.financing_options?.length > 0,
        monitoring: true,
        rating: c.customer_rating,
      }));
      
      if (transformedData.length > 0) {
        setCompetitors(transformedData);
        setSelectedCompetitor(transformedData[0]);
      }
    } catch (error) {
      console.error('Error fetching competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderComparisonRow = (
    label: string,
    ourValue: string | number | boolean,
    theirValue: string | number | boolean,
    isHigherBetter: boolean = true,
    isBoolean: boolean = false
  ) => {
    let weWin = false;
    if (isBoolean) {
      weWin = ourValue === true && theirValue === false;
    } else if (typeof ourValue === 'number' && typeof theirValue === 'number') {
      weWin = isHigherBetter ? ourValue > theirValue : ourValue < theirValue;
    }

    return (
      <View style={styles.comparisonRow}>
        <Text style={styles.comparisonLabel}>{label}</Text>
        <View style={styles.comparisonValues}>
          <View style={[styles.valueBox, weWin && styles.valueBoxWin]}>
            {isBoolean ? (
              <Ionicons 
                name={ourValue ? 'checkmark-circle' : 'close-circle'} 
                size={20} 
                color={ourValue ? '#22c55e' : '#ef4444'} 
              />
            ) : (
              <Text style={[styles.valueText, weWin && styles.valueTextWin]}>
                {ourValue}
              </Text>
            )}
          </View>
          <View style={styles.valueBox}>
            {isBoolean ? (
              <Ionicons 
                name={theirValue ? 'checkmark-circle' : 'close-circle'} 
                size={20} 
                color={theirValue ? '#22c55e' : '#ef4444'} 
              />
            ) : (
              <Text style={styles.valueText}>{theirValue}</Text>
            )}
          </View>
        </View>
      </View>
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
          <Text style={styles.title}>Compare Competitors</Text>
          <Text style={styles.subtitle}>Win More Deals</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Competitor Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Competitor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {competitors.map((comp) => (
              <TouchableOpacity
                key={comp.id}
                style={[
                  styles.competitorCard,
                  selectedCompetitor.id === comp.id && styles.competitorCardSelected,
                ]}
                onPress={() => setSelectedCompetitor(comp)}
                data-testid={`competitor-card-${comp.id}`}
              >
                <Text style={styles.competitorLogo}>{comp.logo}</Text>
                <Text style={styles.competitorName}>{comp.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Comparison Header */}
        <View style={styles.comparisonHeader}>
          <View style={styles.companyHeader}>
            <Text style={styles.companyLogo}>{SOLAR_EMPIRE.logo}</Text>
            <Text style={styles.companyName}>Solar Empire</Text>
            <View style={styles.usBadge}>
              <Text style={styles.usBadgeText}>US</Text>
            </View>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.companyHeader}>
            <Text style={styles.companyLogo}>{selectedCompetitor.logo}</Text>
            <Text style={styles.companyName}>{selectedCompetitor.name}</Text>
          </View>
        </View>

        {/* Comparison Table */}
        <View style={styles.comparisonTable}>
          {renderComparisonRow(
            'Price per Watt',
            `$${SOLAR_EMPIRE.pricePerWatt.toFixed(2)}`,
            `$${selectedCompetitor.pricePerWatt.toFixed(2)}`,
            false
          )}
          {renderComparisonRow(
            'Warranty (Years)',
            SOLAR_EMPIRE.warranty,
            selectedCompetitor.warranty,
            true
          )}
          {renderComparisonRow(
            'Panel Efficiency',
            `${SOLAR_EMPIRE.panelEfficiency}%`,
            `${selectedCompetitor.panelEfficiency}%`,
            true
          )}
          {renderComparisonRow(
            'Install Time',
            SOLAR_EMPIRE.installTime,
            selectedCompetitor.installTime,
            false
          )}
          {renderComparisonRow(
            'Financing Available',
            SOLAR_EMPIRE.financing,
            selectedCompetitor.financing,
            true,
            true
          )}
          {renderComparisonRow(
            '24/7 Monitoring',
            SOLAR_EMPIRE.monitoring,
            selectedCompetitor.monitoring,
            true,
            true
          )}
          {renderComparisonRow(
            'Customer Rating',
            `${SOLAR_EMPIRE.rating} ⭐`,
            `${selectedCompetitor.rating} ⭐`,
            true
          )}
        </View>

        {/* Talking Points */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Key Talking Points</Text>
          <View style={styles.talkingPointsCard}>
            {SOLAR_EMPIRE.pricePerWatt < selectedCompetitor.pricePerWatt && (
              <View style={styles.talkingPoint}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.talkingPointText}>
                  We're ${(selectedCompetitor.pricePerWatt - SOLAR_EMPIRE.pricePerWatt).toFixed(2)}/watt cheaper!
                </Text>
              </View>
            )}
            {SOLAR_EMPIRE.warranty > selectedCompetitor.warranty && (
              <View style={styles.talkingPoint}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.talkingPointText}>
                  {SOLAR_EMPIRE.warranty - selectedCompetitor.warranty} years longer warranty
                </Text>
              </View>
            )}
            {SOLAR_EMPIRE.panelEfficiency > selectedCompetitor.panelEfficiency && (
              <View style={styles.talkingPoint}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.talkingPointText}>
                  {(SOLAR_EMPIRE.panelEfficiency - selectedCompetitor.panelEfficiency).toFixed(1)}% more efficient panels
                </Text>
              </View>
            )}
            {SOLAR_EMPIRE.rating > selectedCompetitor.rating && (
              <View style={styles.talkingPoint}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.talkingPointText}>
                  Higher customer satisfaction ({SOLAR_EMPIRE.rating} vs {selectedCompetitor.rating})
                </Text>
              </View>
            )}
            <View style={styles.talkingPoint}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.talkingPointText}>
                Local company = faster service & support
              </Text>
            </View>
          </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  competitorCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e3a5f',
    minWidth: 100,
  },
  competitorCardSelected: {
    borderColor: '#f59e0b',
  },
  competitorLogo: {
    fontSize: 24,
    marginBottom: 8,
  },
  competitorName: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  companyHeader: {
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    fontSize: 32,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  usBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  usBadgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '700',
  },
  vsText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
    marginHorizontal: 8,
  },
  comparisonTable: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
  },
  comparisonValues: {
    flexDirection: 'row',
    gap: 8,
  },
  valueBox: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
  },
  valueBoxWin: {
    backgroundColor: '#052e16',
  },
  valueText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  valueTextWin: {
    color: '#22c55e',
  },
  talkingPointsCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
  },
  talkingPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  talkingPointText: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
});
