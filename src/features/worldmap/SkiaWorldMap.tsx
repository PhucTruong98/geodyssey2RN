import { useMapStore } from '@/store';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withDecay
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// SVG map dimensions
const MAP_WIDTH = 500;
const MAP_HEIGHT = 241;

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
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string, path: any, bbox: any}[]>([]);

  // Use shared values for UI thread rendering
  const skiaScale = useSharedValue(Math.max(scale, 1.0));
  const skiaTranslateX = useSharedValue(translateX);
  const skiaTranslateY = useSharedValue(translateY);

  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(translateX);
  const baseTranslateY = useSharedValue(translateY);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const initialScale = screenHeight / MAP_HEIGHT;
  const aspectRatio = MAP_WIDTH / MAP_HEIGHT;
  const minScale = 1.0;

  // Load map data and convert to Skia paths
  useEffect(() => {
    //set initial scale for map
    skiaScale.value = initialScale;
    const loadMapData = async () => {
      try {
        // Load SVG paths
        // const svgUrl = require('../../../assets/world-map.svg');
        // const svgUrl = require('../../../assets/simWorldMap.svg');
        const svgUrl = require('../../../assets/world-map-small.svg');

        const asset = Asset.fromModule(svgUrl);
        await asset.downloadAsync();

        const response = await fetch(asset.uri);
        if (response.ok) {
          const svgText = await response.text();
          const lines = svgText.split('\n');
          const paths: {id: string, d: string, path: any, bbox: any}[] = [];

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
                  // Calculate bounding box for viewport culling
                  const bbox = getPathBoundingBox(pathData);
                  paths.push({ id: countryId, d: pathData, path: skiaPath, bbox });
                }
              }
            }
          }

          setCountryPaths(paths);
          console.log(`Loaded ${paths.length} Skia country paths`);
        } else {
          throw new Error(`Failed to fetch SVG: ${response.status}`);
        }


      } catch (error) {
        console.error('Error loading Skia map data:', error);
        setCountryPaths([]);
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

    // Update shared values directly
    skiaScale.value = newScale;
    skiaTranslateX.value = translateX;
    skiaTranslateY.value = translateY;

    // Update base values
    baseTranslateX.value = translateX;
    baseTranslateY.value = translateY;

    // Update store
    setScale(newScale);
    setTranslate(translateX, translateY);

    console.log(`Skia zooming to country: ${countryId}`);
  };

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      baseScale.value = skiaScale.value;
      baseTranslateX.value = skiaTranslateX.value;
      baseTranslateY.value = skiaTranslateY.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onUpdate(event => {
      // Constrain zoom: minimum is initialScale, maximum is 5x
      const newScale = Math.max(initialScale, Math.min(20, baseScale.value * event.scale));

      // Calculate the focal point position in map coordinates using the base values from onStart
      const mapPointX = (focalX.value - baseTranslateX.value) / baseScale.value;
      const mapPointY = (focalY.value - baseTranslateY.value) / baseScale.value;

      // New translation to keep the focal point fixed on screen
      const newTranslateX = focalX.value - mapPointX * newScale;
      const newTranslateY = focalY.value - mapPointY * newScale;

      // Calculate actual rendered map dimensions (SVG size * scale)
      const scaledMapWidth = MAP_WIDTH * newScale;
      const scaledMapHeight = MAP_HEIGHT * newScale;

      // Calculate proper boundaries
      const minTranslateX = screenWidth - scaledMapWidth;
      const maxTranslateX = 0;
      const minTranslateY = screenHeight - scaledMapHeight;
      const maxTranslateY = 0;

      const constrainedX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
      const constrainedY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));

      // Update shared values directly on UI thread
      skiaScale.value = newScale;
      skiaTranslateX.value = constrainedX;
      skiaTranslateY.value = constrainedY;
    })
    .onEnd(() => {
      const finalScale = skiaScale.value;
      const finalX = skiaTranslateX.value;
      const finalY = skiaTranslateY.value;

      // Update base values for next gesture
      baseTranslateX.value = finalX;
      baseTranslateY.value = finalY;
      baseScale.value = finalScale;

      // Update store only at the end
      runOnJS(setScale)(finalScale);
      runOnJS(setTranslate)(finalX, finalY);
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      baseTranslateX.value = skiaTranslateX.value;
      baseTranslateY.value = skiaTranslateY.value;
    })
    .onUpdate(event => {
      const currentScale = skiaScale.value;

      // Calculate actual rendered map dimensions (SVG size * scale)
      const scaledMapWidth = MAP_WIDTH * currentScale;
      const scaledMapHeight = MAP_HEIGHT * currentScale;

      const newTranslateX = baseTranslateX.value + event.translationX;
      const newTranslateY = baseTranslateY.value + event.translationY;

      // Calculate proper boundaries
      // Map left edge should not go past screen right edge
      const minTranslateX = screenWidth - scaledMapWidth;
      // Map right edge should not go past screen left edge
      const maxTranslateX = 0;

      // Map top edge should not go past screen bottom edge
      const minTranslateY = screenHeight - scaledMapHeight;
      // Map bottom edge should not go past screen top edge
      const maxTranslateY = 0;

      // Constrain translation to keep map filling screen
      const constrainedX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
      const constrainedY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));

      // Update shared values directly on UI thread
      skiaTranslateX.value = constrainedX;
      skiaTranslateY.value = constrainedY;
    })
    .onEnd(event => {
      const currentScale = skiaScale.value;
      const scaledMapWidth = MAP_WIDTH * currentScale;
      const scaledMapHeight = MAP_HEIGHT * currentScale;

      const minTranslateX = screenWidth - scaledMapWidth;
      const maxTranslateX = 0;
      const minTranslateY = screenHeight - scaledMapHeight;
      const maxTranslateY = 0;

      // Apply momentum with decay animation
      skiaTranslateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [minTranslateX, maxTranslateX],
        deceleration: 0.998,
      }, (finished) => {
        if (finished) {
          runOnJS(setTranslate)(skiaTranslateX.value, skiaTranslateY.value);
        }
      });

      skiaTranslateY.value = withDecay({
        velocity: event.velocityY,
        clamp: [minTranslateY, maxTranslateY],
        deceleration: 0.998,
      }, (finished) => {
        if (finished) {
          runOnJS(setTranslate)(skiaTranslateX.value, skiaTranslateY.value);
        }
      });

      baseTranslateX.value = skiaTranslateX.value;
      baseTranslateY.value = skiaTranslateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Use useDerivedValue to create transform array on UI thread
  const transform = useDerivedValue(() => {
    return [
      { translateX: skiaTranslateX.value },
      { translateY: skiaTranslateY.value },
      { scale: skiaScale.value },
    ];
  }, []);

  // Memoize country path components to prevent re-renders
  const countryElements = useMemo(() => {
    return countryPaths.map((country) => (
      <React.Fragment key={country.id}>
              {<Path path={country.path} color="#FFFFE0" style="fill" />}
              {<Path path={country.path} color="#000000" style="stroke" strokeWidth={0.01} />}


            </React.Fragment>

    ));
  }, [countryPaths]);

  return (
    <GestureDetector gesture={composedGesture}>
      <Canvas style={{ flex: 1 }}>
        <Group transform={transform}>
          {/* Ocean background */}
          <Path
            path={`M0,0 L${MAP_WIDTH},0 L${MAP_WIDTH},${MAP_HEIGHT} L0,${MAP_HEIGHT} Z`}
            color="rgb(109, 204, 236)"
          />

          {/* Render all countries */}
          {countryElements}
        </Group>
      </Canvas>
    </GestureDetector>
  );
};