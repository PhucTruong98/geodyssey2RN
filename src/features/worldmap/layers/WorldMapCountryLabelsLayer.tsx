import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle
} from 'react-native-reanimated';
import { useMapContext } from '../WorldMapMainComponent';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Font configuration for labels
const FONT_SIZE = 12;
const LABEL_COLOR = '#FF0000';

// Area thresholds for zoom-based filtering
const AREA_THRESHOLDS = {
  EXTRA_LARGE: 2000,
  LARGE: 700,
  MEDIUM: 150,
  SMALL: 10,
  EXTRA_SMALL: 1,
};

const VIEWPORT_MARGIN = 0;

interface CountryCentroid {
  id: string;
  x: number;
  y: number;
  area: number;
  width: number;
  height: number;
}

/**
 * Country Labels Layer - Pure Reanimated + React
 * - Visibility filtering triggered by shouldRerender signal from SkiaWorldMap
 * - Individual label animation on UI thread (useAnimatedStyle)
 * - No Skia overhead, simpler and more reliable
 * - Throttle logic centralized in SkiaWorldMap for better performance
 */
export const WorldMapCountryLabelsLayer: React.FC = () => {
  const context = useMapContext() as any;
  const { transform, constants, shouldRerender } = context;
  const countryCentroids: CountryCentroid[] = context.centroids || [];

  // State for visible countries - controls which labels are rendered
  const [visibleCountries, setVisibleCountries] = useState<CountryCentroid[]>([]);

  // Callback to update visible countries
  const updateVisibleCountries = useCallback((

  ) => {
    // Determine area threshold based on zoom level
    const zoomRatio = transform.scale.value / constants.initialScale;

    let areaThreshold: number;
    if (zoomRatio < 1.2) {
      areaThreshold = AREA_THRESHOLDS.EXTRA_LARGE;
    } else if (zoomRatio < 2.0) {
      areaThreshold = AREA_THRESHOLDS.LARGE;
    } else if (zoomRatio < 3.5) {
      areaThreshold = AREA_THRESHOLDS.MEDIUM;
    } else if (zoomRatio < 6.0) {
      areaThreshold = AREA_THRESHOLDS.SMALL;
    } else {
      areaThreshold = AREA_THRESHOLDS.EXTRA_SMALL;
    }

    // Calculate visible bounds in map coordinates
    const minX = (-transform.x.value / transform.scale.value) - VIEWPORT_MARGIN;
    const maxX = ((screenWidth - transform.x.value) / transform.scale.value) + VIEWPORT_MARGIN;
    const minY = (-transform.y.value / transform.scale.value) - VIEWPORT_MARGIN;
    const maxY = ((screenHeight - transform.y.value) / transform.scale.value) + VIEWPORT_MARGIN;

    // Filter labels by size and viewport
    const filtered = countryCentroids.filter((country) => {
      if (country.area < areaThreshold) return false;
      if (country.x < minX || country.x > maxX) return false;
      if (country.y < minY || country.y > maxY) return false;
      return true;
    });

    console.log('✅ Visible countries:', filtered.length);
    setVisibleCountries(filtered);
  }, [countryCentroids]);

  // Initialize visible countries when centroids are loaded
  useEffect(() => {
    if (countryCentroids.length === 0) return;

    console.log('🎯 Initializing visible countries with', countryCentroids.length, 'centroids');
    updateVisibleCountries();
  }, [countryCentroids, updateVisibleCountries]);

  // Watch shouldRerender signal from SkiaWorldMap for throttled updates
  // SkiaWorldMap handles all throttle logic and toggles this when transform changes significantly
  useAnimatedReaction(
    () => shouldRerender.value,
    () => {
      'worklet';
      // Triggered when SkiaWorldMap signals a significant transform change
      runOnJS(updateVisibleCountries)();
      console.log('🔄 Labels updated via shouldRerender signal');
    },
    [updateVisibleCountries]
  );

  // Create individual label components
  const labelElements = useMemo(() => {
    return visibleCountries.map((country) => (
      <CountryLabelComponent
        key={country.id}
        country={country}
        transform={transform}
      />
    ));
  }, [visibleCountries, transform]);

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      {labelElements}
    </Animated.View>
  );
};

/**
 * Individual country label component
 * Uses useAnimatedStyle to position label based on map coordinates
 */
const CountryLabelComponent: React.FC<{
  country: CountryCentroid;
  transform: any;
}> = ({ country, transform }) => {
  // Calculate screen position from map coordinates
  const animatedStyle = useAnimatedStyle(() => {
    const scale = transform.scale.value;
    const tx = transform.x.value;
    const ty = transform.y.value;

    // Convert map coordinates to screen coordinates
    const screenX = country.x * scale + tx;
    const screenY = country.y * scale + ty;

    return {
      position: 'absolute',
      left: screenX,
      top: screenY,
      transform: [{ translateX: -FONT_SIZE / 2 }, { translateY: -FONT_SIZE / 2 }],
    };
  }, [country.x, country.y]);

  return (
    <Animated.View style={animatedStyle}>
      <Text
        style={{
          fontSize: FONT_SIZE,
          fontWeight: 'bold',
          color: LABEL_COLOR,
        }}
      >
        {country.id}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
});
