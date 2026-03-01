import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  savings_annual: number;
  features: string[];
  limits: {
    leads: number;
    users: number;
    ai_proposals: number;
    ai_lead_hunter: boolean;
    team_chat: boolean;
    admin_dashboard: boolean;
    commissions: boolean;
    white_label: boolean;
    custom_branding: boolean;
    custom_domain: boolean;
    api_access: boolean;
  };
  popular: boolean;
}

interface CurrentSubscription {
  plan_id: string;
  plan_name: string;
  status: string;
  features: string[];
  limits: Record<string, number>;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<CurrentSubscription | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const currentUserId = '301b2e32-f221-48df-a8c1-bfae3a76c4c6';

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
    
    // Check if returning from payment
    if (params.session_id) {
      checkPaymentStatus(params.session_id as string);
    }
  }, [params.session_id]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions/plans`);
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions/current/${currentUserId}`);
      const data = await response.json();
      setCurrentPlan(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const checkPaymentStatus = async (sessionId: string) => {
    setPaymentStatus('checking');
    let attempts = 0;
    const maxAttempts = 5;
    
    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/api/subscriptions/status/${sessionId}`);
        const data = await response.json();
        
        if (data.payment_status === 'paid') {
          setPaymentStatus('success');
          fetchCurrentSubscription();
          return;
        } else if (data.status === 'expired') {
          setPaymentStatus('expired');
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setPaymentStatus('timeout');
        }
      } catch (error) {
        setPaymentStatus('error');
      }
    };
    
    poll();
  };

  const subscribeToPlan = async (planId: string) => {
    setProcessingPlan(planId);
    
    try {
      const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      const response = await fetch(`${API_URL}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          origin_url: originUrl,
          user_id: currentUserId,
          billing_period: isAnnual ? 'annual' : 'monthly',
        }),
      });
      
      const data = await response.json();
      
      if (data.checkout_url) {
        // Redirect to Stripe checkout
        if (typeof window !== 'undefined') {
          window.location.href = data.checkout_url;
        } else {
          await Linking.openURL(data.checkout_url);
        }
      } else if (data.success && data.plan === 'free') {
        // Free plan activated
        fetchCurrentSubscription();
        setProcessingPlan(null);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      setProcessingPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `$${price}`;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return 'rocket-outline';
      case 'starter': return 'flash-outline';
      case 'professional': return 'star';
      case 'business': return 'briefcase';
      case 'enterprise': return 'diamond';
      default: return 'star';
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free': return '#64748b';
      case 'starter': return '#3b82f6';
      case 'professional': return '#f59e0b';
      case 'business': return '#22c55e';
      case 'enterprise': return '#8b5cf6';
      default: return '#3b82f6';
    }
  };

  const isPopularPlan = (planId: string) => planId === 'professional';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading plans...</Text>
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
          <Text style={styles.title}>Subscription Plans</Text>
          <Text style={styles.subtitle}>Choose the right plan for your team</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Payment Status Banner */}
      {paymentStatus && (
        <View style={[
          styles.statusBanner,
          paymentStatus === 'success' && styles.statusSuccess,
          paymentStatus === 'checking' && styles.statusPending,
          (paymentStatus === 'expired' || paymentStatus === 'error') && styles.statusError,
        ]}>
          {paymentStatus === 'checking' && (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.statusText}>Verifying payment...</Text>
            </>
          )}
          {paymentStatus === 'success' && (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.statusText}>Payment successful! Your plan is now active.</Text>
            </>
          )}
          {paymentStatus === 'expired' && (
            <>
              <Ionicons name="alert-circle" size={20} color="#ffffff" />
              <Text style={styles.statusText}>Payment session expired. Please try again.</Text>
            </>
          )}
          {paymentStatus === 'error' && (
            <>
              <Ionicons name="close-circle" size={20} color="#ffffff" />
              <Text style={styles.statusText}>Payment verification failed.</Text>
            </>
          )}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <Text style={[styles.billingOption, !isAnnual && styles.billingOptionActive]}>Monthly</Text>
          <Switch
            value={isAnnual}
            onValueChange={setIsAnnual}
            trackColor={{ false: '#1e3a5f', true: '#22c55e' }}
            thumbColor={isAnnual ? '#ffffff' : '#94a3b8'}
          />
          <View style={styles.annualOption}>
            <Text style={[styles.billingOption, isAnnual && styles.billingOptionActive]}>Annual</Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 20%</Text>
            </View>
          </View>
        </View>

        {/* Current Plan Info */}
        {currentPlan && (
          <View style={styles.currentPlanCard}>
            <Text style={styles.currentPlanLabel}>Current Plan</Text>
            <View style={styles.currentPlanInfo}>
              <Text style={styles.currentPlanName}>{currentPlan.plan_name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: currentPlan.status === 'active' ? '#22c55e20' : '#f59e0b20' }]}>
                <Text style={[styles.statusBadgeText, { color: currentPlan.status === 'active' ? '#22c55e' : '#f59e0b' }]}>
                  {currentPlan.status}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Plans */}
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan?.plan_id === plan.id;
          const planColor = getPlanColor(plan.id);
          const isPlanPopular = isPopularPlan(plan.id);
          const displayPrice = isAnnual ? plan.price_annual : plan.price_monthly;
          const monthlyEquivalent = isAnnual ? Math.round(plan.price_annual / 12) : plan.price_monthly;
          
          return (
            <View 
              key={plan.id} 
              style={[
                styles.planCard,
                isPlanPopular && styles.planCardPopular,
                isCurrentPlan && styles.planCardCurrent,
              ]}
            >
              {isPlanPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}
              
              {isAnnual && plan.savings_annual > 0 && (
                <View style={styles.savingsTag}>
                  <Text style={styles.savingsTagText}>Save ${Math.round(plan.savings_annual)}/yr</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, { backgroundColor: planColor + '20' }]}>
                  <Ionicons name={getPlanIcon(plan.id) as any} size={28} color={planColor} />
                </View>
                <View style={styles.planTitleSection}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.planPrice}>{displayPrice === 0 ? 'Free' : `$${monthlyEquivalent}`}</Text>
                    {displayPrice > 0 && <Text style={styles.planPeriod}>/month</Text>}
                  </View>
                  {isAnnual && displayPrice > 0 && (
                    <Text style={styles.billedAnnually}>Billed annually (${displayPrice.toLocaleString()})</Text>
                  )}
                </View>
              </View>

              <View style={styles.featuresSection}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.limitsSection}>
                <Text style={styles.limitsTitle}>Limits</Text>
                <View style={styles.limitsRow}>
                  <View style={styles.limitItem}>
                    <Text style={styles.limitValue}>
                      {plan.limits.leads === -1 ? '∞' : plan.limits.leads.toLocaleString()}
                    </Text>
                    <Text style={styles.limitLabel}>Leads</Text>
                  </View>
                  <View style={styles.limitItem}>
                    <Text style={styles.limitValue}>
                      {plan.limits.users === -1 ? '∞' : plan.limits.users}
                    </Text>
                    <Text style={styles.limitLabel}>Users</Text>
                  </View>
                  <View style={styles.limitItem}>
                    <Text style={styles.limitValue}>
                      {plan.limits.ai_proposals === -1 ? '∞' : plan.limits.ai_proposals}
                    </Text>
                    <Text style={styles.limitLabel}>AI Proposals</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  isCurrentPlan && styles.selectButtonCurrent,
                  isPlanPopular && !isCurrentPlan && styles.selectButtonPopular,
                ]}
                onPress={() => !isCurrentPlan && subscribeToPlan(plan.id)}
                disabled={isCurrentPlan || processingPlan === plan.id}
                data-testid={`select-plan-${plan.id}`}
              >
                {processingPlan === plan.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[
                    styles.selectButtonText,
                    isPlanPopular && !isCurrentPlan && styles.selectButtonTextPopular,
                  ]}>
                    {isCurrentPlan ? 'Current Plan' : plan.price === 0 ? 'Get Started' : 'Subscribe'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Enterprise Contact */}
        <View style={styles.enterpriseCard}>
          <Ionicons name="business" size={32} color="#8b5cf6" />
          <Text style={styles.enterpriseTitle}>Need a custom plan?</Text>
          <Text style={styles.enterpriseText}>
            Contact us for custom pricing, volume discounts, and enterprise features.
          </Text>
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="mail" size={18} color="#8b5cf6" />
            <Text style={styles.contactButtonText}>Contact Sales</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#f59e0b',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  statusSuccess: {
    backgroundColor: '#22c55e',
  },
  statusPending: {
    backgroundColor: '#f59e0b',
  },
  statusError: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  billingOption: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  billingOptionActive: {
    color: '#ffffff',
  },
  annualOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  saveBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  savingsTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1,
  },
  savingsTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  billedAnnually: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  currentPlanCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  currentPlanLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  currentPlanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentPlanName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  planCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  planCardPopular: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  planCardCurrent: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#0a1628',
    fontSize: 11,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  planTitleSection: {},
  planName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  planPrice: {
    color: '#f59e0b',
    fontSize: 28,
    fontWeight: '800',
  },
  planPeriod: {
    color: '#64748b',
    fontSize: 14,
    marginLeft: 4,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    color: '#e2e8f0',
    fontSize: 14,
    flex: 1,
  },
  limitsSection: {
    backgroundColor: '#1e3a5f30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  limitsTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  limitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  limitItem: {
    alignItems: 'center',
  },
  limitValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  limitLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  selectButton: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonCurrent: {
    backgroundColor: '#22c55e30',
  },
  selectButtonPopular: {
    backgroundColor: '#f59e0b',
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  selectButtonTextPopular: {
    color: '#0a1628',
  },
  enterpriseCard: {
    backgroundColor: '#8b5cf610',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8b5cf630',
  },
  enterpriseTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  enterpriseText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    gap: 8,
  },
  contactButtonText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
});
