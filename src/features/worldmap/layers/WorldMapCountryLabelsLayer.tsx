import { Text, matchFont } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { useMapContext } from '../WorldMapMainComponent';

// Import country data with centroids (you'll need to add this)
// For now, using sample data - replace with actual country centroids
const COUNTRY_LABELS = [
  { id: 'USA', name: 'USA', x: 250, y: 150 },
  { id: 'CAN', name: 'CAN', x: 280, y: 100 },
  { id: 'MEX', name: 'MEX', x: 230, y: 200 },
  { id: 'BRA', name: 'BRA', x: 350, y: 320 },
  { id: 'ARG', name: 'ARG', x: 330, y: 400 },
  { id: 'GBR', name: 'GBR', x: 485, y: 80 },
  { id: 'FRA', name: 'FRA', x: 495, y: 105 },
  { id: 'DEU', name: 'DEU', x: 510, y: 95 },
  { id: 'ESP', name: 'ESP', x: 480, y: 120 },
  { id: 'ITA', name: 'ITA', x: 515, y: 115 },
  { id: 'RUS', name: 'RUS', x: 600, y: 70 },
  { id: 'CHN', name: 'CHN', x: 750, y: 180 },
  { id: 'IND', name: 'IND', x: 680, y: 200 },
  { id: 'JPN', name: 'JPN', x: 830, y: 170 },
  { id: 'AUS', name: 'AUS', x: 820, y: 370 },
  { id: 'ZAF', name: 'ZAF', x: 545, y: 390 },
  { id: 'EGY', name: 'EGY', x: 545, y: 190 },
  { id: 'NGA', name: 'NGA', x: 500, y: 240 },
  { id: 'KEN', name: 'KEN', x: 565, y: 265 },
  { id: 'SAU', name: 'SAU', x: 590, y: 200 },
];

/**
 * Country Labels Layer - Renders country ID labels using Skia
 * Synchronized with map transform from parent component
 */
export const WorldMapCountryLabelsLayer: React.FC = () => {
  const { transform, constants } = useMapContext();

  // Create transform array for Skia
  const skiaTransform = useDerivedValue(() => {
    return [
      { translateX: transform.x.value },
      { translateY: transform.y.value },
      { scale: transform.scale.value },
    ];
  }, []);

  // Font for country labels
  const font = matchFont({
    fontSize: 10,
    fontWeight: '600',
  });

  // Memoize country label elements
  const countryLabels = useMemo(() => {
    return COUNTRY_LABELS.map((country) => (
      <Text
        key={country.id}
        x={country.x}
        y={country.y}
        text={country.name}
        font={font}
        color="rgba(0, 0, 0, 0.7)"
      />
    ));
  }, [font]);

  // Hide the canvas when not needed to prevent blocking touches
  // Show only when zoomed in enough to see labels clearly
  const animatedStyle = useAnimatedStyle(() => {
    const shouldShow = transform.scale.value > constants.initialScale * 1.5;
    return {
      opacity: shouldShow ? 1 : 0,
      // IMPORTANT: Use 'none' when hidden to allow touches through
      pointerEvents: shouldShow ? 'none' : 'none',
    };
  });

  return (
    <View style={styles.canvas} pointerEvents="box-none">
      {/* <Canvas style={styles.canvasInner}>
        <Group transform={skiaTransform}>
          {countryLabels}
        </Group>
      </Canvas> */}
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  canvasInner: {
    flex: 1,
  },
});
