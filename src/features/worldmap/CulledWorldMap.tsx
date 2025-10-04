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
  useDerivedValue,
  interpolateColor,
  useAnimatedProps,
} from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';

// Create animated version of Path
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Simplified country component using regular props
const CountryPath: React.FC<{
  country: { id: string; d: string; bbox: any };
  fillColor: string;
  scale?: number;
  onPress: () => void;
  onHover: (id: string | null) => void;
}> = ({ country, fillColor, scale = 1, onPress, onHover }) => {
  return (
    <Path
      key={country.id}
      d={country.d}
      fill={fillColor}
      stroke="#000000"
      strokeWidth="0.3"
      vectorEffect="non-scaling-stroke"
      transform={scale !== 1 ? `scale(${scale})` : undefined}
      onPress={onPress}
      onPressIn={() => onHover(country.id)}
      onPressOut={() => onHover(null)}
      pointerEvents="auto"
    />
  );
};

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

export const CulledWorldMap: React.FC = () => {
  const theme = useTheme();
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string, bbox: any}[]>([]);
  const [countryNames, setCountryNames] = useState<{[key: string]: string}>({});
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const animatedScale = useSharedValue(Math.max(scale, 1.0));
  const animatedTranslateX = useSharedValue(translateX);
  const animatedTranslateY = useSharedValue(translateY);

  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(translateX);
  const baseTranslateY = useSharedValue(translateY);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Simplified approach - use regular state for styling instead of individual shared values
  const [countryColors, setCountryColors] = useState<{ [key: string]: string }>({});
  const [countryScales, setCountryScales] = useState<{ [key: string]: number }>({});

  const initialScale = screenHeight / 482;
  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const aspectRatio = svgOriginalWidth / svgOriginalHeight;
  const mapHeight = screenHeight;
  const mapWidth = mapHeight * aspectRatio;
  const minScale = 1.0;


  // Calculate current viewport bounds in SVG coordinate space
  const viewportBounds = useDerivedValue(() => {
    const currentScale = animatedScale.value;
    const currentTranslateX = animatedTranslateX.value;
    const currentTranslateY = animatedTranslateY.value;

    // Convert screen coordinates to SVG coordinates
    const left = (-currentTranslateX) / (currentScale * initialScale);
    const top = (-currentTranslateY) / (currentScale * initialScale);
    const right = left + (screenWidth / (currentScale * initialScale));
    const bottom = top + (screenHeight / (currentScale * initialScale));

    return { left, top, right, bottom };
  });

  // Filter visible countries based on viewport
  const visibleCountries = useMemo(() => {
    const bounds = {
      left: (-animatedTranslateX.value) / (animatedScale.value * initialScale),
      top: (-animatedTranslateY.value) / (animatedScale.value * initialScale),
      right: ((-animatedTranslateX.value) + screenWidth) / (animatedScale.value * initialScale),
      bottom: ((-animatedTranslateY.value) + screenHeight) / (animatedScale.value * initialScale),
    };

    return countryPaths.filter(country =>
      country.bbox && isCountryVisible(country.bbox, bounds)
    );
  }, [countryPaths, animatedTranslateX.value, animatedTranslateY.value, animatedScale.value]);


  useEffect(() => {
    const loadMapData = async () => {
      try {
        // Load SVG paths
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
                // Pre-calculate bounding box for culling
                const bbox = getPathBoundingBox(pathData);
                paths.push({ id: countryId, d: pathData, bbox });
              }
            }
          }

          setCountryPaths(paths);
          console.log(`Loaded ${paths.length} country paths with bounding boxes`);
        } else {
          throw new Error(`Failed to fetch SVG: ${response.status}`);
        }

        // Load country names
        const countriesData = require('../../../assets/data/countries.json');
        const nameMap: {[key: string]: string} = {};
        countriesData.forEach((country: {code: string, name: string}) => {
          nameMap[country.code] = country.name;
        });
        setCountryNames(nameMap);
        console.log(`Loaded ${Object.keys(nameMap).length} country names`);

      } catch (error) {
        console.error('Error loading map data:', error);
        setCountryPaths([]);
        setCountryNames({});
      }
    };

    loadMapData();
  }, []);

  const handleCountryPress = (countryId: string, pathData: string) => {
    // Update selected country
    setSelectedCountry(countryId);

    // Update colors - selected country becomes red, others become default
    const newColors: { [key: string]: string } = {};
    countryPaths.forEach(country => {
      newColors[country.id] = country.id === countryId ? '#FF6B6B' : '#FFFFE0';
    });
    setCountryColors(newColors);

    // Brief scale animation for feedback
    setCountryScales({ [countryId]: 1.05 });
    setTimeout(() => {
      setCountryScales({ [countryId]: 1 });
    }, 200);

    const bbox = getPathBoundingBox(pathData);
    if (!bbox) return;

    const scaleX = (screenWidth - 0) / bbox.width / initialScale;
    const scaleY = (screenHeight - 0) / bbox.height / initialScale;
    const newScale = Math.min(scaleX, scaleY);

    const translateX = -bbox.minX * initialScale * newScale;
    const translateY = -bbox.minY * initialScale * newScale;

    animatedScale.value = withTiming(newScale, { duration: 800 });
    animatedTranslateX.value = withTiming(translateX, { duration: 800 });
    animatedTranslateY.value = withTiming(translateY, { duration: 800 });

    baseTranslateX.value = translateX;
    baseTranslateY.value = translateY;

    setScale(newScale);
    setTranslate(translateX, translateY);

    console.log(`Selected country: ${countryNames[countryId] || countryId}`);
  };

  const handleCountryHover = (countryId: string | null) => {
    setHoveredCountry(countryId);
    // Simple hover effect
    if (countryId) {
      setCountryScales(prev => ({ ...prev, [countryId]: 1.02 }));
    } else {
      setCountryScales({});
    }
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
      const newScale = Math.max(minScale, Math.min(5, baseScale.value * event.scale));
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

          {/* Debug info */}
          <View style={styles.debugInfo}>
            <Animated.Text style={styles.debugText}>
              Visible: {visibleCountries.length}/{countryPaths.length} countries
            </Animated.Text>
            {selectedCountry && (
              <Animated.Text style={[styles.debugText, styles.selectedText]}>
                Selected: {countryNames[selectedCountry] || selectedCountry}
              </Animated.Text>
            )}
          </View>

          {countryPaths.length > 0 ? (
            <Svg
              width={mapWidth}
              height={mapHeight}
              viewBox="0 0 1000 482"
              preserveAspectRatio="xMidYMid meet"
              style={styles.svgMap}
            >
              {/* Only render visible countries */}
              {visibleCountries.map((country) => {
                const fillColor = countryColors[country.id] || '#FFFFE0';
                const scale = countryScales[country.id] || 1;

                return (
                  <CountryPath
                    key={country.id}
                    country={country}
                    fillColor={fillColor}
                    scale={scale}
                    onPress={() => handleCountryPress(country.id, country.d)}
                    onHover={handleCountryHover}
                  />
                );
              })}
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
  debugInfo: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 1000,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
  },
  selectedText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
});