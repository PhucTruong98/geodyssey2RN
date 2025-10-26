import { useMapStore } from '@/store';
import { Canvas, Group, Image, PaintStyle, Path, Skia, SkImage } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// SVG map dimensions
const MAP_WIDTH = 500;
const MAP_HEIGHT = 241;

// Rasterization scale for ultra-high quality rendering
// 18x provides crisp detail up to 18x zoom with acceptable quality to 20x max zoom
const RASTER_SCALE = 35;

// Function to parse SVG path and calculate bounding box
const getPathBoundingBox = (pathData: string) => {
  // Extract all numbers from the path (coordinates are space or comma separated)
  const numbers = pathData.match(/-?\d+\.?\d*/g);
  if (!numbers || numbers.length < 2) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // Process pairs of numbers as (x, y) coordinates
  for (let i = 0; i < numbers.length - 1; i += 2) {
    const x = parseFloat(numbers[i]);
    const y = parseFloat(numbers[i + 1]);

    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

/**
 * Create a high-resolution world map image from country paths
 * Uses PictureRecorder to draw all countries once, then rasterizes to GPU-cached image
 */
const createWorldMapImage = (
  countryPaths: {id: string, d: string, path: any, bbox: any}[]
): SkImage | null => {
  if (countryPaths.length === 0) {
    console.warn('No country paths to render');
    return null;
  }

  // Scale dimensions for high-quality rasterization
  const rasterWidth = MAP_WIDTH * RASTER_SCALE;
  const rasterHeight = MAP_HEIGHT * RASTER_SCALE;

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording({
    x: 0,
    y: 0,
    width: rasterWidth,
    height: rasterHeight
  });

  // Scale the canvas to draw at higher resolution
  canvas.scale(RASTER_SCALE, RASTER_SCALE);

  // Draw ocean background
  const oceanPath = Skia.Path.Make();
  oceanPath.addRect({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT });
  const oceanPaint = Skia.Paint();
  oceanPaint.setColor(Skia.Color('rgb(109, 204, 236)')); // Ocean blue
  oceanPaint.setStyle(PaintStyle.Fill);
  canvas.drawPath(oceanPath, oceanPaint);

  // Create paint for land fill (yellow)
  const fillPaint = Skia.Paint();
  fillPaint.setColor(Skia.Color('#FFFFE0')); // Light yellow
  fillPaint.setStyle(PaintStyle.Fill);
  fillPaint.setAntiAlias(true);

  // Create paint for country borders (black)
  const strokePaint = Skia.Paint();
  strokePaint.setColor(Skia.Color('#000000')); // Black
  strokePaint.setStyle(PaintStyle.Stroke);
  strokePaint.setStrokeWidth(0.05); // Will be scaled by canvas
  strokePaint.setAntiAlias(true);

  // Draw all countries
  countryPaths.forEach((country) => {
    if (country.path) {
      // Draw fill first, then stroke on top
      canvas.drawPath(country.path, fillPaint);
      canvas.drawPath(country.path, strokePaint);
    }
  });

  console.log(`Drew ${countryPaths.length} countries at ${RASTER_SCALE}x resolution`);

  const picture = recorder.finishRecordingAsPicture();

  // Convert Picture to Image (GPU texture) for better performance
  // Create a surface at high resolution, draw the picture, and snapshot
  const surface = Skia.Surface.Make(Math.ceil(rasterWidth), Math.ceil(rasterHeight));

  if (!surface) {
    console.error('Failed to create surface for world map image conversion');
    return null;
  }

  const canvas2 = surface.getCanvas();
  canvas2.drawPicture(picture);

  // Get the high-resolution image from the surface
  const image = surface.makeImageSnapshot();

  console.log('✅ Created GPU-cached world map image');
  return image;
};

export const SkiaWorldMap: React.FC = () => {
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string, path: any, bbox: any}[]>([]);
  const [worldMapImage, setWorldMapImage] = useState<SkImage | null>(null);

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
                  if (bbox) {
                    paths.push({ id: countryId, d: pathData, path: skiaPath, bbox });
                  } else {
                    console.warn(`No bbox for country: ${countryId}`);
                    paths.push({ id: countryId, d: pathData, path: skiaPath, bbox: null });
                  }
                }
              }
            }
          }

          setCountryPaths(paths);
          console.log(`Loaded ${paths.length} Skia country paths`);

          // Create high-resolution world map image from paths
          const mapImage = createWorldMapImage(paths);
          if (mapImage) {
            setWorldMapImage(mapImage);
          }
        } else {
          throw new Error(`Failed to fetch SVG: ${response.status}`);
        }


      } catch (error) {
        console.error('Error loading Skia map data:', error);
        setCountryPaths([]);
        setWorldMapImage(null);
      }
    };

    loadMapData();
  }, []);

  // Function to convert screen coordinates to map coordinates
  const screenToMapCoords = (screenX: number, screenY: number) => {
    const currentScale = skiaScale.value;
    const currentTranslateX = skiaTranslateX.value;
    const currentTranslateY = skiaTranslateY.value;

    // Convert screen point to map coordinates
    // The map coordinates are in the original SVG space (0-500 x 0-241)
    const mapX = (screenX - currentTranslateX) / currentScale;
    const mapY = (screenY - currentTranslateY) / currentScale;

    console.log(`Screen (${screenX.toFixed(0)}, ${screenY.toFixed(0)}) → Map (${mapX.toFixed(2)}, ${mapY.toFixed(2)})`);
    return { mapX, mapY };
  };

  // Function to find which country was clicked
  const findCountryAtPoint = (mapX: number, mapY: number) => {
    // Check each country path to see if it contains the point
    for (const country of countryPaths) {
      if (country.path && country.path.contains(mapX, mapY)) {
        return country;
      }
    }
    return null;
  };

  // Function to zoom to a specific country with animation
  const zoomToCountry = (countryId: string, bbox: any) => {
    if (!bbox) return;

    // Calculate scale to fit country on screen with some padding
    const padding = 0;
    const scaleX = (screenWidth - padding * 2) / bbox.width;
    const scaleY = (screenHeight - padding * 2) / bbox.height;
    const newScale = Math.min(scaleX, scaleY);

    // Calculate center of country in map coordinates
    const countryCenterX = bbox.minX + bbox.width / 2;
    const countryCenterY = bbox.minY + bbox.height / 2;

    // Calculate translation to center the country on screen
    const translateX = screenWidth / 2 - countryCenterX * newScale;
    const translateY = screenHeight / 2 - countryCenterY * newScale;

    // Animate to new values with spring animation
    skiaScale.value = withSpring(newScale, {
      damping: 20,
      stiffness: 90,
      mass: 1,
    }, (finished) => {
      if (finished) {
        runOnJS(setScale)(newScale);
      }
    });

    skiaTranslateX.value = withSpring(translateX, {
      damping: 20,
      stiffness: 90,
      mass: 1,
    }, (finished) => {
      if (finished) {
        runOnJS(setTranslate)(translateX, translateY);
      }
    });

    skiaTranslateY.value = withSpring(translateY, {
      damping: 20,
      stiffness: 90,
      mass: 1,
    });

    // Update base values
    baseTranslateX.value = translateX;
    baseTranslateY.value = translateY;
    baseScale.value = newScale;

    console.log(`🗺️ Zooming to country: ${countryId}`);
  };

  // Handle tap to detect country click
  const handleTap = (x: number, y: number) => {
    const { mapX, mapY } = screenToMapCoords(x, y);
    const country = findCountryAtPoint(mapX, mapY);

    if (country) {
      console.log(`🖱️ Clicked country: ${country.id}`, country.bbox);
      if (country.bbox) {
        zoomToCountry(country.id, country.bbox);
      } else {
        console.warn(`⚠️ Country ${country.id} has no bbox data - cannot zoom`);
      }
    } else {
      console.log('🖱️ Clicked on ocean');
    }
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
      const newScale = Math.max(initialScale, Math.min(30, baseScale.value * event.scale));

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

  // Tap gesture to detect country clicks
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      runOnJS(handleTap)(event.x, event.y);
    });

  // Combine all gestures - tap should not interfere with pan/pinch
  const composedGesture = Gesture.Race(
    Gesture.Simultaneous(pinchGesture, panGesture),
    tapGesture
  );


  // Create invisible hit-testing paths for tap detection
  // These paths are transparent but still detect hits via the handleTap function
  const countryElements = useMemo(() => {
    return countryPaths.map((country) => (
      <Path
        key={country.id}
        path={country.path}
        color="transparent"
        style="fill"
      />
    ));
  }, [countryPaths]);

  // Use useDerivedValue to create transform array on UI thread
  const transform = useDerivedValue(() => {
    return [
      { translateX: skiaTranslateX.value },
      { translateY: skiaTranslateY.value },
      { scale: skiaScale.value },
    ];
  }, []);

  return (
    <GestureDetector gesture={composedGesture}>
      <Canvas style={{ flex: 1 }}>
        <Group transform={transform}>
          {/* Render high-resolution world map image (visible) */}
          {worldMapImage && (
            <Image
              image={worldMapImage}
              x={0}
              y={0}
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              fit="fill"
            />
          )}

          {/* Render invisible country paths for hit-testing */}
        </Group>
      </Canvas>
    </GestureDetector>
  );
};