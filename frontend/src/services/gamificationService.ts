import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  xp: number;
  completedAt?: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xp: number;
  type: 'leads' | 'appointments' | 'calls' | 'closes';
  expiresAt: string;
}

export interface UserStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalLeads: number;
  totalAppointments: number;
  totalCloses: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export const BADGES: Badge[] = [
  { id: 'first_lead', name: 'First Contact', description: 'Add your first lead', icon: 'person-add', color: '#3b82f6' },
  { id: 'lead_hunter', name: 'Lead Hunter', description: 'Add 10 leads', icon: 'people', color: '#8b5cf6', target: 10 },
  { id: 'lead_master', name: 'Lead Master', description: 'Add 50 leads', icon: 'people-circle', color: '#f59e0b', target: 50 },
  { id: 'first_appointment', name: 'Calendar Starter', description: 'Schedule your first appointment', icon: 'calendar', color: '#22c55e' },
  { id: 'appointment_pro', name: 'Appointment Pro', description: 'Complete 25 appointments', icon: 'calendar-outline', color: '#06b6d4', target: 25 },
  { id: 'first_close', name: 'Closer', description: 'Close your first deal', icon: 'checkmark-circle', color: '#10b981' },
  { id: 'deal_maker', name: 'Deal Maker', description: 'Close 10 deals', icon: 'trophy', color: '#f59e0b', target: 10 },
  { id: 'streak_3', name: 'On Fire', description: '3 day activity streak', icon: 'flame', color: '#f97316', target: 3 },
  { id: 'streak_7', name: 'Week Warrior', description: '7 day activity streak', icon: 'flame', color: '#ef4444', target: 7 },
  { id: 'streak_30', name: 'Unstoppable', description: '30 day activity streak', icon: 'rocket', color: '#8b5cf6', target: 30 },
  { id: 'early_bird', name: 'Early Bird', description: 'Log activity before 8 AM', icon: 'sunny', color: '#fbbf24' },
  { id: 'night_owl', name: 'Night Owl', description: 'Log activity after 8 PM', icon: 'moon', color: '#6366f1' },
  { id: 'hot_streak', name: 'Hot Streak', description: 'Score 3 hot leads in a day', icon: 'flash', color: '#ef4444', target: 3 },
  { id: 'territory_explorer', name: 'Territory Explorer', description: 'Work leads in 5 territories', icon: 'map', color: '#14b8a6', target: 5 },
  { id: 'ai_believer', name: 'AI Believer', description: 'Use AI scoring 20 times', icon: 'hardware-chip', color: '#8b5cf6', target: 20 },
];

const XP_PER_LEVEL = 1000;

export function calculateLevel(xp: number): { level: number; currentXp: number; xpToNextLevel: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentXp = xp % XP_PER_LEVEL;
  return { level, currentXp, xpToNextLevel: XP_PER_LEVEL };
}

export function generateDailyChallenges(): DailyChallenge[] {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  return [
    {
      id: `daily_leads_${now.toISOString().split('T')[0]}`,
      title: 'Lead Generator',
      description: 'Add 3 new leads today',
      target: 3,
      current: 0,
      xp: 100,
      type: 'leads',
      expiresAt: endOfDay.toISOString(),
    },
    {
      id: `daily_appointments_${now.toISOString().split('T')[0]}`,
      title: 'Calendar Champion',
      description: 'Complete 2 appointments today',
      target: 2,
      current: 0,
      xp: 150,
      type: 'appointments',
      expiresAt: endOfDay.toISOString(),
    },
    {
      id: `daily_closes_${now.toISOString().split('T')[0]}`,
      title: 'Deal Closer',
      description: 'Close 1 deal today',
      target: 1,
      current: 0,
      xp: 250,
      type: 'closes',
      expiresAt: endOfDay.toISOString(),
    },
  ];
}

export async function loadUserStats(): Promise<UserStats> {
  try {
    const data = await AsyncStorage.getItem('gamification_stats');
    if (data) return JSON.parse(data);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
  
  return {
    level: 1,
    xp: 0,
    xpToNextLevel: XP_PER_LEVEL,
    totalLeads: 0,
    totalAppointments: 0,
    totalCloses: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDate: '',
  };
}

export async function saveUserStats(stats: UserStats): Promise<void> {
  try {
    await AsyncStorage.setItem('gamification_stats', JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving stats:', error);
  }
}

export async function loadUnlockedBadges(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem('unlocked_badges');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

export async function unlockBadge(badgeId: string): Promise<void> {
  const unlocked = await loadUnlockedBadges();
  if (!unlocked.includes(badgeId)) {
    unlocked.push(badgeId);
    await AsyncStorage.setItem('unlocked_badges', JSON.stringify(unlocked));
  }
}

export async function addXP(amount: number): Promise<{ newLevel: boolean; level: number }> {
  const stats = await loadUserStats();
  const oldLevel = calculateLevel(stats.xp).level;
  stats.xp += amount;
  const newLevelData = calculateLevel(stats.xp);
  stats.level = newLevelData.level;
  stats.xpToNextLevel = newLevelData.xpToNextLevel;
  await saveUserStats(stats);
  return { newLevel: newLevelData.level > oldLevel, level: newLevelData.level };
}

export async function updateStreak(): Promise<number> {
  const stats = await loadUserStats();
  const today = new Date().toISOString().split('T')[0];
  const lastActive = stats.lastActiveDate;
  
  if (lastActive === today) {
    return stats.streak;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (lastActive === yesterdayStr) {
    stats.streak += 1;
  } else {
    stats.streak = 1;
  }
  
  if (stats.streak > stats.longestStreak) {
    stats.longestStreak = stats.streak;
  }
  
  stats.lastActiveDate = today;
  await saveUserStats(stats);
  return stats.streak;
}
