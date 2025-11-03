import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMapTransform } from './hooks/useMapTransform';
import { CountrySkiaLayerComponent } from './layers/CountrySkiaLayerComponent';
import { WorldMapCountryLabelsLayer } from './layers/WorldMapCountryLabelsLayer';
import { SkiaWorldMap } from './SkiaWorldMap';

/**
 * Main container component for the world map
 * Manages shared transform state and coordinates all map layers
 */
export const WorldMapMainComponent: React.FC = () => {
  const mapTransform = useMapTransform();
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: { flex: 1 },
    overlay: {
      ...StyleSheet.absoluteFillObject,     // sits over the whole map
      // no background so fully transparent
    },
  });


  return (
    <MapContext.Provider
      value={{
        transform: mapTransform.transform,
        constants: mapTransform.constants,
        utils: mapTransform.utils,
        centroids: mapTransform.centroids,
        setCentroids: mapTransform.setCentroids,
        selectedCountryCode,
        setSelectedCountryCode,
      }}
    >
      
      <View style={styles.container}>
        {/* Base map layer */}
        {/* <WorldMapSVGLayer/> */}
        <SkiaWorldMap></SkiaWorldMap>


        {/* Detailed country layer (Skia) - shown when country is selected */}
        <CountrySkiaLayerComponent countryCode={selectedCountryCode} />

        <View style={styles.overlay} pointerEvents="box-none">
          <WorldMapCountryLabelsLayer />
        </View>

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
  centroids: any[];
  setCentroids: (centroids: any[]) => void;
  selectedCountryCode: string | null;
  setSelectedCountryCode: (countryCode: string | null) => void;
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

