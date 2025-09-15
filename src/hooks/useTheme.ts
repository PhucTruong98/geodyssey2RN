import { useColorScheme } from 'react-native';
import { useUIStore } from '@/store';
import { Theme } from '@/types';

const lightTheme: Theme = {
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    card: '#F2F2F7',
    text: '#000000',
    border: '#C6C6C8',
    notification: '#FF3B30',
  },
};

const darkTheme: Theme = {
  colors: {
    primary: '#0A84FF',
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    border: '#38383A',
    notification: '#FF453A',
  },
};

export const useTheme = (): Theme => {
  const systemScheme = useColorScheme();
  const { theme } = useUIStore();

  const activeScheme = theme === 'system' ? systemScheme : theme;
  return activeScheme === 'dark' ? darkTheme : lightTheme;
};