import { create } from 'zustand';
import { MapState } from '@/types';

interface MapStore extends MapState {
  setScale: (scale: number) => void;
  setTranslate: (x: number, y: number) => void;
  reset: () => void;
}

const initialState: MapState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
};

export const useMapStore = create<MapStore>((set) => ({
  ...initialState,
  setScale: (scale) => set({ scale }),
  setTranslate: (translateX, translateY) => set({ translateX, translateY }),
  reset: () => set(initialState),
}));