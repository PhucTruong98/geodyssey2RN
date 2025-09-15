import { create } from 'zustand';
import { UIState } from '@/types';

interface UIStore extends UIState {
  setTheme: (theme: UIState['theme']) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
}));