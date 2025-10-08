import { useMapStore } from '@/store';
import { Asset } from 'expo-asset';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withDecay
} from 'react-native-reanimated';
import Svg, { Path, G } from 'react-native-svg';

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

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

export const SvgWorldMap2: React.FC = () => {
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string, bbox: any}[]>([]);

  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const initialScale = screenHeight / svgOriginalHeight;

  // Shared values for gestures
  const mapScale = useSharedValue(initialScale);
  const mapTranslateX = useSharedValue(0);
  const mapTranslateY = useSharedValue(0);

  const baseScale = useSharedValue(initialScale);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

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
                paths.push({ id: countryId, d: pathData, bbox });
              }
            }
          }

          setCountryPaths(paths);
          console.log(`Loaded ${paths.length} country paths`);
        }
      } catch (error) {
        console.error('Error loading map data:', error);
      }
    };

    loadMapData();
  }, []);

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      baseScale.value = mapScale.value;
      baseTranslateX.value = mapTranslateX.value;
      baseTranslateY.value = mapTranslateY.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onUpdate(event => {
      const newScale = Math.max(initialScale, Math.min(5, baseScale.value * event.scale));
      const mapPointX = (focalX.value - baseTranslateX.value) / baseScale.value;
      const mapPointY = (focalY.value - baseTranslateY.value) / baseScale.value;
      const newTranslateX = focalX.value - mapPointX * newScale;
      const newTranslateY = focalY.value - mapPointY * newScale;

      const scaledMapWidth = svgOriginalWidth * newScale;
      const scaledMapHeight = svgOriginalHeight * newScale;
      const minTranslateX = screenWidth - scaledMapWidth;
      const maxTranslateX = 0;
      const minTranslateY = screenHeight - scaledMapHeight;
      const maxTranslateY = 0;

      const constrainedX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
      const constrainedY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));

      mapScale.value = newScale;
      mapTranslateX.value = constrainedX;
      mapTranslateY.value = constrainedY;
    })
    .onEnd(() => {
      baseTranslateX.value = mapTranslateX.value;
      baseTranslateY.value = mapTranslateY.value;
      baseScale.value = mapScale.value;
      runOnJS(setScale)(mapScale.value);
      runOnJS(setTranslate)(mapTranslateX.value, mapTranslateY.value);
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      baseTranslateX.value = mapTranslateX.value;
      baseTranslateY.value = mapTranslateY.value;
    })
    .onUpdate(event => {
      const currentScale = mapScale.value;
      const scaledMapWidth = svgOriginalWidth * currentScale;
      const scaledMapHeight = svgOriginalHeight * currentScale;
      const newTranslateX = baseTranslateX.value + event.translationX;
      const newTranslateY = baseTranslateY.value + event.translationY;

      const minTranslateX = screenWidth - scaledMapWidth;
      const maxTranslateX = 0;
      const minTranslateY = screenHeight - scaledMapHeight;
      const maxTranslateY = 0;

      const constrainedX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
      const constrainedY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));

      mapTranslateX.value = constrainedX;
      mapTranslateY.value = constrainedY;
    })
    .onEnd(event => {
      const currentScale = mapScale.value;
      const scaledMapWidth = svgOriginalWidth * currentScale;
      const scaledMapHeight = svgOriginalHeight * currentScale;
      const minTranslateX = screenWidth - scaledMapWidth;
      const maxTranslateX = 0;
      const minTranslateY = screenHeight - scaledMapHeight;
      const maxTranslateY = 0;

      mapTranslateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [minTranslateX, maxTranslateX],
        deceleration: 0.998,
      }, (finished) => {
        if (finished) {
          runOnJS(setTranslate)(mapTranslateX.value, mapTranslateY.value);
        }
      });

      mapTranslateY.value = withDecay({
        velocity: event.velocityY,
        clamp: [minTranslateY, maxTranslateY],
        deceleration: 0.998,
      }, (finished) => {
        if (finished) {
          runOnJS(setTranslate)(mapTranslateX.value, mapTranslateY.value);
        }
      });

      baseTranslateX.value = mapTranslateX.value;
      baseTranslateY.value = mapTranslateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Create animated G component
  const AnimatedG = Animated.createAnimatedComponent(G);

  // Animated props for SVG transform - stays vector!
  const animatedProps = useAnimatedProps(() => {
    return {
      transform: [
        { translateX: mapTranslateX.value },
        { translateY: mapTranslateY.value },
        { scale: mapScale.value }
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.container}>
        <Svg width={screenWidth} height={screenHeight}>
          <AnimatedG animatedProps={animatedProps}>
            {/* Ocean background */}
            <Path d="M0,0 L1000,0 L1000,482 L0,482 Z" fill="rgb(109, 204, 236)" />

            {/* Each country with BOTH fill and stroke in ONE Path element */}
            {countryPaths.map((country) => (
              <Path
                key={country.id}
                d={country.d}
                fill="#FFFFE0"
                stroke="#000000"
                strokeWidth={0.1}
              />
            ))}
          </AnimatedG>
        </Svg>
      </View>
    </GestureDetector>
  );
};

// Also export as SvgWorldMap for compatibility
export const SvgWorldMap = SvgWorldMap2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(109, 204, 236)',
  },
});
