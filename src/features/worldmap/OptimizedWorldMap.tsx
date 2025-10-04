import { useTheme } from '@/hooks';
import { useMapStore } from '@/store';
import { Asset } from 'expo-asset';
import React, { useEffect, useState, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Simplified path data - only major countries/continents for better performance
const SIMPLIFIED_WORLD_PATHS = [
  // North America
  { id: 'US', d: 'M 200,150 L 350,150 L 350,250 L 200,250 Z', name: 'United States' },
  { id: 'CA', d: 'M 200,100 L 350,100 L 350,150 L 200,150 Z', name: 'Canada' },
  { id: 'MX', d: 'M 220,250 L 320,250 L 300,300 L 240,300 Z', name: 'Mexico' },

  // South America
  { id: 'BR', d: 'M 300,350 L 400,350 L 420,450 L 280,450 Z', name: 'Brazil' },
  { id: 'AR', d: 'M 280,450 L 380,450 L 360,550 L 300,550 Z', name: 'Argentina' },

  // Europe
  { id: 'GB', d: 'M 480,150 L 520,150 L 520,180 L 480,180 Z', name: 'United Kingdom' },
  { id: 'FR', d: 'M 480,180 L 520,180 L 520,220 L 480,220 Z', name: 'France' },
  { id: 'DE', d: 'M 520,160 L 560,160 L 560,200 L 520,200 Z', name: 'Germany' },
  { id: 'RU', d: 'M 560,100 L 750,100 L 750,250 L 560,250 Z', name: 'Russia' },

  // Africa
  { id: 'EG', d: 'M 520,240 L 580,240 L 580,280 L 520,280 Z', name: 'Egypt' },
  { id: 'ZA', d: 'M 520,400 L 580,400 L 580,460 L 520,460 Z', name: 'South Africa' },

  // Asia
  { id: 'CN', d: 'M 700,180 L 800,180 L 800,280 L 700,280 Z', name: 'China' },
  { id: 'IN', d: 'M 650,250 L 720,250 L 720,350 L 650,350 Z', name: 'India' },
  { id: 'JP', d: 'M 820,200 L 860,200 L 860,260 L 820,260 Z', name: 'Japan' },

  // Australia
  { id: 'AU', d: 'M 750,400 L 850,400 L 850,460 L 750,460 Z', name: 'Australia' },
];

export const OptimizedWorldMap: React.FC = () => {
  const theme = useTheme();
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();

  const animatedScale = useSharedValue(Math.max(scale, 1.0));
  const animatedTranslateX = useSharedValue(translateX);
  const animatedTranslateY = useSharedValue(translateY);

  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(translateX);
  const baseTranslateY = useSharedValue(translateY);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Base map dimensions
  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 500;
  const aspectRatio = svgOriginalWidth / svgOriginalHeight;
  const mapHeight = screenHeight;
  const mapWidth = mapHeight * aspectRatio;
  const minScale = 1.0;

  // Dynamic resolution based on zoom level
  const currentResolution = useMemo(() => {
    const zoomLevel = animatedScale.value;
    if (zoomLevel < 2) return 1; // 1x resolution for low zoom
    if (zoomLevel < 4) return 2; // 2x resolution for medium zoom
    return 3; // 3x resolution for high zoom
  }, [animatedScale.value]);

  const zoomToCountry = (countryId: string) => {
    const country = SIMPLIFIED_WORLD_PATHS.find(c => c.id === countryId);
    if (!country) return;

    // Simple zoom calculation for demo
    const newScale = 3;
    const newTranslateX = -200;
    const newTranslateY = -100;

    animatedScale.value = withTiming(newScale, { duration: 800 });
    animatedTranslateX.value = withTiming(newTranslateX, { duration: 800 });
    animatedTranslateY.value = withTiming(newTranslateY, { duration: 800 });

    baseTranslateX.value = newTranslateX;
    baseTranslateY.value = newTranslateY;

    setScale(newScale);
    setTranslate(newTranslateX, newTranslateY);

    console.log(`Zooming to country: ${country.name}`);
  };

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      baseScale.value = animatedScale.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
      baseTranslateX.value = animatedTranslateX.value;
      baseTranslateY.value = animatedTranslateY.value;
    })
    .onUpdate(event => {
      const newScale = Math.max(minScale, Math.min(8, baseScale.value * event.scale));
      const scaleDelta = newScale / baseScale.value;

      const focalPointOffsetX = focalX.value - screenWidth / 2;
      const focalPointOffsetY = focalY.value - screenHeight / 2;

      const newTranslateX = baseTranslateX.value + focalPointOffsetX * (1 - scaleDelta);
      const newTranslateY = baseTranslateY.value + focalPointOffsetY * (1 - scaleDelta);

      animatedScale.value = newScale;

      const scaledMapWidth = mapWidth * newScale;
      const scaledMapHeight = mapHeight * newScale;

      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight) / 2);

      animatedTranslateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
      animatedTranslateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));
    })
    .onEnd(() => {
      const finalScale = animatedScale.value;
      const finalX = animatedTranslateX.value;
      const finalY = animatedTranslateY.value;

      baseTranslateX.value = finalX;
      baseTranslateY.value = finalY;

      runOnJS(setScale)(finalScale);
      runOnJS(setTranslate)(finalX, finalY);
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      baseTranslateX.value = animatedTranslateX.value;
      baseTranslateY.value = animatedTranslateY.value;
    })
    .onUpdate(event => {
      const currentScale = animatedScale.value;
      const scaledMapWidth = mapWidth * currentScale;
      const scaledMapHeight = mapHeight * currentScale;

      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth));
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight));

      const newTranslateX = baseTranslateX.value + event.translationX;
      const newTranslateY = baseTranslateY.value + event.translationY;

      const constrainedX = Math.min(0, Math.max(-maxTranslateX, newTranslateX));
      const constrainedY = Math.min(0, Math.max(-maxTranslateY, newTranslateY));

      animatedTranslateX.value = constrainedX;
      animatedTranslateY.value = constrainedY;
    })
    .onEnd(() => {
      baseTranslateX.value = animatedTranslateX.value;
      baseTranslateY.value = animatedTranslateY.value;

      runOnJS(setTranslate)(animatedTranslateX.value, animatedTranslateY.value);
    });

  const composedGesture = Gesture.Race(Gesture.Simultaneous(pinchGesture, panGesture));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animatedTranslateX.value },
      { translateY: animatedTranslateY.value },
      { scale: animatedScale.value },
    ],
    transformOrigin: 'top left',
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.mapContainer, animatedStyle]}>
          {/* Ocean background */}
          <View style={[styles.oceanBackground, { width: mapWidth, height: mapHeight }]} />

          <Svg
            width={mapWidth}
            height={mapHeight}
            viewBox={`0 0 ${svgOriginalWidth} ${svgOriginalHeight}`}
            preserveAspectRatio="xMidYMid meet"
            style={styles.svgMap}
          >
            {SIMPLIFIED_WORLD_PATHS.map((country) => (
              <Path
                key={country.id}
                d={country.d}
                fill="#FFFFE0"
                stroke="#000000"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                onPress={() => {
                  console.log(`Clicked country: ${country.name}`);
                  zoomToCountry(country.id);
                }}
                pointerEvents="auto"
              />
            ))}
          </Svg>
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