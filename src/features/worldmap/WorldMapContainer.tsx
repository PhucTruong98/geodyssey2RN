import React from 'react';
import { Platform } from 'react-native';

// Platform-specific imports
const SkiaWorldMap = Platform.OS !== 'web'
  ? require('./SkiaWorldMap').SkiaWorldMap
  : null;

const WebViewWorldMap = Platform.OS !== 'web'
  ? require('./WebViewWorldMap').WebViewWorldMap
  : null;

const D3WorldMap = require('./D3WorldMap').D3WorldMap;
const D3ZoomWorldMap = require('./D3ZoomWorldMap').D3ZoomWorldMap;
const OptimizedWorldMap = require('./OptimizedWorldMap').OptimizedWorldMap;
const CulledWorldMap = require('./CulledWorldMap').CulledWorldMap;
const SimpleSkiaWorldMap = require('./SimpleSkiaWorldMap').SimpleSkiaWorldMap;

export const WorldMapContainer: React.FC = () => {
  // Use WebView for native (better pan performance), D3 for web
  if (Platform.OS !== 'web' && WebViewWorldMap) {
    return <WebViewWorldMap />;
  }

  // Fallback to D3ZoomWorldMap for web
  return <D3ZoomWorldMap />;
};