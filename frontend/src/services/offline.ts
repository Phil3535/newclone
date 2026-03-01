import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

// Offline data keys
const OFFLINE_KEYS = {
  LEADS: 'offline_leads',
  TERRITORIES: 'offline_territories',
  APPOINTMENTS: 'offline_appointments',
  REPS: 'offline_reps',
  PENDING_ACTIONS: 'offline_pending_actions',
  LAST_SYNC: 'offline_last_sync',
};

// Action types for offline queue
export type OfflineAction = {
  id: string;
  type: 'CREATE_LEAD' | 'UPDATE_LEAD' | 'CREATE_APPOINTMENT' | 'UPDATE_APPOINTMENT';
  data: any;
  timestamp: number;
  retryCount: number;
};

// Offline store state
interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingActionsCount: number;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string | null) => void;
  setPendingActionsCount: (count: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  pendingActionsCount: 0,
  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setPendingActionsCount: (count) => set({ pendingActionsCount: count }),
}));

// Cache data locally
export async function cacheData(key: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error caching ${key}:`, error);
  }
}

// Get cached data
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error getting cached ${key}:`, error);
    return null;
  }
}

// Cache leads data
export async function cacheLeads(leads: any[]): Promise<void> {
  await cacheData(OFFLINE_KEYS.LEADS, leads);
}

export async function getCachedLeads(): Promise<any[] | null> {
  return getCachedData(OFFLINE_KEYS.LEADS);
}

// Cache territories data
export async function cacheTerritories(territories: any[]): Promise<void> {
  await cacheData(OFFLINE_KEYS.TERRITORIES, territories);
}

export async function getCachedTerritories(): Promise<any[] | null> {
  return getCachedData(OFFLINE_KEYS.TERRITORIES);
}

// Cache appointments data
export async function cacheAppointments(appointments: any[]): Promise<void> {
  await cacheData(OFFLINE_KEYS.APPOINTMENTS, appointments);
}

export async function getCachedAppointments(): Promise<any[] | null> {
  return getCachedData(OFFLINE_KEYS.APPOINTMENTS);
}

// Cache reps data
export async function cacheReps(reps: any[]): Promise<void> {
  await cacheData(OFFLINE_KEYS.REPS, reps);
}

export async function getCachedReps(): Promise<any[] | null> {
  return getCachedData(OFFLINE_KEYS.REPS);
}

// Pending actions queue
export async function addPendingAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_ACTIONS);
    const actions: OfflineAction[] = existing ? JSON.parse(existing) : [];
    
    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    actions.push(newAction);
    await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_ACTIONS, JSON.stringify(actions));
    
    useOfflineStore.getState().setPendingActionsCount(actions.length);
  } catch (error) {
    console.error('Error adding pending action:', error);
  }
}

export async function getPendingActions(): Promise<OfflineAction[]> {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_ACTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting pending actions:', error);
    return [];
  }
}

export async function removePendingAction(actionId: string): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_ACTIONS);
    const actions: OfflineAction[] = existing ? JSON.parse(existing) : [];
    
    const filtered = actions.filter(a => a.id !== actionId);
    await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_ACTIONS, JSON.stringify(filtered));
    
    useOfflineStore.getState().setPendingActionsCount(filtered.length);
  } catch (error) {
    console.error('Error removing pending action:', error);
  }
}

export async function clearPendingActions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OFFLINE_KEYS.PENDING_ACTIONS);
    useOfflineStore.getState().setPendingActionsCount(0);
  } catch (error) {
    console.error('Error clearing pending actions:', error);
  }
}

// Sync pending actions when back online
export async function syncPendingActions(apiHandlers: {
  createLead: (data: any) => Promise<any>;
  updateLead: (id: string, data: any) => Promise<any>;
  createAppointment: (data: any) => Promise<any>;
  updateAppointment: (id: string, data: any) => Promise<any>;
}): Promise<{ success: number; failed: number }> {
  const actions = await getPendingActions();
  let success = 0;
  let failed = 0;
  
  useOfflineStore.getState().setSyncing(true);
  
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'CREATE_LEAD':
          await apiHandlers.createLead(action.data);
          break;
        case 'UPDATE_LEAD':
          await apiHandlers.updateLead(action.data.id, action.data.updates);
          break;
        case 'CREATE_APPOINTMENT':
          await apiHandlers.createAppointment(action.data);
          break;
        case 'UPDATE_APPOINTMENT':
          await apiHandlers.updateAppointment(action.data.id, action.data.updates);
          break;
      }
      await removePendingAction(action.id);
      success++;
    } catch (error) {
      console.error(`Failed to sync action ${action.id}:`, error);
      failed++;
    }
  }
  
  if (success > 0) {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(OFFLINE_KEYS.LAST_SYNC, now);
    useOfflineStore.getState().setLastSyncTime(now);
  }
  
  useOfflineStore.getState().setSyncing(false);
  
  return { success, failed };
}

// Network status listener
let unsubscribeNetInfo: (() => void) | null = null;

export function startNetworkListener(onStatusChange?: (isOnline: boolean) => void): void {
  unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = state.isConnected && state.isInternetReachable !== false;
    useOfflineStore.getState().setOnline(isOnline ?? false);
    onStatusChange?.(isOnline ?? false);
  });
}

export function stopNetworkListener(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}

// Check current network status
export async function checkNetworkStatus(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    const isOnline = state.isConnected && state.isInternetReachable !== false;
    useOfflineStore.getState().setOnline(isOnline ?? false);
    return isOnline ?? false;
  } catch {
    return false;
  }
}

// Initialize offline service
export async function initializeOfflineService(): Promise<void> {
  // Load last sync time
  const lastSync = await AsyncStorage.getItem(OFFLINE_KEYS.LAST_SYNC);
  if (lastSync) {
    useOfflineStore.getState().setLastSyncTime(lastSync);
  }
  
  // Load pending actions count
  const actions = await getPendingActions();
  useOfflineStore.getState().setPendingActionsCount(actions.length);
  
  // Start network listener
  startNetworkListener();
  
  // Check initial status
  await checkNetworkStatus();
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      OFFLINE_KEYS.LEADS,
      OFFLINE_KEYS.TERRITORIES,
      OFFLINE_KEYS.APPOINTMENTS,
      OFFLINE_KEYS.REPS,
      OFFLINE_KEYS.PENDING_ACTIONS,
      OFFLINE_KEYS.LAST_SYNC,
    ]);
    useOfflineStore.getState().setPendingActionsCount(0);
    useOfflineStore.getState().setLastSyncTime(null);
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
}
