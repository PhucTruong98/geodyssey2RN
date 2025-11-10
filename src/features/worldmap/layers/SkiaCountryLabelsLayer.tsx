import { Text, matchFont } from '@shopify/react-native-skia';
import React, { useMemo, useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
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

interface VisibleLabel extends CountryCentroid {
  screenX: number;
  screenY: number;
}

/**
 * Country Labels Layer - Skia-based rendering
 * - Renders labels directly in Skia (UI thread only)
 * - Uses React state for label visibility, but filters on worklet thread
 * - Smooth 60fps rendering without stuttering
 */
interface SkiaCountryLabelsLayerProps {
  transform: any;
  constants: any;
  shouldRerender: any;
  centroids: any[];
}

export const SkiaCountryLabelsLayer: React.FC<SkiaCountryLabelsLayerProps> = ({
  transform,
  constants,
  shouldRerender,
  centroids,
}) => {
  const [visibleLabels, setVisibleLabels] = useState<VisibleLabel[]>([]);


  // Create Skia font for text rendering
  const skiaFont = useMemo(() => {
    return matchFont({
      fontSize: FONT_SIZE,
      fontFamily: 'System',
    });
  }, []);

  // Function to compute visible labels
  const computeVisibleLabels = React.useCallback(() => {
    if (!centroids || centroids.length === 0) {
      setVisibleLabels([]);
      return;
    }

    const scale = transform.scale.value;
    const tx = transform.x.value;
    const ty = transform.y.value;
    const initialScale = constants.initialScale;

    const zoomRatio = scale / initialScale;

    // Determine area threshold based on zoom level
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
    const minX = (-tx / scale) - VIEWPORT_MARGIN;
    const maxX = ((screenWidth - tx) / scale) + VIEWPORT_MARGIN;
    const minY = (-ty / scale) - VIEWPORT_MARGIN;
    const maxY = ((screenHeight - ty) / scale) + VIEWPORT_MARGIN;

    // Filter labels by size and viewport, and calculate screen positions
    const filtered = centroids.filter((country: CountryCentroid) => {
      if (country.area < areaThreshold) return false;
      if (country.x < minX || country.x > maxX) return false;
      if (country.y < minY || country.y > maxY) return false;
      return true;
    });

    const result = filtered.map((country: CountryCentroid) => ({
      ...country,
      screenX: country.x * scale + tx,
      screenY: country.y * scale + ty,
    }));

    setVisibleLabels(result);
  }, [centroids, transform, constants]);

  // Watch for shouldRerender changes and recompute visible labels
  useAnimatedReaction(
    () => shouldRerender.value,
    () => {
      'worklet';
      runOnJS(computeVisibleLabels)();
    },
    []
  );

  // Also compute on initial mount and when centroids change
  useEffect(() => {
    computeVisibleLabels();
  }, [centroids, computeVisibleLabels]);

  // Render labels directly
  return (
    <>
      {visibleLabels.map((label) => (
        <Text
          key={label.id}
          text={label.id}
          font={skiaFont}
          color={LABEL_COLOR}
          x={label.screenX - FONT_SIZE / 2}
          y={label.screenY - FONT_SIZE / 2}
        />
      ))}
    </>
  );
};
