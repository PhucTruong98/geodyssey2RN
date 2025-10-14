import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useMapContext } from '../WorldMapMainComponent';
import { getMapViewerHtml } from '../webview/getMapViewerHtml';


/**
 * SVG Layer - Renders the base world map using WebView with D3
 * Handles pan/zoom gestures and syncs transform with parent component
 */
export const WorldMapSVGLayer: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const { transform, constants } = useMapContext();
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  // Load the SVG content and generate HTML
  useEffect(() => {
    const loadContent = async () => {
      try {
        // Load SVG
        const asset = Asset.fromModule(require('../../../assets/world-map.svg'));
        await asset.downloadAsync();
 

        const response = await fetch(asset.uri);
        const svgText = await response.text();
        console.log('SVG loaded successfully, length:', svgText.length);

        // Generate HTML content with template
        const html = await getMapViewerHtml({
          svgData: svgText,
          initialScale: constants.initialScale,
        });
        setHtmlContent(html);
        console.log('HTML content generated successfully');
      } catch (error) {
        console.error('Error loading content:', error);
      }
    };
    loadContent();
  }, [constants.initialScale]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'transform') {
        // Update shared values (syncs with all layers)
        transform.scale.value = data.scale;
        transform.x.value = data.translateX;
        transform.y.value = data.translateY;
      } else if (data.type === 'debug') {
        // Show debug info from constraint function
        console.log('🔍 Constraint Debug:', data.data);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  if (!htmlContent) {
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
        source={{ html: htmlContent }}
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
        // Enable remote debugging for WebView
        webviewDebuggingEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always" // allows http content on https pages (debug)
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
