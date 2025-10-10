import { useMapStore } from '@/store';
import { Asset } from 'expo-asset';
import React, { useEffect, useState, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  withDecay,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const svgOriginalWidth = 1000;
const svgOriginalHeight = 482;
// Render SVG at higher resolution for better quality when zoomed
const resolutionMultiplier = 4;
const svgRenderWidth = svgOriginalWidth * resolutionMultiplier;
const svgRenderHeight = svgOriginalHeight * resolutionMultiplier;

export const D3ZoomWorldMap: React.FC = () => {
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string}[]>([]);

  // Shared values for animation
  const mapScale = useSharedValue(1);
  const mapTranslateX = useSharedValue(0);
  const mapTranslateY = useSharedValue(0);

  // Base values for gestures
  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const initialScale = screenHeight / svgRenderHeight;
  const minScale = initialScale;
  const maxScale = 20;

  // Load map data
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
          const paths: {id: string, d: string}[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('<path') && line.includes('>')) {
              const idMatch = line.match(/id="([^"]*)"/);
              const pathMatch = line.match(/d="([^"]*)"/);
              const countryId = idMatch ? idMatch[1] : '';
              const pathData = pathMatch ? pathMatch[1] : '';

              if (countryId && pathData) {
                paths.push({ id: countryId, d: pathData });
              }
            }
          }

          setCountryPaths(paths);
          console.log(`Loaded ${paths.length} country paths for D3 zoom`);
        }
      } catch (error) {
        console.error('Error loading map data:', error);
      }
    };

    loadMapData();
  }, []);

  // Set initial scale
  useEffect(() => {
    mapScale.value = initialScale;
    setScale(initialScale);
  }, []);

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      baseScale.value = mapScale.value;
      baseTranslateX.value = mapTranslateX.value;
      baseTranslateY.value = mapTranslateY.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onUpdate((event) => {
      // Calculate new scale with constraints
      const newScale = Math.max(minScale, Math.min(maxScale, baseScale.value * event.scale));

      // Calculate the focal point position in map coordinates
      const mapPointX = (focalX.value - baseTranslateX.value) / baseScale.value;
      const mapPointY = (focalY.value - baseTranslateY.value) / baseScale.value;

      // New translation to keep the focal point fixed
      const newTranslateX = focalX.value - mapPointX * newScale;
      const newTranslateY = focalY.value - mapPointY * newScale;

      // Calculate boundaries
      const scaledMapWidth = svgRenderWidth * newScale;
      const scaledMapHeight = svgRenderHeight * newScale;

      const minTranslateX = screenWidth - scaledMapWidth;
      const maxTranslateX = 0;
      const minTranslateY = screenHeight - scaledMapHeight;
      const maxTranslateY = 0;

      const constrainedX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
      const constrainedY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));

      // Update shared values
      mapScale.value = newScale;
      mapTranslateX.value = constrainedX;
      mapTranslateY.value = constrainedY;
    })
    .onEnd(() => {
      // Update base values for next gesture
      baseScale.value = mapScale.value;
      baseTranslateX.value = mapTranslateX.value;
      baseTranslateY.value = mapTranslateY.value;

      // Update store
      runOnJS(setScale)(mapScale.value);
      runOnJS(setTranslate)(mapTranslateX.value, mapTranslateY.value);
    });

  // Pan gesture with momentum
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      baseTranslateX.value = mapTranslateX.value;
      baseTranslateY.value = mapTranslateY.value;
    })
    .onUpdate((event) => {
      const currentScale = mapScale.value;

      // Calculate boundaries
      const scaledMapWidth = svgRenderWidth * currentScale;
      const scaledMapHeight = svgRenderHeight * currentScale;

      const newTranslateX = baseTranslateX.value + event.translationX;
      const newTranslateY = baseTranslateY.value + event.translationY;

      const minTranslateX = screenWidth - scaledMapWidth;
      const maxTranslateX = 0;
      const minTranslateY = screenHeight - scaledMapHeight;
      const maxTranslateY = 0;

      // Constrain translation
      const constrainedX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
      const constrainedY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));

      // Update shared values
      mapTranslateX.value = constrainedX;
      mapTranslateY.value = constrainedY;
    })
    .onEnd((event) => {
      const currentScale = mapScale.value;
      const scaledMapWidth = svgRenderWidth * currentScale;
      const scaledMapHeight = svgRenderHeight * currentScale;

      const minTranslateX = screenWidth - scaledMapWidth;
      const maxTranslateX = 0;
      const minTranslateY = screenHeight - scaledMapHeight;
      const maxTranslateY = 0;

      // Apply momentum with decay
      mapTranslateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [minTranslateX, maxTranslateX],
        deceleration: 0.998,
      });

      mapTranslateY.value = withDecay({
        velocity: event.velocityY,
        clamp: [minTranslateY, maxTranslateY],
        deceleration: 0.998,
      });

      // Update store after gesture ends
      runOnJS(setTranslate)(mapTranslateX.value, mapTranslateY.value);
    });

  // Compose gestures to work simultaneously
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Animated style for View-based transform (more performant than SVG animatedProps)
  const animatedStyle = {
    transform: [
      { translateX: mapTranslateX },
      { translateY: mapTranslateY },
      { scale: mapScale }
    ],
  };

  // Memoize country paths to prevent re-renders
  const countryElements = useMemo(() => {
    return countryPaths.map((country) => (
      <Path
        key={country.id}
        d={country.d}
        fill="#FFFFE0"
        stroke="#000000"
        strokeWidth={0.1 * resolutionMultiplier}
      />
    ));
  }, [countryPaths]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[{ width: svgRenderWidth, height: svgRenderHeight }, animatedStyle]}>
          <Svg
            width={svgRenderWidth}
            height={svgRenderHeight}
            viewBox={`0 0 ${svgOriginalWidth} ${svgOriginalHeight}`}
          >
            {/* Ocean background */}
            <Path d="M0,0 L1000,0 L1000,482 L0,482 Z" fill="rgb(109, 204, 236)" />

            {/* Countries */}
            {countryElements}
          </Svg>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(109, 204, 236)',
  },
});
