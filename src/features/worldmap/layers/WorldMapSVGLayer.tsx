import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useMapContext } from '../WorldMapMainComponent';

/**
 * SVG Layer - Renders the base world map using WebView with D3
 * Handles pan/zoom gestures and syncs transform with parent component
 */
export const WorldMapSVGLayer: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const { transform, constants } = useMapContext();
  const [svgData, setSvgData] = useState<string | null>(null);

  // Load the SVG content directly
  useEffect(() => {
    const loadSvg = async () => {
      try {
        const asset = Asset.fromModule(require('../../../assets/world-map.svg'));
        await asset.downloadAsync();

        // Fetch the SVG content
        const response = await fetch(asset.uri);
        const svgText = await response.text();
        setSvgData(svgText);
        console.log('SVG loaded successfully, length:', svgText.length);
      } catch (error) {
        console.error('Error loading SVG:', error);
      }
    };
    loadSvg();
  }, []);

  const getHtmlContent = () => `
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
      touch-action: none;
    }

    svg {
      width: 100vw;
      height: 100vh;
      display: block;
    }

    .country {
      fill: #FFFFE0;
      stroke: #000000;
      stroke-width: 0.07;
      shape-rendering: optimizeSpeed;
    }

    #countries {
      will-change: transform;
      transform-origin: 0 0;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      /* Force rasterization - scale the bitmap, don't re-render SVG */
      isolation: isolate;
      contain: layout style paint;
    }

    /* Hardware acceleration hint */
    svg {
      transform: translateZ(0);
      shape-rendering: optimizeSpeed;
      /* Treat SVG as bitmap during transforms */
      image-rendering: optimizeSpeed;
      image-rendering: -webkit-optimize-contrast;
    }

    /* Optimize rendering */
    * {
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
    }

    /* Force layer compositing */
    body, html {
      transform: translate3d(0, 0, 0);
    }

    .ocean {
      fill: rgb(109, 204, 236);
    }
  </style>
</head>
<body>
  <svg id="map" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 482">
    <rect class="ocean" x="0" y="0" width="1000" height="482" />
    <g id="countries"></g>
  </svg>

  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script>
    (function() {
      const svg = d3.select('#map');
      const countriesGroup = d3.select('#countries');

      // SVG data is embedded directly
      const svgText = \`${svgData?.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;

      try {
        // Parse SVG and extract paths
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const paths = svgDoc.querySelectorAll('path');

        console.log('Parsing SVG, found paths:', paths.length);

        // Add paths to D3 selection
        paths.forEach(path => {
          countriesGroup.append('path')
            .attr('class', 'country')
            .attr('d', path.getAttribute('d'))
            .attr('id', path.getAttribute('id') || '');
        });

        console.log(\`Loaded \${paths.length} country paths\`);
        setupZoom();
      } catch (error) {
        console.error('Error parsing SVG:', error);
      }

      function setupZoom() {
        // Use CSS transform instead of SVG transform for better performance
        const countriesNode = countriesGroup.node();

        // Use requestAnimationFrame for smoother updates
        let ticking = false;
        let pendingTransform = null;

        const zoom = d3.zoom()
          .scaleExtent([1, 20])
          .on('zoom', (event) => {
            pendingTransform = event.transform;

            if (!ticking) {
              requestAnimationFrame(() => {
                if (pendingTransform) {
                  // Apply transform using CSS transform (GPU accelerated)
                  const t = pendingTransform;
                  countriesNode.style.transform = \`translate3d(\${t.x}px, \${t.y}px, 0) scale(\${t.k})\`;
                  pendingTransform = null;
                }
                ticking = false;
              });
              ticking = true;
            }
          })
          .on('end', (event) => {
            // Only send transform data to React Native when zoom ends
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'transform',
              scale: event.transform.k,
              translateX: event.transform.x,
              translateY: event.transform.y
            }));
          });

        svg.call(zoom);

        // Set initial zoom to fit screen height (passed from React Native)
        const initialScale = ${constants.initialScale};
        svg.call(zoom.transform, d3.zoomIdentity.scale(initialScale));

        console.log('Zoom setup complete, initial scale:', initialScale);
      }

      // Handle messages from React Native
      document.addEventListener('message', function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'zoomToCountry') {
          // Implement zoom to country functionality if needed
        }
      });
    })();
  </script>
</body>
</html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'transform') {
        // Update shared values (syncs with all layers)
        transform.scale.value = data.scale;
        transform.x.value = data.translateX;
        transform.y.value = data.translateY;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  if (!svgData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: getHtmlContent() }}
        style={styles.webview}
        onMessage={handleMessage}
        onConsoleMessage={(event) => {
          console.log('WebView Console:', event.nativeEvent.message);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        allowsInlineMediaPlayback={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgb(109, 204, 236)',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
