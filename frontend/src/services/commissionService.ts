import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CommissionData {
  totalEarned: number;
  pendingCommission: number;
  paidCommission: number;
  thisMonth: number;
  lastMonth: number;
  thisQuarter: number;
  yearToDate: number;
  projectedMonthly: number;
  projectedQuarterly: number;
  projectedYearly: number;
  deals: CommissionDeal[];
  tier: CommissionTier;
}

export interface CommissionDeal {
  id: string;
  leadName: string;
  dealValue: number;
  commission: number;
  status: 'pending' | 'approved' | 'paid';
  closedDate: string;
  paidDate?: string;
}

export interface CommissionTier {
  name: string;
  rate: number;
  minDeals: number;
  maxDeals: number;
  color: string;
  nextTier?: {
    name: string;
    rate: number;
    dealsNeeded: number;
  };
}

export const COMMISSION_TIERS: CommissionTier[] = [
  { name: 'Bronze', rate: 0.05, minDeals: 0, maxDeals: 4, color: '#cd7f32' },
  { name: 'Silver', rate: 0.07, minDeals: 5, maxDeals: 9, color: '#c0c0c0' },
  { name: 'Gold', rate: 0.10, minDeals: 10, maxDeals: 19, color: '#ffd700' },
  { name: 'Platinum', rate: 0.12, minDeals: 20, maxDeals: 29, color: '#e5e4e2' },
  { name: 'Diamond', rate: 0.15, minDeals: 30, maxDeals: Infinity, color: '#b9f2ff' },
];

export function getCurrentTier(dealsThisMonth: number): CommissionTier {
  for (let i = COMMISSION_TIERS.length - 1; i >= 0; i--) {
    if (dealsThisMonth >= COMMISSION_TIERS[i].minDeals) {
      const tier = { ...COMMISSION_TIERS[i] };
      if (i < COMMISSION_TIERS.length - 1) {
        tier.nextTier = {
          name: COMMISSION_TIERS[i + 1].name,
          rate: COMMISSION_TIERS[i + 1].rate,
          dealsNeeded: COMMISSION_TIERS[i + 1].minDeals - dealsThisMonth,
        };
      }
      return tier;
    }
  }
  return COMMISSION_TIERS[0];
}

export function calculateCommission(dealValue: number, tier: CommissionTier): number {
  return Math.round(dealValue * tier.rate);
}

export function projectEarnings(
  currentDeals: number,
  avgDealValue: number,
  daysRemaining: number,
  avgDealsPerDay: number
): { monthly: number; quarterly: number; yearly: number } {
  const projectedDealsThisMonth = currentDeals + Math.round(avgDealsPerDay * daysRemaining);
  const projectedTier = getCurrentTier(projectedDealsThisMonth);
  
  const monthlyDeals = avgDealsPerDay * 30;
  const quarterlyDeals = monthlyDeals * 3;
  const yearlyDeals = monthlyDeals * 12;
  
  return {
    monthly: Math.round(monthlyDeals * avgDealValue * projectedTier.rate),
    quarterly: Math.round(quarterlyDeals * avgDealValue * projectedTier.rate),
    yearly: Math.round(yearlyDeals * avgDealValue * projectedTier.rate),
  };
}

export async function saveCommissionData(data: CommissionData): Promise<void> {
  await AsyncStorage.setItem('commission_data', JSON.stringify(data));
}

export async function loadCommissionData(): Promise<CommissionData | null> {
  const data = await AsyncStorage.getItem('commission_data');
  return data ? JSON.parse(data) : null;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getMotivationalMessage(tier: CommissionTier, projectedEarnings: number): string {
  if (tier.nextTier && tier.nextTier.dealsNeeded <= 2) {
    return `🔥 Just ${tier.nextTier.dealsNeeded} more deal${tier.nextTier.dealsNeeded > 1 ? 's' : ''} to reach ${tier.nextTier.name} tier and earn ${Math.round((tier.nextTier.rate - tier.rate) * 100)}% more commission!`;
  }
  if (projectedEarnings >= 10000) {
    return `💰 You're on track to earn ${formatCurrency(projectedEarnings)} this month! Keep crushing it!`;
  }
  if (tier.name === 'Diamond') {
    return `💎 You're at the top tier! Every deal earns you maximum commission!`;
  }
  return `📈 Keep closing deals to level up your commission rate!`;
}
