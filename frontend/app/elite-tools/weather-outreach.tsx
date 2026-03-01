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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://empire-sales-suite.preview.emergentagent.com';

interface WeatherResult {
  zip_code: string;
  weather: {
    condition: string;
    temperature_f: number;
    humidity_percent: number;
    uv_index: number;
    solar_irradiance_kwh_m2: number;
  };
  triggers: {
    temperature_triggered: boolean;
    condition_triggered: boolean;
    should_outreach: boolean;
    solar_score: number;
    suggested_message: string;
  };
}

interface CampaignSuggestion {
  campaign_type: string;
  subject_line: string;
  target_zips: string[];
  urgency: string;
  best_send_time: string;
}

interface TriggerData {
  checked_at: string;
  zip_codes_checked: number;
  triggers_found: number;
  triggered_areas: Array<{
    zip_code: string;
    reason: string;
    message: string;
  }>;
  campaign_suggestions: CampaignSuggestion[];
  detailed_results: WeatherResult[];
}

export default function WeatherOutreachScreen() {
  const router = useRouter();
  const [zipCodes, setZipCodes] = useState('90210, 90211, 85001, 77001');
  const [tempThreshold, setTempThreshold] = useState('85');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TriggerData | null>(null);

  const checkTriggers = async () => {
    setLoading(true);
    try {
      const zips = zipCodes.split(',').map(z => z.trim()).filter(z => z);
      const response = await fetch(`${API_URL}/api/intelligence/weather/check-triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip_codes: zips,
          trigger_temp_f: parseFloat(tempThreshold),
          trigger_conditions: ['sunny', 'clear', 'hot'],
        }),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to check weather triggers');
    } finally {
      setLoading(false);
    }
  };

  const getConditionIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('sunny') || c.includes('clear')) return 'sunny';
    if (c.includes('cloud')) return 'cloudy';
    if (c.includes('rain')) return 'rainy';
    if (c.includes('hot')) return 'flame';
    return 'partly-sunny';
  };

  const getConditionColor = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('sunny') || c.includes('clear')) return '#fbbf24';
    if (c.includes('hot')) return '#ef4444';
    if (c.includes('cloud')) return '#94a3b8';
    return '#3b82f6';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#ef4444';
      case 'medium': return '#f97316';
      default: return '#22c55e';
    }
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
          <Ionicons name="sunny" size={16} color="#fbbf24" />
          <Text style={styles.headerBadgeText}>INTELLIGENCE</Text>
        </View>
        <Text style={styles.headerTitle}>Weather Outreach</Text>
        <Text style={styles.headerSubtitle}>Auto-campaigns based on solar conditions</Text>
      </LinearGradient>

      {/* Config */}
      <View style={styles.configContainer}>
        <Text style={styles.sectionTitle}>Configure Triggers</Text>
        
        <Text style={styles.inputLabel}>ZIP Codes (comma separated)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="90210, 90211, 85001"
          placeholderTextColor="#64748b"
          value={zipCodes}
          onChangeText={setZipCodes}
          data-testid="zip-codes-input"
        />
        
        <Text style={styles.inputLabel}>Temperature Trigger (°F)</Text>
        <View style={styles.tempRow}>
          <TouchableOpacity 
            style={styles.tempButton}
            onPress={() => setTempThreshold(t => String(Math.max(60, parseInt(t) - 5)))}
          >
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.tempValue}>{tempThreshold}°F</Text>
          <TouchableOpacity 
            style={styles.tempButton}
            onPress={() => setTempThreshold(t => String(Math.min(110, parseInt(t) + 5)))}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.checkButton}
          onPress={checkTriggers}
          disabled={loading}
          data-testid="check-triggers-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.checkButtonText}>Check Conditions</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {data && (
        <>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{data.zip_codes_checked}</Text>
                <Text style={styles.summaryLabel}>ZIPs Checked</Text>
              </View>
              <View style={[styles.summaryItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#334155' }]}>
                <Text style={[styles.summaryValue, { color: '#22c55e' }]}>{data.triggers_found}</Text>
                <Text style={styles.summaryLabel}>Triggers Found</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#f97316' }]}>{data.campaign_suggestions.length}</Text>
                <Text style={styles.summaryLabel}>Campaigns</Text>
              </View>
            </View>
          </View>

          {/* Campaign Suggestions */}
          {data.campaign_suggestions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended Campaigns</Text>
              
              {data.campaign_suggestions.map((campaign, index) => (
                <View key={index} style={styles.campaignCard}>
                  <View style={styles.campaignHeader}>
                    <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(campaign.urgency) }]}>
                      <Text style={styles.urgencyText}>{campaign.urgency.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.campaignType}>{campaign.campaign_type.replace('_', ' ')}</Text>
                  </View>
                  
                  <Text style={styles.subjectLine}>{campaign.subject_line}</Text>
                  
                  <View style={styles.campaignMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time" size={14} color="#64748b" />
                      <Text style={styles.metaText}>{campaign.best_send_time}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location" size={14} color="#64748b" />
                      <Text style={styles.metaText}>{campaign.target_zips.join(', ')}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.launchButton}
                    onPress={() => Alert.alert('Coming Soon', 'One-click campaign launch will be available soon!')}
                    data-testid={`launch-campaign-${index}`}
                  >
                    <Ionicons name="rocket" size={16} color="#fff" />
                    <Text style={styles.launchButtonText}>Launch Campaign</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Weather Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed Weather</Text>
            
            {data.detailed_results.map((result, index) => (
              <View 
                key={index} 
                style={[
                  styles.weatherCard, 
                  result.triggers.should_outreach && styles.weatherCardTriggered
                ]}
              >
                <View style={styles.weatherHeader}>
                  <View style={styles.zipBadge}>
                    <Text style={styles.zipText}>{result.zip_code}</Text>
                  </View>
                  
                  <View style={styles.weatherCondition}>
                    <Ionicons 
                      name={getConditionIcon(result.weather.condition) as any} 
                      size={24} 
                      color={getConditionColor(result.weather.condition)} 
                    />
                    <Text style={styles.conditionText}>{result.weather.condition}</Text>
                  </View>
                </View>
                
                <View style={styles.weatherStats}>
                  <View style={styles.weatherStat}>
                    <Text style={styles.weatherStatValue}>{result.weather.temperature_f}°F</Text>
                    <Text style={styles.weatherStatLabel}>Temp</Text>
                  </View>
                  <View style={styles.weatherStat}>
                    <Text style={styles.weatherStatValue}>UV {result.weather.uv_index}</Text>
                    <Text style={styles.weatherStatLabel}>Index</Text>
                  </View>
                  <View style={styles.weatherStat}>
                    <Text style={styles.weatherStatValue}>{result.weather.solar_irradiance_kwh_m2}</Text>
                    <Text style={styles.weatherStatLabel}>kWh/m²</Text>
                  </View>
                  <View style={styles.weatherStat}>
                    <Text style={[styles.weatherStatValue, { color: '#22c55e' }]}>{result.triggers.solar_score}</Text>
                    <Text style={styles.weatherStatLabel}>Score</Text>
                  </View>
                </View>
                
                {result.triggers.should_outreach && (
                  <View style={styles.triggerMessage}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.triggerMessageText}>{result.triggers.suggested_message}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {!data && !loading && (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-outline" size={64} color="#64748b" />
          <Text style={styles.emptyTitle}>Weather Intelligence</Text>
          <Text style={styles.emptyText}>
            Enter ZIP codes to check solar conditions and get campaign recommendations
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
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 30,
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
  configContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 20,
  },
  tempButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    minWidth: 100,
    textAlign: 'center',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  checkButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  summaryCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  campaignCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  campaignType: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 10,
    textTransform: 'capitalize',
  },
  subjectLine: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  campaignMeta: {
    gap: 8,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 13,
    marginLeft: 8,
  },
  launchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  launchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  weatherCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  weatherCardTriggered: {
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  zipBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  zipText: {
    color: '#fff',
    fontWeight: '600',
  },
  weatherCondition: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionText: {
    color: '#fff',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  weatherStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
  },
  weatherStat: {
    alignItems: 'center',
  },
  weatherStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  weatherStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  triggerMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  triggerMessageText: {
    color: '#22c55e',
    fontSize: 13,
    marginLeft: 8,
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
