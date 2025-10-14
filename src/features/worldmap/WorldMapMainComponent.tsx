import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMapTransform } from './hooks/useMapTransform';
import { WorldMapSVGLayer } from './layers/WorldMapSVGLayer';

/**
 * Main container component for the world map
 * Manages shared transform state and coordinates all map layers
 */
export const WorldMapMainComponent: React.FC = () => {
  const mapTransform = useMapTransform();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  return (
    <MapContext.Provider
      value={{
        transform: mapTransform.transform,
        constants: mapTransform.constants,
        utils: mapTransform.utils,
        selectedCountry,
        setSelectedCountry,
      }}
    >
      <View style={styles.container}>
        {/* Base map layer */}
        <WorldMapSVGLayer />

        {/* Country name labels layer */}
        {/* <CountryNameLayer /> */}

        {/* Future layers can be added here */}
      </View>
    </MapContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});

// Context for sharing map state with child layers
export const MapContext = React.createContext<{
  transform: {
    x: any; // Reanimated.SharedValue<number>
    y: any;
    scale: any;
  };
  constants: {
    MAP_WIDTH: number;
    MAP_HEIGHT: number;
    initialScale: number;
  };
  utils: {
    screenToMap: (screenX: number, screenY: number, scale: number, x: number, y: number) => { x: number; y: number };
    mapToScreen: (mapX: number, mapY: number, scale: number, x: number, y: number) => { x: number; y: number };
    getVisibleBounds: (screenWidth: number, screenHeight: number, scale: number, x: number, y: number) => any;
    isPointVisible: (mapX: number, mapY: number, screenWidth: number, screenHeight: number, scale: number, x: number, y: number) => boolean;
  };
  selectedCountry: string | null;
  setSelectedCountry: (countryId: string | null) => void;
} | null>(null);

/**
 * Hook to access map context from child layers
 */
export const useMapContext = () => {
  const context = React.useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within WorldMapMainComponent');
  }
  return context;
};
