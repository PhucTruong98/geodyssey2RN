import { useTheme } from '@/hooks';
import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Vertex shader - positions vertices
const vertexShader = `
  attribute vec2 position;
  uniform mat3 transform;

  void main() {
    vec3 transformed = transform * vec3(position, 1.0);
    gl_Position = vec4(transformed.xy, 0.0, 1.0);
  }
`;

// Fragment shader - colors pixels
const fragmentShader = `
  precision mediump float;
  uniform vec4 color;

  void main() {
    gl_FragColor = color;
  }
`;

// Parse SVG path data to vertices (simplified - handles M, L commands)
const parseSVGPath = (pathData: string): number[] => {
  const vertices: number[] = [];
  const commands = pathData.match(/[MLZ][^MLZ]*/g);

  if (!commands) return vertices;

  let currentX = 0;
  let currentY = 0;

  commands.forEach(cmd => {
    const type = cmd[0];
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

    if (type === 'M' && coords.length >= 2) {
      currentX = coords[0];
      currentY = coords[1];
      vertices.push(currentX, currentY);
    } else if (type === 'L' && coords.length >= 2) {
      vertices.push(currentX, currentY);
      currentX = coords[0];
      currentY = coords[1];
      vertices.push(currentX, currentY);
    }
  });

  return vertices;
};

// Normalize SVG coordinates to WebGL clip space (-1 to 1)
const normalizeCoordinates = (vertices: number[], svgWidth: number, svgHeight: number): number[] => {
  return vertices.map((v, i) => {
    if (i % 2 === 0) {
      // X coordinate: 0-1000 -> -1 to 1
      return (v / svgWidth) * 2 - 1;
    } else {
      // Y coordinate: 0-482 -> 1 to -1 (flip Y for WebGL)
      return -((v / svgHeight) * 2 - 1);
    }
  });
};

// Create transformation matrix for pan/zoom
const createTransformMatrix = (
  scale: number,
  translateX: number,
  translateY: number,
  screenWidth: number,
  screenHeight: number
): number[] => {
  // Convert screen-space translation to clip space
  const tx = (translateX / screenWidth) * 2;
  const ty = -(translateY / screenHeight) * 2;

  // 3x3 transformation matrix (column-major for WebGL)
  return [
    scale, 0, 0,
    0, scale, 0,
    tx, ty, 1
  ];
};

export const WorldMapGL: React.FC = () => {
  const theme = useTheme();
  const [countryPaths, setCountryPaths] = useState<{id: string, vertices: number[]}[]>([]);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const buffersRef = useRef<WebGLBuffer[]>([]);

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

  // Load and parse SVG data
  useEffect(() => {
    const loadMapData = async () => {
      try {
        const svgUrl = require('../../../assets/world-map.svg');
        const asset = Asset.fromModule(svgUrl);
        await asset.downloadAsync();

        const response = await fetch(asset.uri);
        if (response.ok) {
          const svgText = await response.text();
          const lines = svgText.split('\n');
          const paths: {id: string, vertices: number[]}[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('<path') && line.includes('>')) {
              const idMatch = line.match(/id="([^"]*)"/);
              const pathMatch = line.match(/d="([^"]*)"/);
              const countryId = idMatch ? idMatch[1] : '';
              const pathData = pathMatch ? pathMatch[1] : '';

              if (countryId && pathData) {
                const vertices = parseSVGPath(pathData);
                const normalized = normalizeCoordinates(vertices, svgOriginalWidth, svgOriginalHeight);
                if (normalized.length > 0) {
                  paths.push({ id: countryId, vertices: normalized });
                }
              }
            }
          }

          setCountryPaths(paths);
          console.log(`Loaded ${paths.length} country paths for WebGL`);
        }
      } catch (error) {
        console.error('Error loading map data:', error);
        setCountryPaths([]);
      }
    };

    loadMapData();
  }, []);

  // Initialize WebGL
  const onContextCreate = (gl: WebGLRenderingContext) => {
    glRef.current = gl;

    // Compile shaders
    const vShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShader, vertexShader);
    gl.compileShader(vShader);

    const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fShader, fragmentShader);
    gl.compileShader(fShader);

    // Create program
    const program = gl.createProgram()!;
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    programRef.current = program;

    // Set clear color (ocean blue)
    gl.clearColor(109/255, 204/255, 236/255, 1.0);

    // Initial render
    renderGL();
  };

  const renderGL = () => {
    const gl = glRef.current;
    const program = programRef.current;

    if (!gl || !program || countryPaths.length === 0) return;

    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Get attribute/uniform locations
    const positionLocation = gl.getAttribLocation(program, 'position');
    const transformLocation = gl.getUniformLocation(program, 'transform');
    const colorLocation = gl.getUniformLocation(program, 'color');

    // Create transformation matrix
    const transformMatrix = createTransformMatrix(
      scale.value,
      translateX.value,
      translateY.value,
      screenWidth,
      screenHeight
    );

    gl.uniformMatrix3fv(transformLocation, false, transformMatrix);

    // Render each country
    countryPaths.forEach((country, index) => {
      // Create or reuse buffer
      let buffer = buffersRef.current[index];
      if (!buffer) {
        buffer = gl.createBuffer()!;
        buffersRef.current[index] = buffer;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(country.vertices), gl.STATIC_DRAW);

      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Set color (light yellow for land)
      gl.uniform4f(colorLocation, 1.0, 1.0, 224/255, 1.0);

      // Draw lines
      gl.drawArrays(gl.LINES, 0, country.vertices.length / 2);
    });

    gl.flush();
    gl.endFrameEXP();
  };

  const requestRender = () => {
    if (glRef.current) {
      renderGL();
    }
  };

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

      runOnJS(requestRender)();
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

      runOnJS(requestRender)();
    })
    .onEnd(() => {
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Race(Gesture.Simultaneous(pinchGesture, panGesture));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GestureDetector gesture={composedGesture}>
        <GLView
          style={styles.glView}
          onContextCreate={onContextCreate}
        />
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glView: {
    flex: 1,
  },
});
