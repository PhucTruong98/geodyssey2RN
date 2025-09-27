import React from 'react';
import { Platform } from 'react-native';

// Platform-specific imports
const SkiaWorldMap = Platform.OS !== 'web'
  ? require('./SkiaWorldMap').SkiaWorldMap
  : null;

const SvgWorldMap = require('./WorldMap').WorldMap;

export const WorldMapContainer: React.FC = () => {
  // Use Skia on mobile for better performance, SVG on web for compatibility
  if (Platform.OS !== 'web' && SkiaWorldMap) {
    return <SkiaWorldMap />;
  }

  return <SvgWorldMap />;
};