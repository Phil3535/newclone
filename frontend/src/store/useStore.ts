import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Rep {
  id: string;
  name: string;
  email: string;
  phone: string;
  target_revenue: number;
  revenue_achieved: number;
  appointments_completed: number;
  appointments_scheduled: number;
  leads_assigned: number;
  deals_closed: number;
  leaderboard_rank: number;
}

interface StoreState {
  currentRepId: string | null;
  currentRep: Rep | null;
  isLoading: boolean;
  setCurrentRepId: (id: string) => void;
  setCurrentRep: (rep: Rep) => void;
  setIsLoading: (loading: boolean) => void;
  loadSavedRepId: () => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  currentRepId: null,
  currentRep: null,
  isLoading: true,
  setCurrentRepId: async (id: string) => {
    await AsyncStorage.setItem('currentRepId', id);
    set({ currentRepId: id });
  },
  setCurrentRep: (rep: Rep) => set({ currentRep: rep }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  loadSavedRepId: async () => {
    try {
      const savedId = await AsyncStorage.getItem('currentRepId');
      if (savedId) {
        set({ currentRepId: savedId });
      }
    } catch (error) {
      console.error('Error loading saved rep ID:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
