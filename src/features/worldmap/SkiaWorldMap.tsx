import { Canvas, Group, Image, matchFont, PaintStyle, Path, Skia, SkImage, Text } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring
} from 'react-native-reanimated';
import { useMapContext } from './WorldMapMainComponent';
import { calculateCentroids } from './utils/calculateCentroids';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// SVG map dimensions
const MAP_WIDTH = 500;
const MAP_HEIGHT = 241;

// Rasterization scale for ultra-high quality rendering
// 18x provides crisp detail up to 18x zoom with acceptable quality to 20x max zoom
const RASTER_SCALE = 35;

// Country labels configuration
const LABEL_FONT_SIZE = 12;
const LABEL_COLOR = '#FF0000';
const VIEWPORT_MARGIN = 0;

// Area thresholds for zoom-based filtering
const AREA_THRESHOLDS = {
  EXTRA_LARGE: 2000,
  LARGE: 700,
  MEDIUM: 150,
  SMALL: 10,
  EXTRA_SMALL: 1,
};

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

  const width = maxX - minX;
  const height = maxY - minY;

  return { minX, minY, maxX, maxY, width, height };
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
  console.log('📍 SkiaWorldMap mounted/rendered');
  const { transform: contextTransform, constants, shouldRerender, centroids, setSelectedCountryCode, setCentroids } = useMapContext();
  const [countryPaths, setCountryPaths] = useState<{id: string, d: string, path: any, bbox: any}[]>([]);
  const [worldMapImage, setWorldMapImage] = useState<SkImage | null>(null);
  const [renderedLabels, setRenderedLabels] = useState<any[]>([]);

  // Use context's shared values for UI thread rendering
  const skiaScale = contextTransform.scale;
  const skiaTranslateX = contextTransform.x;
  const skiaTranslateY = contextTransform.y;

  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Track previous transform values for throttle detection
  const prevScale = useSharedValue(1);
  const prevTranslateX = useSharedValue(0);
  const prevTranslateY = useSharedValue(0);

  // Throttle thresholds
  const SCALE_THROTTLE = 0.3;
  const TRANSLATION_THROTTLE = 0;

  const initialScale = constants.initialScale;
  const aspectRatio = MAP_WIDTH / MAP_HEIGHT;
  const minScale = 1.0;

  // Create Skia font for labels using matchFont (works outside Canvas)
  const skiaFont = useMemo(() => {
    try {
      const font = matchFont({
        fontSize: LABEL_FONT_SIZE,
      });
      console.log('🎨 Created skiaFont:', font);
      return font;
    } catch (e) {
      console.error('❌ Failed to create font:', e);
      return null;
    }
  }, []);


    // Create font for label Pictures
    const testFont = useMemo(() => {
      const fontFamily = Platform.select({
        ios: "Helvetica",
        android: "sans-serif",
        default: "Arial"
      });
  
      const fontStyle = {
        fontFamily,
        fontSize: 12,  // Font size for pre-rendered Pictures
        fontWeight: "bold" as const,
        color: "red"
      };
  
      return matchFont(fontStyle);
    }, []);

  // Calculate visible labels - recomputes on every frame but filters efficiently
  const visibleLabels = useDerivedValue(() => {
    if (!centroids || centroids.length === 0) {
      return [];
    }

    const scale = skiaScale.value;
    const tx = skiaTranslateX.value;
    const ty = skiaTranslateY.value;
    const zoomRatio = scale / initialScale;

    // Determine area threshold based on zoom level
    let areaThreshold: number;
    if (zoomRatio < 1.2) {
      areaThreshold = AREA_THRESHOLDS.EXTRA_LARGE;
    } else if (zoomRatio < 2.0) {
      areaThreshold = AREA_THRESHOLDS.LARGE;
    } else if (zoomRatio < 3.5) {
      areaThreshold = AREA_THRESHOLDS.MEDIUM;
    } else if (zoomRatio < 6.0) {
      areaThreshold = AREA_THRESHOLDS.SMALL;
    } else {
      areaThreshold = AREA_THRESHOLDS.EXTRA_SMALL;
    }

    // Calculate visible bounds in map coordinates
    const minX = (-tx / scale) - VIEWPORT_MARGIN;
    const maxX = ((screenWidth - tx) / scale) + VIEWPORT_MARGIN;
    const minY = (-ty / scale) - VIEWPORT_MARGIN;
    const maxY = ((screenHeight - ty) / scale) + VIEWPORT_MARGIN;

    // Filter and calculate visible labels
     let ret = centroids
      .filter((country: any) => {
        if (country.area < areaThreshold) return false;
        if (country.x < minX || country.x > maxX) return false;
        if (country.y < minY || country.y > maxY) return false;
        return true;
      })
      .map((country: any) => ({
        ...country,
        screenX: country.x * scale + tx,
        screenY: country.y * scale + ty,
      }));

      if (ret.length > 0) {
        console.log('✅ visibleLabels has', ret.length, 'labels. First:', ret[0].id, 'at', ret[0].screenX, ret[0].screenY);
      }
      return ret
  });

  // Bridge Reanimated SharedValue to React state so useMemo detects changes
  useAnimatedReaction(
    () => visibleLabels.value,
    (labels) => {
      runOnJS(setRenderedLabels)(labels);
    },
    []
  );

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

          // Calculate centroids from paths with bboxes
          const calculatedCentroids = calculateCentroids(paths);
          console.log('✅ Calculated centroids:', calculatedCentroids.length);
          if (calculatedCentroids.length > 0) {
            console.log('✅ First centroid:', calculatedCentroids[0]);
          }
          setCentroids(calculatedCentroids);

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
    });

    skiaTranslateX.value = withSpring(translateX, {
      damping: 20,
      stiffness: 90,
      mass: 1,
    });

    skiaTranslateY.value = withSpring(translateY, {
      damping: 20,
      stiffness: 90,
      mass: 1,
    });

    // Update base values for next gesture
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

      // Set selected country to show detailed CountrySkiaLayer
      setSelectedCountryCode(country.id);

      if (country.bbox) {
        zoomToCountry(country.id, country.bbox);
      } else {
        console.warn(`⚠️ Country ${country.id} has no bbox data - cannot zoom`);
      }
    } else {
      console.log('🖱️ Clicked on ocean');
      // Clear selection when clicking on ocean
      setSelectedCountryCode(null);
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      baseScale.value = skiaScale.value;
      baseTranslateX.value = skiaTranslateX.value;
      baseTranslateY.value = skiaTranslateY.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
      // Initialize previous values on first pinch
      prevScale.value = skiaScale.value;
      prevTranslateX.value = skiaTranslateX.value;
      prevTranslateY.value = skiaTranslateY.value;
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

      // Check if transform changed significantly for throttle
      const scaleDiff = Math.abs(newScale - prevScale.value);
      if (scaleDiff >= SCALE_THROTTLE) {
        shouldRerender.value = (shouldRerender.value + 1) % 500; // Increment counter, reset at 500
        console.log("Should rerender Value:", shouldRerender.value)
        prevScale.value = newScale;
        prevTranslateX.value = constrainedX;
        prevTranslateY.value = constrainedY;
      }
    })
    .onEnd(() => {
      const finalScale = skiaScale.value;
      const finalX = skiaTranslateX.value;
      const finalY = skiaTranslateY.value;

      // Update base values for next gesture
      baseTranslateX.value = finalX;
      baseTranslateY.value = finalY;
      baseScale.value = finalScale;

      // Update prev values for next gesture
      prevScale.value = finalScale;
      prevTranslateX.value = finalX;
      prevTranslateY.value = finalY;
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      baseTranslateX.value = skiaTranslateX.value;
      baseTranslateY.value = skiaTranslateY.value;
      // Initialize previous values on pan start
      prevTranslateX.value = skiaTranslateX.value;
      prevTranslateY.value = skiaTranslateY.value;
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

      // Check if translation changed significantly for throttle
      const txDiff = Math.abs(constrainedX - prevTranslateX.value);
      const tyDiff = Math.abs(constrainedY - prevTranslateY.value);



      if (txDiff >= TRANSLATION_THROTTLE || tyDiff >= TRANSLATION_THROTTLE) {
        shouldRerender.value = (shouldRerender.value + 1) % 500; // Increment counter, reset at 500
        // console.log("Should rerender Value:", shouldRerender.value)


        prevTranslateX.value = constrainedX;
        prevTranslateY.value = constrainedY;
      }
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
      });

      skiaTranslateY.value = withDecay({
        velocity: event.velocityY,
        clamp: [minTranslateY, maxTranslateY],
        deceleration: 0.998,
      });

      baseTranslateX.value = skiaTranslateX.value;
      baseTranslateY.value = skiaTranslateY.value;

      // Update prev values for momentum phase
      prevTranslateX.value = skiaTranslateX.value;
      prevTranslateY.value = skiaTranslateY.value;
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


  // Create label elements from visible labels
  const labelElements = useMemo(() => {
    console.log('🏷️ Creating label elements - count:', renderedLabels.length);
    const elements = renderedLabels.map((label: any) => {
      const x = label.screenX - LABEL_FONT_SIZE / 2;
      const y = label.screenY - LABEL_FONT_SIZE / 2;

      const children = [];



      // Label text - only if font is loaded
      if (testFont) {
        children.push(
          <Text
            key={`text-${label.id}`}
            text={label.id}
            font={testFont}
            x={x + 5}
            y={y + 2}
          />
        );
      }

      return (
        <React.Fragment key={label.id}>
          {children}
        </React.Fragment>
      );
    });
    console.log('🏷️ Created', elements.length, 'label elements');
    return elements;
  }, [renderedLabels, skiaFont]);

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

        {/* Render country labels OUTSIDE the Group so they don't get transformed */}
        {labelElements}
      </Canvas>
    </GestureDetector>
  );
};