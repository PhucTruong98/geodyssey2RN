import { useTheme } from '@/hooks';
import { Asset } from 'expo-asset';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import WebView from 'react-native-webview';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const WorldMapCanvas: React.FC = () => {
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  const scale = useSharedValue(1.0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const svgOriginalWidth = 1000;
  const svgOriginalHeight = 482;
  const aspectRatio = svgOriginalWidth / svgOriginalHeight;
  const mapHeight = screenHeight;
  const mapWidth = mapHeight * aspectRatio;
  const minScale = 1.0;
  const maxScale = 5.0;

  // Load SVG content
  useEffect(() => {
    const loadMapData = async () => {
      try {
        const svgUrl = require('../../../assets/world-map.svg');
        const asset = Asset.fromModule(svgUrl);
        await asset.downloadAsync();

        const response = await fetch(asset.uri);
        if (response.ok) {
          const svgText = await response.text();
          setSvgContent(svgText);
          console.log('Loaded SVG for Canvas rendering');
        }
      } catch (error) {
        console.error('Error loading map data:', error);
      }
    };

    loadMapData();
  }, []);

  // Throttle WebView updates
  const lastUpdateTime = useRef(0);
  const pendingUpdate = useRef<{s: number, tx: number, ty: number} | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateTransform = useCallback((s: number, tx: number, ty: number) => {
    pendingUpdate.current = { s, tx, ty };

    if (animationFrameRef.current !== null) return;

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;

      if (pendingUpdate.current && webViewRef.current) {
        const { s, tx, ty } = pendingUpdate.current;
        const js = `updateTransform(${s}, ${tx}, ${ty}); true;`;
        webViewRef.current.injectJavaScript(js);
        pendingUpdate.current = null;
      }
    });
  }, []);

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      baseScale.value = scale.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
    })
    .onUpdate(event => {
      const newScale = Math.max(minScale, Math.min(maxScale, baseScale.value * event.scale));
      const scaleDelta = newScale / baseScale.value;

      const focalPointOffsetX = focalX.value - screenWidth / 2;
      const focalPointOffsetY = focalY.value - screenHeight / 2;

      const newTranslateX = baseTranslateX.value + focalPointOffsetX * (1 - scaleDelta);
      const newTranslateY = baseTranslateY.value + focalPointOffsetY * (1 - scaleDelta);

      scale.value = newScale;

      const scaledMapWidth = mapWidth * newScale;
      const scaledMapHeight = mapHeight * newScale;

      const maxTranslateX = Math.max(0, (scaledMapWidth - screenWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledMapHeight - screenHeight) / 2);

      translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
      translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));

      runOnJS(updateTransform)(scale.value, translateX.value, translateY.value);
    })
    .onEnd(() => {
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
      baseScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
    })
    .onUpdate(event => {
      const currentScale = scale.value;
      const scaledMapWidth = mapWidth * currentScale;
      const scaledMapHeight = mapHeight * currentScale;

      const maxTranslateX = Math.max(0, scaledMapWidth - screenWidth);
      const maxTranslateY = Math.max(0, scaledMapHeight - screenHeight);

      const newTranslateX = baseTranslateX.value + event.translationX;
      const newTranslateY = baseTranslateY.value + event.translationY;

      translateX.value = Math.min(0, Math.max(-maxTranslateX, newTranslateX));
      translateY.value = Math.min(0, Math.max(-maxTranslateY, newTranslateY));

      runOnJS(updateTransform)(scale.value, translateX.value, translateY.value);
    })
    .onEnd(() => {
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Race(Gesture.Simultaneous(pinchGesture, panGesture));

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        body {
          background-color: rgb(109, 204, 236);
        }
        canvas {
          display: block;
          width: 100vw;
          height: 100vh;
        }
      </style>
    </head>
    <body>
      <canvas id="canvas"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d', {
          alpha: false,
          desynchronized: true,
          willReadFrequently: false
        });

        // Set canvas size - use lower resolution for better performance
        const pixelRatio = Math.min(window.devicePixelRatio, 2); // Cap at 2x
        canvas.width = window.innerWidth * pixelRatio;
        canvas.height = window.innerHeight * pixelRatio;

        const svgWidth = 1000;
        const svgHeight = 482;
        const aspectRatio = svgWidth / svgHeight;
        const canvasHeight = canvas.height;
        const canvasWidth = canvasHeight * aspectRatio;

        let currentScale = 1.0;
        let currentTranslateX = 0;
        let currentTranslateY = 0;

        // Parse and store SVG paths as Path2D objects (cache them)
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(\`${svgContent}\`, 'image/svg+xml');
        const pathElements = Array.from(svgDoc.querySelectorAll('path'));

        // Pre-create Path2D objects for better performance
        const path2DObjects = pathElements.map(path => {
          const d = path.getAttribute('d');
          return d ? new Path2D(d) : null;
        }).filter(p => p !== null);

        console.log('Cached ' + path2DObjects.length + ' Path2D objects');

        let animationFrame = null;
        let pendingRender = false;

        function render() {
          pendingRender = false;

          // Clear with ocean color
          ctx.fillStyle = 'rgb(109, 204, 236)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.save();

          // Apply transformations
          ctx.translate(currentTranslateX * pixelRatio, currentTranslateY * pixelRatio);
          ctx.scale(currentScale, currentScale);

          // Scale to fit canvas
          const scale = canvasHeight / svgHeight;
          ctx.scale(scale, scale);

          // Simple viewport culling - skip rendering if way off screen
          const viewportLeft = -currentTranslateX / currentScale;
          const viewportTop = -currentTranslateY / currentScale;
          const viewportRight = viewportLeft + (canvas.width / currentScale);
          const viewportBottom = viewportTop + (canvas.height / currentScale);

          // Batch fill and stroke operations
          ctx.fillStyle = '#FFFFE0';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 0.3;

          // Render all paths with cached Path2D objects
          path2DObjects.forEach(path2d => {
            ctx.fill(path2d);
            ctx.stroke(path2d);
          });

          ctx.restore();
        }

        function updateTransform(scale, tx, ty) {
          currentScale = scale;
          currentTranslateX = tx;
          currentTranslateY = ty;

          // Use requestAnimationFrame for smoother rendering
          if (!pendingRender) {
            pendingRender = true;
            requestAnimationFrame(render);
          }
        }

        // Initial render
        render();
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GestureDetector gesture={composedGesture}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webView}
          scrollEnabled={false}
          scalesPageToFit={false}
          bounces={false}
        />
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
