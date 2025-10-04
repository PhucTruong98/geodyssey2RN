import { useMapStore } from '@/store';
import { Canvas, Group, Path, Skia, Text } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import React, { useEffect, useState, useCallback } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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

export const SimpleSkiaWorldMap: React.FC = () => {
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string, path: any, bbox: any}[]>([]);

  // Simple state management - no shared values to avoid worklet conflicts
  const [currentScale, setCurrentScale] = useState(Math.max(scale, 1.0));
  const [currentTranslateX, setCurrentTranslateX] = useState(translateX);
  const [currentTranslateY, setCurrentTranslateY] = useState(translateY);

  const initialScale = screenHeight / 482;
  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const aspectRatio = svgOriginalWidth / svgOriginalHeight;
  const mapHeight = screenHeight;
  const mapWidth = mapHeight * aspectRatio;
  const minScale = 1.0;

  // Calculate viewport bounds for culling
  const getViewportBounds = useCallback(() => {
    const left = (-currentTranslateX) / (currentScale * initialScale);
    const top = (-currentTranslateY) / (currentScale * initialScale);
    const right = left + (screenWidth / (currentScale * initialScale));
    const bottom = top + (screenHeight / (currentScale * initialScale));
    return { left, top, right, bottom };
  }, [currentScale, currentTranslateX, currentTranslateY, initialScale]);

  // Filter visible countries
  const getVisibleCountries = useCallback(() => {
    const bounds = getViewportBounds();
    return countryPaths.filter(country =>
      country.bbox && isCountryVisible(country.bbox, bounds)
    );
  }, [countryPaths, getViewportBounds]);

  const visibleCountries = getVisibleCountries();

  // Load map data
  useEffect(() => {
    const loadMapData = async () => {
      try {
        const svgUrl = require('../../../assets/world-map.svg');
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
                try {
                  const skiaPath = Skia.Path.MakeFromSVGString(pathData);
                  const bbox = getPathBoundingBox(pathData);
                  if (skiaPath && bbox) {
                    paths.push({ id: countryId, d: pathData, path: skiaPath, bbox });
                  }
                } catch (pathError) {
                  console.warn(`Failed to create Skia path for ${countryId}:`, pathError);
                }
              }
            }
          }

          setCountryPaths(paths);
          console.log(`Loaded ${paths.length} Simple Skia country paths`);
        }
      } catch (error) {
        console.error('Error loading Simple Skia map data:', error);
        setCountryPaths([]);
      }
    };

    loadMapData();
  }, []);

  // Simplified gesture handling without worklets
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newTranslateX = currentTranslateX + event.changeX;
      const newTranslateY = currentTranslateY + event.changeY;

      // Apply boundaries
      const scaledMapWidth = mapWidth * currentScale;
      const scaledMapHeight = mapHeight * currentScale;
      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth));
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight));

      const constrainedX = Math.min(0, Math.max(-maxTranslateX, newTranslateX));
      const constrainedY = Math.min(0, Math.max(-maxTranslateY, newTranslateY));

      setCurrentTranslateX(constrainedX);
      setCurrentTranslateY(constrainedY);
    })
    .onEnd(() => {
      setTranslate(currentTranslateX, currentTranslateY);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = Math.max(minScale, Math.min(5, currentScale * event.scaleChange));
      setCurrentScale(newScale);
    })
    .onEnd(() => {
      setScale(currentScale);
    });

  const composedGesture = Gesture.Race(Gesture.Simultaneous(pinchGesture, panGesture));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Canvas style={styles.canvas}>
          <Group
            transform={[
              { translateX: currentTranslateX },
              { translateY: currentTranslateY },
              { scale: currentScale },
            ]}
          >
            {/* Ocean background */}
            <Path
              path="M0,0 L1000,0 L1000,482 L0,482 Z"
              color="rgb(109, 204, 236)"
            />

            {/* Render only visible countries */}
            {visibleCountries.map((country) => (
              <Path
                key={country.id}
                path={country.path}
                color="#FFFFE0"
                style="fill"
              />
            ))}

            {/* Country borders */}
            {visibleCountries.map((country) => (
              <Path
                key={`${country.id}-border`}
                path={country.path}
                color="#000000"
                style="stroke"
                strokeWidth={0.3}
              />
            ))}
          </Group>

          {/* Debug info */}
          <Text
            x={10}
            y={50}
            text={`Simple Skia: ${visibleCountries.length}/${countryPaths.length}`}
            color="white"
            font={{ size: 12 }}
          />
        </Canvas>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});