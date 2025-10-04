import React from 'react';
import { Platform } from 'react-native';

// Platform-specific imports
const SkiaWorldMap = Platform.OS !== 'web'
  ? require('./SkiaWorldMap').SkiaWorldMap
  : null;

const SvgWorldMap = require('./WorldMap').WorldMap;
const D3WorldMap = require('./D3WorldMap').D3WorldMap;
const OptimizedWorldMap = require('./OptimizedWorldMap').OptimizedWorldMap;
const CulledWorldMap = require('./CulledWorldMap').CulledWorldMap;
const SimpleSkiaWorldMap = require('./SimpleSkiaWorldMap').SimpleSkiaWorldMap;

export const WorldMapContainer: React.FC = () => {
  // Use original WorldMap with clickable countries
  return <SkiaWorldMap />;
};