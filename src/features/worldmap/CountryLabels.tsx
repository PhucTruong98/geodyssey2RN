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

  // Memoize expensive calculations that don't change
  const { svgCenterX, svgCenterY, countryArea } = useMemo(() => {
    if (!bbox) return { svgCenterX: 0, svgCenterY: 0, countryArea: 0 };
    return {
      svgCenterX: bbox.minX + bbox.width / 2,
      svgCenterY: bbox.minY + bbox.height / 2,
      countryArea: bbox.width * bbox.height
    };
  }, [bbox]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!bbox) return { opacity: 0, transform: [{ translateX: -1000 }] };

    const currentScale = animatedScale.value;

    // Dynamic threshold based on zoom level - show fewer labels when zoomed out
    const minAreaThreshold = currentScale <= 1.5 ? 800 :  // Only largest countries at low zoom
                           currentScale <= 2.5 ? 400 :    // Medium countries at medium zoom
                           currentScale <= 4.0 ? 200 :    // Smaller countries at high zoom
                           100;                            // All countries at max zoom

    if (countryArea < minAreaThreshold) {
      return { opacity: 0, transform: [{ translateX: -1000 }] };
    }

    // Convert SVG coordinates to screen coordinates using animated values
    const screenX = (svgCenterX / svgOriginalWidth) * mapWidth * currentScale + animatedTranslateX.value;
    const screenY = (svgCenterY / svgOriginalHeight) * mapHeight * currentScale + animatedTranslateY.value;

    // Viewport culling - don't render if completely outside screen
    const buffer = 100;
    const isInViewport = screenX >= -buffer && screenX <= screenWidth + buffer &&
                        screenY >= -buffer && screenY <= screenHeight + buffer;

    if (!isInViewport) {
      return { opacity: 0, transform: [{ translateX: -1000 }] };
    }

    return {
      opacity: 1,
      transform: [
        { translateX: screenX - 50 }, // Center text horizontally
        { translateY: screenY - 8 },  // Center text vertically
      ],
    };
  });

  // Early return if country is too small at minimum zoom
  if (!bbox || bbox.width * bbox.height < 100) {
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
  // Pre-filter countries by size to avoid rendering tiny countries that will never show labels
  const eligibleCountries = useMemo(() => {
    return countryPaths.filter((country) => {
      const bbox = getPathBoundingBox(country.d);
      if (!bbox || !countryNames[country.id]) return false;

      // Only include countries that could potentially show labels at some zoom level
      const countryArea = bbox.width * bbox.height;
      return countryArea >= 100; // Minimum area threshold
    });
  }, [countryPaths, countryNames]);

  return (
    <View style={styles.labelContainer} pointerEvents="none">
      {eligibleCountries.map((country) => {
        const countryName = countryNames[country.id];
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