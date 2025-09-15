import { useEffect, useState } from 'react';

export const useIsOnline = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // For React Native, we'll use a simple approach
    // In a production app, you might want to use @react-native-community/netinfo
    setIsOnline(true);
  }, []);

  return isOnline;
};