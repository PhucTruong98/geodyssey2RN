import { useMapStore } from '@/store';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import React, { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useSharedValue
} from 'react-native-reanimated';

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

export const SkiaWorldMap: React.FC = () => {
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string, path: any}[]>([]);
  const [countryNames, setCountryNames] = useState<{[key: string]: string}>({});

  // Use React state for Skia rendering
  const [skiaScale, setSkiaScale] = useState(Math.max(scale, 1.0));
  const [skiaTranslateX, setSkiaTranslateX] = useState(translateX);
  const [skiaTranslateY, setSkiaTranslateY] = useState(translateY);

  // Shared values for gesture calculations
  const gestureScale = useSharedValue(Math.max(scale, 1.0));
  const gestureTranslateX = useSharedValue(translateX);
  const gestureTranslateY = useSharedValue(translateY);

  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(translateX);
  const baseTranslateY = useSharedValue(translateY);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const initialScale = screenHeight / 482;
  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const aspectRatio = svgOriginalWidth / svgOriginalHeight;
  const mapHeight = screenHeight;
  const mapWidth = mapHeight * aspectRatio;
  const minScale = 1.0;

  // Load map data and convert to Skia paths
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
          const paths: {id: string, d: string, path: any}[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('<path') && line.includes('>')) {
              const idMatch = line.match(/id="([^"]*)"/);
              const pathMatch = line.match(/d="([^"]*)"/);
              const countryId = idMatch ? idMatch[1] : '';
              const pathData = pathMatch ? pathMatch[1] : '';

              if (countryId && pathData) {
                // Convert SVG path to Skia path
                const skiaPath = Skia.Path.MakeFromSVGString(pathData);
                if (skiaPath) {
                  paths.push({ id: countryId, d: pathData, path: skiaPath });
                }
              }
            }
          }

          setCountryPaths(paths);
          console.log(`Loaded ${paths.length} Skia country paths`);
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
        console.error('Error loading Skia map data:', error);
        setCountryPaths([]);
        setCountryNames({});
      }
    };

    loadMapData();
  }, []);

  // Function to zoom to a specific country
  const zoomToCountry = (countryId: string, pathData: string) => {
    const bbox = getPathBoundingBox(pathData);
    if (!bbox) return;

    const scaleX = (screenWidth - 0) / bbox.width / initialScale;
    const scaleY = (screenHeight - 0) / bbox.height / initialScale;
    const newScale = Math.min(scaleX, scaleY);

    const translateX = -bbox.minX * initialScale * newScale;
    const translateY = -bbox.minY * initialScale * newScale;

    // Update both React state and gesture values
    setSkiaScale(newScale);
    setSkiaTranslateX(translateX);
    setSkiaTranslateY(translateY);

    gestureScale.value = newScale;
    gestureTranslateX.value = translateX;
    gestureTranslateY.value = translateY;

    // Update base values
    baseTranslateX.value = translateX;
    baseTranslateY.value = translateY;

    // Update store
    setScale(newScale);
    setTranslate(translateX, translateY);

    console.log(`Skia zooming to country: ${countryId}`);
  };

  // // Gesture handling
  // const pinchGesture = Gesture.Pinch()
  //   .onStart((event) => {
  //     baseScale.value = gestureScale.value;
  //     focalX.value = event.focalX;
  //     focalY.value = event.focalY;
  //     baseTranslateX.value = gestureTranslateX.value;
  //     baseTranslateY.value = gestureTranslateY.value;
  //   })
  //   .onUpdate(event => {
  //     const newScale = Math.max(minScale, Math.min(5, baseScale.value * event.scale));
  //     const scaleDelta = newScale / baseScale.value;

  //     const focalPointOffsetX = focalX.value - screenWidth / 2;
  //     const focalPointOffsetY = focalY.value - screenHeight / 2;

  //     const newTranslateX = baseTranslateX.value + focalPointOffsetX * (1 - scaleDelta);
  //     const newTranslateY = baseTranslateY.value + focalPointOffsetY * (1 - scaleDelta);

  //     const scaledMapWidth = mapWidth * newScale;
  //     const scaledMapHeight = mapHeight * newScale;

  //     const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth) / 2);
  //     const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight) / 2);

  //     const constrainedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
  //     const constrainedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));

  //     // Update gesture values and trigger React re-render
  //     gestureScale.value = newScale;
  //     gestureTranslateX.value = constrainedX;
  //     gestureTranslateY.value = constrainedY;

  //     // Update React state for rendering - but only occasionally to avoid overhead
  //     runOnJS(setSkiaScale)(newScale);
  //     runOnJS(setSkiaTranslateX)(constrainedX);
  //     runOnJS(setSkiaTranslateY)(constrainedY);
  //   })
  //   .onEnd(() => {
  //     const finalScale = gestureScale.value;
  //     const finalX = gestureTranslateX.value;
  //     const finalY = gestureTranslateY.value;

  //     // Update base values for next gesture
  //     baseTranslateX.value = finalX;
  //     baseTranslateY.value = finalY;
  //     baseScale.value = finalScale;

  //     // Update store only at the end
  //     runOnJS(setScale)(finalScale);
  //     runOnJS(setTranslate)(finalX, finalY);
  //   });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      baseTranslateX.value = gestureTranslateX.value;
      baseTranslateY.value = gestureTranslateY.value;
    })
    .onUpdate(event => {
      const currentScale = gestureScale.value;
      const scaledMapWidth = mapWidth * currentScale;
      const scaledMapHeight = mapHeight * currentScale;

      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth));
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight));

      const newTranslateX = baseTranslateX.value + event.translationX;
      const newTranslateY = baseTranslateY.value + event.translationY;

      const constrainedX = Math.min(0, Math.max(-maxTranslateX, newTranslateX));
      const constrainedY = Math.min(0, Math.max(-maxTranslateY, newTranslateY));

      // Update gesture values and React state
      gestureTranslateX.value = constrainedX;
      gestureTranslateY.value = constrainedY;

      runOnJS(setSkiaTranslateX)(constrainedX);
      runOnJS(setSkiaTranslateY)(constrainedY);
    })
    .onEnd(() => {
      const finalX = gestureTranslateX.value;
      const finalY = gestureTranslateY.value;

      baseTranslateX.value = finalX;
      baseTranslateY.value = finalY;

      runOnJS(setTranslate)(finalX, finalY);
    });

  const composedGesture = Gesture.Race(Gesture.Simultaneous( panGesture));

  return (
    <GestureDetector gesture={composedGesture}>
      <Canvas style={{ flex: 1 }}>
        <Group
          transform={[
            { translateX: skiaTranslateX },
            { translateY: skiaTranslateY },
            { scale: skiaScale },
          ]}
        >
          {/* Ocean background */}
          <Path
            path="M0,0 L1000,0 L1000,482 L0,482 Z"
            color="rgb(109, 204, 236)"
          />

          {/* Render countries - fill first, then stroke */}
          {countryPaths.map((country) => (
            <React.Fragment key={country.id}>
              <Path path={country.path} color="#FFFFE0" style="fill" />
              <Path path={country.path} color="#000000" style="stroke" strokeWidth={0.3} />
            </React.Fragment>
          ))}
        </Group>
      </Canvas>
    </GestureDetector>


  );
};