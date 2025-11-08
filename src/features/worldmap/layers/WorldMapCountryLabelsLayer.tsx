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
  LARGE: 700,
  MEDIUM: 150,
  SMALL: 10,
};

const VIEWPORT_MARGIN = 50;
const SCALE_THROTTLE = 0.3;
const TRANSLATION_THROTTLE = 200;

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
 * - Visibility filtering on JS thread (controlled via setState)
 * - Individual label animation on UI thread (useAnimatedStyle)
 * - No Skia overhead, simpler and more reliable
 */
export const WorldMapCountryLabelsLayer: React.FC = () => {
  const context = useMapContext() as any;
  const { transform, constants } = context;
  const countryCentroids: CountryCentroid[] = context.centroids || [];

  // State for visible countries - controls which labels are rendered
  const [visibleCountries, setVisibleCountries] = useState<CountryCentroid[]>([]);

  // Callback to update visible countries
  const updateVisibleCountries = useCallback((
    scale: number,
    tx: number,
    ty: number,
    initialScale: number
  ) => {
    // Determine area threshold based on zoom level
    const zoomRatio = scale / initialScale;

    let areaThreshold: number;
    if (zoomRatio < 1.5) {
      areaThreshold = AREA_THRESHOLDS.LARGE;
    } else if (zoomRatio < 3.0) {
      areaThreshold = AREA_THRESHOLDS.MEDIUM;
    } else {
      areaThreshold = AREA_THRESHOLDS.SMALL;
    }

    // Calculate visible bounds in map coordinates
    const minX = (-tx / scale) - VIEWPORT_MARGIN;
    const maxX = ((screenWidth - tx) / scale) + VIEWPORT_MARGIN;
    const minY = (-ty / scale) - VIEWPORT_MARGIN;
    const maxY = ((screenHeight - ty) / scale) + VIEWPORT_MARGIN;

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
    updateVisibleCountries(
      transform.scale.value,
      transform.x.value,
      transform.y.value,
      constants.initialScale
    );
  }, [countryCentroids.length > 0 ? countryCentroids[0]?.id : null]);

  // React to transform changes and update visible labels
  useAnimatedReaction(
    () => {
      return {
        scale: transform.scale.value,
        tx: transform.x.value,
        ty: transform.y.value,
      };
    },
    (current, previous) => {
      'worklet';
      const { scale, tx, ty } = current;

      // Skip first call to establish baseline
      if (!previous) {
        runOnJS(updateVisibleCountries)(scale, tx, ty, constants.initialScale);
        return;
      }

      // Calculate absolute changes
      const scaleDiff = Math.abs(scale - previous.scale);
      const txDiff = Math.abs(tx - previous.tx);
      const tyDiff = Math.abs(ty - previous.ty);





      // Update if ANY value changed significantly
      let shouldUpdate =
        scaleDiff >= SCALE_THROTTLE ||
        txDiff >= TRANSLATION_THROTTLE ||
        tyDiff >= TRANSLATION_THROTTLE;

        console.log('🔍 Transform update:', {
          'scaleDiff': scaleDiff,
          'txDiff': txDiff,
          'tyDiff': tyDiff,
          'scale': scale,
          'tx': tx,
          'ty': ty,
          'previous': previous,
          "shouldUpdate": shouldUpdate,
        });

        // shouldUpdate = true;
      if (shouldUpdate) {
        runOnJS(updateVisibleCountries)(scale, tx, ty, constants.initialScale);
      }
    },
    [constants.initialScale]
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
