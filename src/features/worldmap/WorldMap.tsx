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
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const WorldMap: React.FC = () => {
  const theme = useTheme();
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();
  const [svgContent, setSvgContent] = useState<string>('');

  const animatedScale = useSharedValue(scale);
  const animatedTranslateX = useSharedValue(translateX);
  const animatedTranslateY = useSharedValue(translateY);

  const baseScale = useSharedValue(1);

  useEffect(() => {
    const loadSvgContent = async () => {
      try {
        // Try to fetch the SVG from the public assets (root assets folder)
        // Let's first test with the smaller world.svg file
        const svgUrl = require('../../../assets/world-map.svg');
        // const svgUrl = require('../../../assets/world.svg');

        const asset = Asset.fromModule(svgUrl);
        await asset.downloadAsync();

        const response = await fetch(asset.uri);
        if (response.ok) {
          let svgText = await response.text();

          // Modify SVG to set sea (background) to light blue and land to light yellow
          svgText = svgText
            // Add default fill color to all path elements that don't have fill attributes
            .replace(/<path([^>]*?)(?!.*fill)([^>]*?)>/g, '<path$1 fill="#FFFFE0"$2>')

            // Add light blue background for sea
            .replace(/<svg([^>]*)>/, '<svg$1 style="background-color:rgb(175, 235, 255);">')
            // Also add a global fill style if no individual fills are working
            .replace(/<svg([^>]*)>/, '<svg$1><defs><style>path { fill: #FFFFE0; stroke: #D4AC0D; stroke-width: 0.5; }</style></defs>');

          setSvgContent(svgText);
          console.log('SVG loaded successfully from fetch');
        } else {
          throw new Error(`Failed to fetch SVG: ${response.status}`);
        }
      } catch (error) {
        console.error('Error loading SVG:', error);

        // Fallback to placeholder
        const placeholderSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="482" viewBox="0 0 1000 482">
            <g fill="#ccc" stroke="#333" stroke-width="0.5">
              <rect x="50" y="50" width="900" height="382" fill="#e0e0e0" stroke="#333"/>
              <text x="500" y="241" text-anchor="middle" font-family="Arial" font-size="24" fill="#666">
                World Map (Placeholder)
              </text>
            </g>
          </svg>
        `;
        setSvgContent(placeholderSvg);
        console.log('Using placeholder SVG due to loading error');
      }
    };

    loadSvgContent();
  }, []);


  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      baseScale.value = animatedScale.value;
    })
    .onUpdate(event => {
      const newScale = Math.max(0.5, Math.min(5, baseScale.value * event.scale));
      animatedScale.value = newScale;
    })
    .onEnd(() => {
      runOnJS(setScale)(animatedScale.value);
    });

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      animatedTranslateX.value = event.translationX;
      animatedTranslateY.value = event.translationY;
    })
    .onEnd(event => {
      runOnJS(setTranslate)(event.translationX, event.translationY);
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animatedTranslateX.value },
      { translateY: animatedTranslateY.value },
      { scale: animatedScale.value },
    ],
  }));

  // Calculate the appropriate width to maintain aspect ratio when height = screenHeight
  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const aspectRatio = svgOriginalWidth / svgOriginalHeight;
  const mapHeight = screenHeight;
  const mapWidth = mapHeight * aspectRatio;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.mapContainer, animatedStyle]}>
          {svgContent ? (
            <SvgXml
              xml={svgContent}
              width={mapWidth}
              height={mapHeight}
            />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
});