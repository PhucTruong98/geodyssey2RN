import { Canvas, Group, matchFont, Picture, Skia, SkPicture } from '@shopify/react-native-skia';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';
import Animated, { useAnimatedReaction, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { useMapContext } from '../WorldMapMainComponent';

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

interface LabelPicture {
  id: string;
  picture: SkPicture;
  x: number;
  y: number;
  area: number;
}

/**
 * Create a Skia Picture for a text label
 * This pre-renders the text once, which can then be GPU-cached and repositioned
 */
const createLabelPicture = (text: string, font: any, color: string): SkPicture => {
  const recorder = Skia.PictureRecorder();

  // Measure text to get dimensions
  const textWidth = font.getTextWidth(text);
  const fontSize = font.getSize();

  // Add padding around text
  const padding = 2;
  const width = textWidth + padding * 2;
  const height = fontSize + padding * 2;

  const canvas = recorder.beginRecording({
    x: 0,
    y: 0,
    width,
    height,
  });

  // Create paint for text
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setAntiAlias(true);

  // Draw text (centered in the picture bounds)
  canvas.drawText(text, padding, padding + fontSize * 0.8, paint, font);

  // Finish recording and return the picture
  return recorder.finishRecordingAsPicture();
};

/**
 * Country Labels Layer - Renders country ID labels using Skia
 * Features:
 * - Zoom-based visibility: Shows larger countries at low zoom, more detail as zoom increases
 * - Viewport culling: Only renders labels visible in current viewport
 * - Constant font size: Labels remain same size regardless of zoom level
 * - Performance optimized: Typically renders 10-50 labels instead of 200+
 */
export const WorldMapCountryLabelsLayer: React.FC = () => {
  const context = useMapContext() as any;
  const { transform, constants } = context;
  const countryCentroids: CountryCentroid[] = context.centroids || [];

  // SharedValue to hold centroids for access in worklets (Reanimated-safe)
  const centroidsSharedValue = useSharedValue<CountryCentroid[]>(countryCentroids);
  React.useEffect(() => {
    centroidsSharedValue.value = countryCentroids;
  }, [countryCentroids, centroidsSharedValue]);

  // Create font for label Pictures
  const font = useMemo(() => {
    const fontFamily = Platform.select({
      ios: "Helvetica",
      android: "sans-serif",
      default: "Arial"
    });

    const fontStyle = {
      fontFamily,
      fontSize: 12,  // Font size for pre-rendered Pictures
      fontWeight: "bold" as const,
    };

    return matchFont(fontStyle);
  }, []);

  // State for pre-rendered label Pictures
  const [labelPictures, setLabelPictures] = React.useState<LabelPicture[]>([]);

  // SharedValue for visible countries - updated on UI thread when zoom/pan changes
  // Initialize empty, will be populated when centroids load
  const visibleCountries = useSharedValue<CountryCentroid[]>([]);

  // Pre-render all label Pictures at startup
  useEffect(() => {
    if (!font || countryCentroids.length === 0) return;

    console.log('🏷️ Pre-rendering label Pictures...');
    const pictures: LabelPicture[] = [];

    for (const country of countryCentroids) {
      try {
        const picture = createLabelPicture(country.id, font, LABEL_COLOR);
        pictures.push({
          id: country.id,
          picture,
          x: country.x,
          y: country.y,
          area: country.area,
        });
      } catch (error) {
        console.error(`Failed to create picture for ${country.id}:`, error);
      }
    }



    setLabelPictures(pictures);
    console.log(`✅ Pre-rendered ${pictures.length} label Pictures`);
 
    // Initialize visible countries with large countries
    visibleCountries.value = countryCentroids.filter(c => c.area > AREA_THRESHOLDS.LARGE).slice(0, 20);
  }, [font, countryCentroids]);

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

      // Filter label pictures by size and viewport
      // Access centroids from shared value (Reanimated-safe)
      const filtered = (centroidsSharedValue.value || []).filter((country: any) => {
        if (country.area < areaThreshold) return false;
        if (country.x < minX || country.x > maxX) return false;
        if (country.y < minY || country.y > maxY) return false;
        return true;
      });

      // Update shared value directly on UI thread (no JS bridge)
      visibleCountries.value = filtered;
      console.log('🔍 Filtered countries:', visibleCountries.value);
    },
    [centroidsSharedValue, constants.initialScale]
  );

  // State to trigger debug effect at regular intervals
  const [debugTrigger, setDebugTrigger] = useState(0);

  // Monitor transform changes and trigger debug effect
  useEffect(() => {
    const interval = setInterval(() => {
      // Update trigger to force useEffect to run
      setDebugTrigger(prev => (prev + 1) % 1000);
    }, 100); // Run every 100ms (10 times per second)

    return () => clearInterval(interval);
  }, []);

  // DEBUGGABLE: useEffect version of the label filtering logic (runs on JS thread)
  // Use this when you need to debug the filtering logic with breakpoints
  // useEffect(() => {
  //   const scale = transform.scale.value;
  //   const tx = transform.x.value;
  //   const ty = transform.y.value;

  //   // Only update if values changed significantly (optimize performance)
  //   // (Skip the throttling check for now - comment this back in if needed)

  //   // Determine area threshold based on zoom level
  //   const zoomRatio = scale / constants.initialScale;

  //   let areaThreshold: number;
  //   if (zoomRatio < 1.5) {
  //     areaThreshold = AREA_THRESHOLDS.LARGE;
  //   } else if (zoomRatio < 3.0) {
  //     areaThreshold = AREA_THRESHOLDS.MEDIUM;
  //   } else {
  //     areaThreshold = AREA_THRESHOLDS.SMALL;
  //   }

  //   // Calculate visible bounds in map coordinates
  //   const minX = (-tx / scale) - VIEWPORT_MARGIN;
  //   const maxX = ((screenWidth - tx) / scale) + VIEWPORT_MARGIN;
  //   const minY = (-ty / scale) - VIEWPORT_MARGIN;
  //   const maxY = ((screenHeight - ty) / scale) + VIEWPORT_MARGIN;

  //   console.log('🔍 JS Thread Filtering:', {
  //     scale,
  //     tx,
  //     ty,
  //     zoomRatio,
  //     areaThreshold,
  //     bounds: { minX, maxX, minY, maxY },
  //     totalCentroids: countryCentroids.length,
  //   });

  //   // Filter label pictures by size and viewport
  //   const filtered = countryCentroids.filter((country) => {
  //     if (country.area < areaThreshold) return false;
  //     if (country.x < minX || country.x > maxX) return false;
  //     if (country.y < minY || country.y > maxY) return false;
  //     return true;
  //   });

  //   console.log('✅ Filtered countries:', filtered.length, filtered.map(c => c.id).slice(0, 5));

  //   // Update shared value
  //   visibleCountries.value = filtered;
  // }, [debugTrigger]);





  // Create transform using useDerivedValue for proper Skia integration
  const groupTransform = useDerivedValue(() => {
    return [
      { translateX: transform.x.value },
      { translateY: transform.y.value },
      { scale: transform.scale.value },
    ];
  }, [transform.x, transform.y, transform.scale]);

  // Create a map for quick Picture lookup
  const pictureMap = useMemo(() => {
    const map = new Map<string, SkPicture>();
    for (const label of labelPictures) {
      map.set(label.id, label.picture);
    }
    return map;
  }, [labelPictures]);

  // Create label elements using useMemo with pictureMap and labelPictures dependencies
  // Read visibleCountries.value directly to get latest UI-thread state
  // Don't include visibleCountries in dependencies since it's a SharedValue (reference doesn't change)
  const labelElements = useMemo(() => {
    if (labelPictures.length === 0) return null;

    return countryCentroids.map((country) => {
      const picture = pictureMap.get(country.id);
      if (!picture) return null;

      return (
        <Group
          key={country.id}
          // Position the picture at country centroid
          transform={[
            { translateX: country.x },
            { translateY: country.y },
          ]}
        >
          <Picture picture={picture} />
        </Group>
      );
    }).filter(Boolean);
  }, [pictureMap, labelPictures, visibleCountries.value]);

  // Don't render if font failed to load or Pictures not ready
  if (!font || labelPictures.length === 0) {
    return null;
  }

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      <Canvas style={styles.canvas}>
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
