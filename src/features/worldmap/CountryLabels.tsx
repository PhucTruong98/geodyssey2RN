import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { runOnJS, useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';

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

// Simple static label component - no hiding, only render when truly visible
const AnimatedCountryLabel: React.FC<{
  country: { id: string; d: string };
  name: string;
  svgCenterX: number;
  svgCenterY: number;
  animatedScale: SharedValue<number>;
  animatedTranslateX: SharedValue<number>;
  animatedTranslateY: SharedValue<number>;
}> = ({ country, name, svgCenterX, svgCenterY, animatedScale, animatedTranslateX, animatedTranslateY }) => {
  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const mapHeight = screenHeight;
  const mapWidth = mapHeight * (svgOriginalWidth / svgOriginalHeight);

  const animatedStyle = useAnimatedStyle(() => {
    // Convert SVG coordinates to screen coordinates using animated values
    const screenX = (svgCenterX / svgOriginalWidth) * mapWidth * animatedScale.value + animatedTranslateX.value;
    const screenY = (svgCenterY / svgOriginalHeight) * mapHeight * animatedScale.value + animatedTranslateY.value;

    return {
      transform: [
        { translateX: screenX - 50 }, // Center text horizontally
        { translateY: screenY - 8 },  // Center text vertically
      ],
    };
  });

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
  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const mapHeight = screenHeight;
  const mapWidth = mapHeight * (svgOriginalWidth / svgOriginalHeight);

  // Pre-compute country data once
  const countryData = useMemo(() => {
    return countryPaths.map((country) => {
      const bbox = getPathBoundingBox(country.d);
      if (!bbox || !countryNames[country.id]) return null;

      return {
        id: country.id,
        name: countryNames[country.id],
        svgCenterX: bbox.minX + bbox.width / 2,
        svgCenterY: bbox.minY + bbox.height / 2,
        area: bbox.width * bbox.height,
        country
      };
    }).filter(Boolean) as Array<{
      id: string;
      name: string;
      svgCenterX: number;
      svgCenterY: number;
      area: number;
      country: { id: string; d: string };
    }>;
  }, [countryPaths, countryNames]);

  // Track visible countries with state updates
  const [renderableCountries, setRenderableCountries] = React.useState<typeof countryData>([]);

  // Update function to filter countries
  const updateVisibleCountries = React.useCallback((scale: number, translateX: number, translateY: number) => {
    // Dynamic threshold based on zoom level
    const minAreaThreshold = scale <= 1.5 ? 800 :   // Only largest countries at low zoom
                           scale <= 2.5 ? 400 :     // Medium countries at medium zoom
                           scale <= 4.0 ? 200 :     // Smaller countries at high zoom
                           100;                      // All countries at max zoom

    const visible = countryData.filter((country) => {
      // Size filtering
      if (country.area < minAreaThreshold) return false;

      // Viewport culling
      const screenX = (country.svgCenterX / svgOriginalWidth) * mapWidth * scale + translateX;
      const screenY = (country.svgCenterY / svgOriginalHeight) * mapHeight * scale + translateY;

      const buffer = 100;
      return screenX >= -buffer && screenX <= screenWidth + buffer &&
             screenY >= -buffer && screenY <= screenHeight + buffer;
    });

    setRenderableCountries(visible);
  }, [countryData, mapWidth, svgOriginalWidth, mapHeight, svgOriginalHeight]);

  // Use shared values to track when to update
  const lastUpdateScale = useSharedValue(1);
  const lastUpdateTranslateX = useSharedValue(0);
  const lastUpdateTranslateY = useSharedValue(0);

  // Monitor animated values and update when they change significantly
  useDerivedValue(() => {
    const scale = animatedScale.value;
    const translateX = animatedTranslateX.value;
    const translateY = animatedTranslateY.value;

    // Only update if values changed significantly (throttle updates)
    const scaleChanged = Math.abs(scale - lastUpdateScale.value) > 0.3;
    const translateXChanged = Math.abs(translateX - lastUpdateTranslateX.value) > 200;
    const translateYChanged = Math.abs(translateY - lastUpdateTranslateY.value) > 200;

    if (scaleChanged || translateXChanged || translateYChanged) {
      lastUpdateScale.value = scale;
      lastUpdateTranslateX.value = translateX;
      lastUpdateTranslateY.value = translateY;

      runOnJS(updateVisibleCountries)(scale, translateX, translateY);
    }
  });

  return (
    <View style={styles.labelContainer} pointerEvents="none">
      {renderableCountries.map((country) => (
        <AnimatedCountryLabel
          key={country.id}
          country={country.country}
          name={country.name}
          svgCenterX={country.svgCenterX}
          svgCenterY={country.svgCenterY}
          animatedScale={animatedScale}
          animatedTranslateX={animatedTranslateX}
          animatedTranslateY={animatedTranslateY}
        />
      ))}
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