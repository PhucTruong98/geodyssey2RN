import React from 'react';
import { Canvas, Group, Text, matchFont } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { useMapContext } from '../WorldMapMainComponent';

/**
 * Country Name Layer - Renders country labels using Skia
 * Synchronized with map transform from parent component
 */
export const CountryNameLayer: React.FC = () => {
  const { transform, constants } = useMapContext();

  // Create transform array for Skia
  const skiaTransform = useDerivedValue(() => {
    return [
      { translateX: transform.x.value },
      { translateY: transform.y.value },
      { scale: transform.scale.value },
    ];
  }, []);

  // Font for country names
  const font = matchFont({
    fontSize: 12,
    fontWeight: '600',
  });

  // Sample country positions (you'll populate this with real data)
  const countries = [
    { id: 'USA', name: 'United States', x: 250, y: 150 },
    { id: 'BRA', name: 'Brazil', x: 350, y: 280 },
    { id: 'CHN', name: 'China', x: 750, y: 180 },
    // Add more countries...
  ];

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group transform={skiaTransform}>
        {countries.map((country) => (
          <Text
            key={country.id}
            x={country.x}
            y={country.y}
            text={country.name}
            font={font}
            color="rgba(0, 0, 0, 0.8)"
          />
        ))}
      </Group>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
});
