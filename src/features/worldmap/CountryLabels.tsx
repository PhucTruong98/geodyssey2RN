import { useMapStore } from '@/store';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CountryLabel {
  id: string;
  name: string;
  x: number;
  y: number;
  pathData: string;
}

interface CountryLabelsProps {
  countryPaths: { id: string; d: string }[];
  countryNames: { [key: string]: string };
  animatedScale: SharedValue<number>;
  animatedTranslateX: SharedValue<number>;
  animatedTranslateY: SharedValue<number>;
}

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

// Individual animated label component
const AnimatedCountryLabel: React.FC<{
  country: { id: string; d: string };
  name: string;
  animatedScale: SharedValue<number>;
  animatedTranslateX: SharedValue<number>;
  animatedTranslateY: SharedValue<number>;
}> = ({ country, name, animatedScale, animatedTranslateX, animatedTranslateY }) => {
  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const initialScale = screenHeight / 482;
  const mapHeight = screenHeight;
  const mapWidth = mapHeight * (svgOriginalWidth / svgOriginalHeight);

  const bbox = useMemo(() => getPathBoundingBox(country.d), [country.d]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!bbox) return { opacity: 0 };

    // Calculate center position in SVG coordinates
    const svgCenterX = bbox.minX + bbox.width / 2;
    const svgCenterY = bbox.minY + bbox.height / 2;

    // Convert SVG coordinates to screen coordinates using animated values
    const screenX = (svgCenterX / svgOriginalWidth) * mapWidth * animatedScale.value + animatedTranslateX.value;
    const screenY = (svgCenterY / svgOriginalHeight) * mapHeight * animatedScale.value + animatedTranslateY.value;

    // Check if label should be visible (with buffer)
    const buffer = 50;
    const isVisible = screenX >= -buffer && screenX <= screenWidth + buffer &&
                     screenY >= -buffer && screenY <= screenHeight + buffer;

    return {
      opacity: isVisible ? 1 : 0,
      transform: [
        { translateX: screenX - 50 }, // Center text horizontally
        { translateY: screenY - 8 },  // Center text vertically
      ],
    };
  });

  // Only render labels for larger countries
  if (!bbox || bbox.width <= 15 || bbox.height <= 8) {
    return null;
  }

  return (
    <Animated.Text style={[styles.countryLabel, animatedStyle]}>
      {name}
    </Animated.Text>
  );
};

export const CountryLabels: React.FC<CountryLabelsProps> = ({
  countryPaths,
  countryNames,
  animatedScale,
  animatedTranslateX,
  animatedTranslateY
}) => {
  return (
    <View style={styles.labelContainer} pointerEvents="none">
      {countryPaths.map((country) => {
        const countryName = countryNames[country.id];
        if (!countryName) return null;

        return (
          <AnimatedCountryLabel
            key={country.id}
            country={country}
            name={countryName}
            animatedScale={animatedScale}
            animatedTranslateX={animatedTranslateX}
            animatedTranslateY={animatedTranslateY}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  countryLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
    backgroundColor: 'transparent',
    width: 100, // Fixed width for text centering
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});