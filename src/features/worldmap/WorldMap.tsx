import { useTheme } from '@/hooks';
import { useMapStore } from '@/store';
import { Asset } from 'expo-asset';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';
import { CountryLabels } from './CountryLabels';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Function to parse SVG path and calculate bounding box
const getPathBoundingBox = (pathData: string) => {
  // Extract all coordinate pairs from the path data
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


export const WorldMap: React.FC = () => {
  const theme = useTheme();
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string}[]>([]);
  const [countryNames, setCountryNames] = useState<{[key: string]: string}>({});

  const animatedScale = useSharedValue(Math.max(scale, 1.0)); // Ensure initial scale respects minimum
  const animatedTranslateX = useSharedValue(translateX);
  const animatedTranslateY = useSharedValue(translateY);

  const baseScale = useSharedValue(1);
  // Base translation values to accumulate pan gestures
  const baseTranslateX = useSharedValue(translateX);
  const baseTranslateY = useSharedValue(translateY);
  // Store focal point for pinch gesture
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const initialScale = screenHeight / 482;

    // Calculate the appropriate width to maintain aspect ratio when height = screenHeight
    const svgOriginalWidth = 1000;
    const svgOriginalHeight = 482;
    const aspectRatio = svgOriginalWidth / svgOriginalHeight;
    const mapHeight = screenHeight;
    const mapWidth = mapHeight * aspectRatio;

    // Calculate minimum scale to ensure map height never goes below screen height
    const minScale = 1.0; // Since mapHeight = screenHeight, minimum scale is 1.0

    // Function to zoom to a specific country
    const zoomToCountry = (countryId: string, pathData: string) => {
      const bbox = getPathBoundingBox(pathData);
      if (!bbox) return;

      // Calculate scale to fit country with some padding
      const padding = 0; // pixels of padding around the country
      const scaleX = (screenWidth - padding * 2) / bbox.width / initialScale ;
      const scaleY = (screenHeight - padding * 2) / bbox.height / initialScale;
      // const newScale = Math.max(minScale, Math.min(5, Math.min(scaleX, scaleY)));
      const newScale =  Math.min(scaleX, scaleY);


      // Calculate center of the country in SVG coordinates
      const countryCenterX = bbox.minX + bbox.width / 2;
      const countryCenterY = bbox.minY + bbox.height / 2;

      // Calculate where this center should be positioned on screen (screen center)
      const targetScreenX = screenWidth / 2;
      const targetScreenY = screenHeight / 2;

      // Calculate required translation to center the country
      // const newTranslateX = targetScreenX - (countryCenterX * newScale * (mapWidth / svgOriginalWidth));
      // const newTranslateY = targetScreenY - (countryCenterY * newScale * (mapHeight / svgOriginalHeight));
      // const newTranslateX =  - (countryCenterX - bbox.width / 2 );
      // const newTranslateY =  - (countryCenterY - bbox.height / 2  );

      const newTranslateX =  - bbox.minX;
      const newTranslateY =  - bbox.minY;

      // Apply boundary constraints
      const scaledMapWidth = mapWidth * newScale;
      const scaledMapHeight = mapHeight * newScale;
      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight) / 2);

      const constrainedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
      const constrainedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));

      // Now that scaling happens from top-left, coordinates don't shift!
      // Simple calculation: move red dot to (0,0) by translating by its negative position
      const translateX = -bbox.minX * initialScale * newScale;
      const translateY = -bbox.minY * initialScale * newScale;

      // Animate to the new position and scale
      animatedScale.value = withTiming(newScale, { duration: 800 });
      animatedTranslateX.value = withTiming(translateX, { duration: 800 });
      animatedTranslateY.value = withTiming(translateY, { duration: 800 });

      // IMPORTANT: Update base values so pan gestures start from the new position
      baseTranslateX.value = translateX;
      baseTranslateY.value = translateY;

      // Update store
      setScale(newScale);
      setTranslate(translateX, translateY);

      console.log(`Zooming to country: ${countryId}`);
    };

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
          console.log(`Loaded ${paths.length} country paths`);
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


  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      baseScale.value = animatedScale.value;
      // Store the focal point of the pinch gesture
      focalX.value = event.focalX;
      focalY.value = event.focalY;
      // Store base translations at start of pinch
      baseTranslateX.value = animatedTranslateX.value;
      baseTranslateY.value = animatedTranslateY.value;
    })
    .onUpdate(event => {
      const newScale = Math.max(minScale, Math.min(5, baseScale.value * event.scale));
      const scaleDelta = newScale / baseScale.value;

      // Calculate new translation to zoom around the focal point
      // This prevents the "magnet to center" effect
      const focalPointOffsetX = focalX.value - screenWidth / 2;
      const focalPointOffsetY = focalY.value - screenHeight / 2;

      const newTranslateX = baseTranslateX.value + focalPointOffsetX * (1 - scaleDelta);
      const newTranslateY = baseTranslateY.value + focalPointOffsetY * (1 - scaleDelta);

      animatedScale.value = newScale;

      // After scaling, ensure we don't go out of bounds
      const scaledMapWidth = mapWidth * newScale;
      const scaledMapHeight = mapHeight * newScale;

      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight) / 2);

      // Constrain translation within boundaries
      animatedTranslateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
      animatedTranslateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));
    })
    .onEnd(() => {
      // Apply final constraints when pinch ends
      const finalScale = animatedScale.value;
      const scaledMapWidth = mapWidth * finalScale;
      const scaledMapHeight = mapHeight * finalScale;

      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight) / 2);

      const constrainedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, animatedTranslateX.value));
      const constrainedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, animatedTranslateY.value));

      animatedTranslateX.value = constrainedX;
      animatedTranslateY.value = constrainedY;

      // Update base translation values after zoom
      baseTranslateX.value = constrainedX;
      baseTranslateY.value = constrainedY;

      runOnJS(setScale)(finalScale);
      runOnJS(setTranslate)(constrainedX, constrainedY);
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Store the current translation as the base for this gesture
      baseTranslateX.value = animatedTranslateX.value;
      baseTranslateY.value = animatedTranslateY.value;
    })
    .onUpdate(event => {
      // Calculate boundaries based on current scale and map dimensions
      const currentScale = animatedScale.value;
      const scaledMapWidth = mapWidth * currentScale;
      const scaledMapHeight = mapHeight * currentScale;

      // Calculate maximum allowed translation to keep map within screen bounds
      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth));
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight));

      // Add current gesture translation to the base translation
      const newTranslateX = baseTranslateX.value + event.translationX;
      const newTranslateY = baseTranslateY.value + event.translationY;

      // Constrain translation within boundaries
      const constrainedX = Math.min(0, Math.max(-maxTranslateX, newTranslateX));
      const constrainedY = Math.min(0, Math.max(-maxTranslateY, newTranslateY));

      animatedTranslateX.value = constrainedX;
      animatedTranslateY.value = constrainedY;

      // Log current map position for debugging
      console.log(`Pan: translateX=${constrainedX.toFixed(1)}, translateY=${constrainedY.toFixed(1)}, scale=${currentScale.toFixed(2)}`);
    })
    .onEnd(() => {
      // Update the base translation values for the next gesture
      baseTranslateX.value = animatedTranslateX.value;
      baseTranslateY.value = animatedTranslateY.value;

      // Update the store with the final position
      runOnJS(setTranslate)(animatedTranslateX.value, animatedTranslateY.value);
    });



  // Add tap gesture as backup for mobile devices where SVG onPress doesn't work
  // const tapGesture = Gesture.Tap()
  //   .onEnd((event) => {
  //     runOnJS(findCountryAtCoordinates)(event.x, event.y);
  //   });

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
          {/* Ocean background canvas */}
          <View style={[styles.oceanBackground, { width: mapWidth, height: mapHeight }]} />
          {countryPaths.length > 0 ? (
            <Svg
              width={mapWidth}
              height={mapHeight}
              viewBox="0 0 1000 482"
              style={styles.svgMap}
            >
              {countryPaths.map((country) => (
                <Path
                  key={country.id}
                  d={country.d}
                  fill="#FFFFE0"
                  stroke="#000000"
                  strokeWidth="0.3"
                  onPress={() => {
                    console.log(`Clicked country: ${country.id}`);
                    zoomToCountry(country.id, country.d);
                  }}
                  onPressIn={() => {
                    console.log(`Press in country: ${country.id}`);
                    zoomToCountry(country.id, country.d);
                  }}
                  pointerEvents="auto"
                />
              ))}
            </Svg>
          ) : null}
        </Animated.View>
      </GestureDetector>

      {/* Country labels layer - separate from map for performance */}
      <CountryLabels
        countryPaths={countryPaths}
        countryNames={countryNames}
        animatedScale={animatedScale}
        animatedTranslateX={animatedTranslateX}
        animatedTranslateY={animatedTranslateY}
      />
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
    backgroundColor: 'rgb(109, 204, 236)', // Light blue ocean color
  },
  svgMap: {
    position: 'absolute',
  },
});