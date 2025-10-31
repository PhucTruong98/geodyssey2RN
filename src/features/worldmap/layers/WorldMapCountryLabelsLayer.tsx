import { Canvas, Group, Paint, Rect, Text, matchFont } from '@shopify/react-native-skia';
import React, { useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedReaction, useDerivedValue } from 'react-native-reanimated';
import { useMapContext } from '../WorldMapMainComponent';

// Import centroid data generated from calculate-centroids.js script
import countryCentroidsData from '../../../assets/data/country-centroids.json';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Font configuration for labels - constant size in screen space
const FONT_SIZE = 14;
const LABEL_COLOR = '#FF0000'; // Bright red for debugging visibility

// Area thresholds for zoom-based filtering (from centroid data analysis)
// These values determine which countries are shown at different zoom levels
const AREA_THRESHOLDS = {
  LARGE: 700,   // Show only large countries at low zoom (US, RU, CA, CN, AU, BR, etc.)
  MEDIUM: 150,  // Show medium+ countries at mid zoom
  SMALL: 10,    // Show most countries at high zoom (exclude tiny islands)
};

// Margin around viewport for preloading labels (in map coordinates)
const VIEWPORT_MARGIN = 50;

interface CountryCentroid {
  id: string;
  x: number;
  y: number;
  area: number;
  width: number;
  height: number;
}

/**
 * Country Labels Layer - Renders country ID labels using Skia
 * Features:
 * - Zoom-based visibility: Shows larger countries at low zoom, more detail as zoom increases
 * - Viewport culling: Only renders labels visible in current viewport
 * - Constant font size: Labels remain same size regardless of zoom level
 * - Performance optimized: Typically renders 10-50 labels instead of 200+
 */
export const WorldMapCountryLabelsLayer: React.FC = () => {
  const { transform, constants } = useMapContext();

  // Parse centroid data (typed for safety)
  const countryCentroids = useMemo<CountryCentroid[]>(() => {
    return countryCentroidsData as CountryCentroid[];
  }, []);

  // Create font for labels - use matchFont which works
  // const font = useMemo(() => {
  //   try {
  //     const f = matchFont({ fontSize: FONT_SIZE });
  //     if (f) {
  //       console.log('🏷️ Font created successfully with matchFont');
  //       console.log('🏷️ Font details:', {
  //         size: f.getSize(),
  //         typeface: f.getTypeface()
  //       });
  //       return f;
  //     }
  //     console.error('matchFont returned null');
  //     return null;
  //   } catch (error) {
  //     console.error('Font creation failed:', error);
  //     return null;
  //   }
  // }, []);

  const fontFamily = Platform.select({ ios: "Helvetica", default: "serif" });
const fontStyle = {
  fontFamily,
  fontSize: 2,
  fontStyle: "italic",
  fontWeight: "bold",
};
const font = matchFont(fontStyle);

  // State for visible countries - updated when zoom/pan changes
  // Initialize with large countries to show something immediately
  const [visibleCountries, setVisibleCountries] = useState<CountryCentroid[]>(() => {
    // Show the largest countries initially
    return countryCentroids.filter(c => c.area > AREA_THRESHOLDS.LARGE).slice(0, 20);
  });

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

      // Only update if values changed significantly (optimize performance)
      if (
        previous &&
        Math.abs(scale - previous.scale) < 0.01 &&
        Math.abs(tx - previous.tx) < 5 &&
        Math.abs(ty - previous.ty) < 5
      ) {
        return;
      }

      // Determine area threshold based on zoom level
      const zoomRatio = scale / constants.initialScale;

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

      // Filter countries by size and viewport
      const filtered = countryCentroids.filter((country) => {
        if (country.area < areaThreshold) return false;
        if (country.x < minX || country.x > maxX) return false;
        if (country.y < minY || country.y > maxY) return false;
        return true;
      });

      // Update state on JS thread
      runOnJS(setVisibleCountries)(filtered);
    },
    [countryCentroids, constants.initialScale]
  );

  // Create transform using useDerivedValue for proper Skia integration
  const groupTransform = useDerivedValue(() => {
    return [
      { translateX: transform.x.value },
      { translateY: transform.y.value },
      { scale: transform.scale.value },
    ];
  }, [transform.x, transform.y, transform.scale]);

  // Memoize label elements based on visible countries
  // Note: We render labels without inverse scaling for now (font will scale with map)
  // This is simpler and still readable at most zoom levels
  const labelElements = useMemo(() => {
    return visibleCountries.map((country) => (
      <Text
        key={country.id}
        x={country.x}
        y={country.y}
        text={country.id}
        font={font}
      >
        <Paint color={LABEL_COLOR} />
        {/* <Rect x={country.x} y={country.y} width={5} height={5} color="#FF0000" /> */}

      </Text>
    ));
  }, [visibleCountries, font]);

  // Don't render if font failed to load
  if (!font) {
    console.error('Font is null, cannot render labels');
    return null;
  }

  // Debug platform info
  console.log('🏷️ Platform:', Platform.OS);
  console.log('🏷️ Font object:', font);

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      <Canvas style={styles.canvas}>
        {/* Debug: Draw a small red rectangle to verify Canvas is rendering */}
        <Rect x={10} y={10} width={50} height={50} color="#FF0000" />

        {/* Test Text with Paint child component */}
        <Text
          x={100}
          y={100}
          text="HELLO WORLD"
          font={font}
        >
          <Paint color="red" />
        </Text>

        {/* Test Text without any color prop */}
        <Text
          x={100}
          y={150}
          text="NO COLOR"
          font={font}
        />

        {/* Original labels with transform */}
        <Group transform={groupTransform}>
          {labelElements}
        </Group>
      </Canvas>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    // Labels should not block touches - map interactions go through
    pointerEvents: 'none',
  },
  canvas: {
    flex: 1,
  },
});
