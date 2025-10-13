import React from 'react';
import { WorldMapMainComponent } from './WorldMapMainComponent';



const D3ZoomWorldMap = require('./D3ZoomWorldMap').D3ZoomWorldMap;

/**
 * World Map Container - Entry point for the map
 * Uses layered architecture with WorldMapMainComponent
 */
export const WorldMapContainer: React.FC = () => {
  // Use layered architecture for native
    return (
      <WorldMapMainComponent/>
    );
  }

