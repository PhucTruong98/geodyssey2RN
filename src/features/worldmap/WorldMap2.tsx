import { useTheme } from '@/hooks';
import { Asset } from 'expo-asset';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Function to parse SVG path and calculate bounding box
const getPathBoundingBox = (pathData: string) => {
  const coords = pathData.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g);
  if (!coords || coords.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  coords.forEach(coord => {
    const [x, y] = coord.split(',').map(Number);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return { minX, minY, maxX, maxY };
};

// Function to check if a bounding box is visible in the current viewport
const isCountryVisible = (
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  viewportBounds: { left: number; top: number; right: number; bottom: number }
) => {
  return !(
    bbox.maxX < viewportBounds.left ||
    bbox.minX > viewportBounds.right ||
    bbox.maxY < viewportBounds.top ||
    bbox.minY > viewportBounds.bottom
  );
};

export const WorldMap2: React.FC = () => {
  const theme = useTheme();
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string, bbox: any}[]>([]);

  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const aspectRatio = svgOriginalWidth / svgOriginalHeight;
  // Render at 2x size to improve quality when scaled
  const mapHeight = screenHeight * 2;
  const mapWidth = mapHeight * aspectRatio;
  const minScale = 0.5; // Start at 0.5 scale since map is 2x size
  const maxScale = 2.5;

  const scale = useSharedValue(0.5);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const baseScale = useSharedValue(0.5);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const svgUrl = require('../../../assets/world-map.svg');
        const asset = Asset.fromModule(svgUrl);
        await asset.downloadAsync();

        const response = await fetch(asset.uri);
        if (response.ok) {
          const svgText = await response.text();
          const lines = svgText.split('\n');
          const paths: {id: string, d: string, bbox: any}[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('<path') && line.includes('>')) {
              const idMatch = line.match(/id="([^"]*)"/);
              const pathMatch = line.match(/d="([^"]*)"/);
              const countryId = idMatch ? idMatch[1] : '';
              const pathData = pathMatch ? pathMatch[1] : '';

              if (countryId && pathData) {
                const bbox = getPathBoundingBox(pathData);
                if (bbox) {
                  paths.push({ id: countryId, d: pathData, bbox });
                }
              }
            }
          }

          setCountryPaths(paths);
          console.log(`Loaded ${paths.length} country paths with bounding boxes`);
        }
      } catch (error) {
        console.error('Error loading map data:', error);
        setCountryPaths([]);
      }
    };

    loadMapData();
  }, []);

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      baseScale.value = scale.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
    })
    .onUpdate(event => {
      const newScale = Math.max(minScale, Math.min(maxScale, baseScale.value * event.scale));
      const scaleDelta = newScale / baseScale.value;

      const focalPointOffsetX = focalX.value - screenWidth / 2;
      const focalPointOffsetY = focalY.value - screenHeight / 2;

      const newTranslateX = baseTranslateX.value + focalPointOffsetX * (1 - scaleDelta);
      const newTranslateY = baseTranslateY.value + focalPointOffsetY * (1 - scaleDelta);

      scale.value = newScale;

      const scaledMapWidth = mapWidth * newScale;
      const scaledMapHeight = mapHeight * newScale;

      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight) / 2);

      translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
      translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));
    })
    .onEnd(() => {
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
      baseScale.value = scale.value;

      // Update viewport state for culling (throttled)
      runOnJS(updateViewport)(scale.value, translateX.value, translateY.value);
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
    })
    .onUpdate(event => {
      const currentScale = scale.value;
      const scaledMapWidth = mapWidth * currentScale;
      const scaledMapHeight = mapHeight * currentScale;

      const maxTranslateX = Math.max(0, scaledMapWidth - screenWidth);
      const maxTranslateY = Math.max(0, scaledMapHeight - screenHeight);

      const newTranslateX = baseTranslateX.value + event.translationX;
      const newTranslateY = baseTranslateY.value + event.translationY;

      translateX.value = Math.min(0, Math.max(-maxTranslateX, newTranslateX));
      translateY.value = Math.min(0, Math.max(-maxTranslateY, newTranslateY));
    })
    .onEnd(() => {
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;

      // Update viewport state for culling (throttled)
      runOnJS(updateViewport)(scale.value, translateX.value, translateY.value);
    });

  const composedGesture = Gesture.Race(Gesture.Simultaneous(pinchGesture, panGesture));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    transformOrigin: 'top left',
  }));

  // Use React state for viewport tracking (update on gesture end, not during)
  const [viewportState, setViewportState] = useState({
    scale: 0.5,
    translateX: 0,
    translateY: 0
  });

  // Throttle viewport updates
  const lastUpdateTime = useRef(0);
  const updateViewport = useCallback((s: number, tx: number, ty: number) => {
    const now = Date.now();
    if (now - lastUpdateTime.current > 100) { // Update max once per 100ms
      lastUpdateTime.current = now;
      setViewportState({ scale: s, translateX: tx, translateY: ty });
    }
  }, []);

  // Calculate current viewport bounds in SVG coordinate space
  const viewportBounds = useMemo(() => {
    // Since we render at 2x and start at 0.5 scale, effective initial scale is 1
    const initialScale = mapHeight / svgOriginalHeight;

    // Convert screen coordinates to SVG coordinates
    const left = (-viewportState.translateX) / (viewportState.scale * initialScale);
    const top = (-viewportState.translateY) / (viewportState.scale * initialScale);
    const right = left + (screenWidth / (viewportState.scale * initialScale));
    const bottom = top + (screenHeight / (viewportState.scale * initialScale));

    return { left, top, right, bottom };
  }, [viewportState, mapHeight]);

  // Filter visible countries based on viewport
  const visibleCountries = useMemo(() => {
    return countryPaths.filter(country =>
      country.bbox && isCountryVisible(country.bbox, viewportBounds)
    );
  }, [countryPaths, viewportBounds]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.mapContainer, animatedStyle]}>
          <View style={[styles.oceanBackground, { width: mapWidth, height: mapHeight }]} />
          {countryPaths.length > 0 ? (
            <Svg
              width={mapWidth}
              height={mapHeight}
              viewBox="0 0 1000 482"
              style={styles.svgMap}
            >
              {visibleCountries.map((country) => (
                <Path
                  key={country.id}
                  d={country.d}
                  fill="#FFFFE0"
                  stroke="#000000"
                  strokeWidth="0.3"
                />
              ))}
            </Svg>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  oceanBackground: {
    position: 'absolute',
    backgroundColor: 'rgb(109, 204, 236)',
  },
  svgMap: {
    position: 'absolute',
  },
});
