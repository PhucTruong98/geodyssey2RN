import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// SVG map dimensions
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 482;

export interface MapTransform {
  x: number;
  y: number;
  scale: number;
}

export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Hook for managing map transform state shared across all layers
 * Uses Reanimated shared values for high-performance synchronization
 */
export const useMapTransform = () => {
  // Initial scale to fit screen height

  // const initialScale = screenHeight / MAP_HEIGHT;
  const initialScale = (screenHeight * 1000 / 482) / screenWidth


  // Shared values for transform (no React re-renders during gestures)
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(initialScale);

  // Utility functions
  const utils = useMemo(() => ({
    /**
     * Convert screen coordinates to map coordinates
     */
    screenToMap: (screenX: number, screenY: number, currentScale: number, currentX: number, currentY: number) => {
      return {
        x: (screenX - currentX) / currentScale,
        y: (screenY - currentY) / currentScale,
      };
    },

    /**
     * Convert map coordinates to screen coordinates
     */
    mapToScreen: (mapX: number, mapY: number, currentScale: number, currentX: number, currentY: number) => {
      return {
        x: mapX * currentScale + currentX,
        y: mapY * currentScale + currentY,
      };
    },

    /**
     * Get current visible bounds in map coordinates
     */
    getVisibleBounds: (screenWidth: number, screenHeight: number, currentScale: number, currentX: number, currentY: number): MapBounds => {
      const topLeft = {
        x: (0 - currentX) / currentScale,
        y: (0 - currentY) / currentScale,
      };
      const bottomRight = {
        x: (screenWidth - currentX) / currentScale,
        y: (screenHeight - currentY) / currentScale,
      };

      return {
        minX: topLeft.x,
        maxX: bottomRight.x,
        minY: topLeft.y,
        maxY: bottomRight.y,
      };
    },

    /**
     * Check if a point is visible in current viewport
     */
    isPointVisible: (
      mapX: number,
      mapY: number,
      screenWidth: number,
      screenHeight: number,
      currentScale: number,
      currentX: number,
      currentY: number
    ): boolean => {
      const screen = utils.mapToScreen(mapX, mapY, currentScale, currentX, currentY);
      return screen.x >= 0 && screen.x <= screenWidth && screen.y >= 0 && screen.y <= screenHeight;
    },
  }), []);

  return {
    // Shared transform values
    transform: { x, y, scale },

    // Constants
    constants: {
      MAP_WIDTH,
      MAP_HEIGHT,
      initialScale,
    },

    // Utility functions
    utils,
  };
};
