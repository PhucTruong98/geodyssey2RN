import { useMapStore } from '@/store';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const initialSvgW = 1000;
const initialSvgH = 482;
const initialScale = screenHeight / initialSvgH;
const aspectRatio = initialSvgW / initialSvgH;
const mapHeight = screenHeight;
const mapWidth = mapHeight * aspectRatio;

const getPathBoundingBox = (pathData: string) => {
  const coords = pathData.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g);
  if (!coords || coords.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  coords.forEach(coord => {
    const [x, y] = coord.split(',').map(Number);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

export const SkiaWorldMap2: React.FC = () => {
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();

  // --- useSharedValue for transforms (you said you switched to this already) ---
  const skiaScale = useSharedValue(Math.max(scale, 1.0));
  const skiaTx = useSharedValue(translateX);
  const skiaTy = useSharedValue(translateY);

  // store Skia Paths (cached refs)
  const countryFillPathsRef = useRef<
    { id: string; d: string; path: ReturnType<typeof Skia.Path.MakeFromSVGString> | null; bbox?: any }[]
  >([]);
  const outlineMergedPathRef = useRef<any | null>(null);
  const perCountryOutlineMapRef = useRef<Record<string, any>>({});

  const [loaded, setLoaded] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  // Gesture state (you can keep your existing gestures - shortened here)
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const baseScale = useSharedValue(skiaScale.value);

  // --- load both the original SVG (fills) and the new outline SVG from Inkscape ---
  useEffect(() => {
    let cancelled = false;

    const loadSvgs = async () => {
      try {
        // 1) original fills - you already used this approach; adjust path to your asset
        const fillsAsset = Asset.fromModule(require('../../../assets/world-map.svg'));
        await fillsAsset.downloadAsync();
        const fillsResponse = await fetch(fillsAsset.uri);
        if (!fillsResponse.ok) throw new Error('Failed to fetch fills svg');
        const fillsText = await fillsResponse.text();

        // parse fills: extract <path ... d="..." id="..."> occurrences
        const fillPaths: any[] = [];
        const pathRegex = /<path[^>]*d="([^"]+)"[^>]*id="([^"]+)"[^>]*>/g;
        let m;
        // First prefer regex that finds id and d; fallback to d only if no id
        while ((m = pathRegex.exec(fillsText)) !== null) {
          const d = m[1];
          const id = m[2];
          const skPath = Skia.Path.MakeFromSVGString(d) || null;
          const bbox = getPathBoundingBox(d);
          fillPaths.push({ id, d, path: skPath, bbox });
        }
        // If none found with id-first regex, try looser match for paths without ids
        if (fillPaths.length === 0) {
          const looseRegex = /<path[^>]*d="([^"]+)"[^>]*>/g;
          while ((m = looseRegex.exec(fillsText)) !== null) {
            const d = m[1];
            const skPath = Skia.Path.MakeFromSVGString(d) || null;
            const id = `p_${fillPaths.length}`;
            const bbox = getPathBoundingBox(d);
            fillPaths.push({ id, d, path: skPath, bbox });
          }
        }
        countryFillPathsRef.current = fillPaths;

        // 2) outline SVG produced by Inkscape
        //      - ideally this file contains either one merged <path id="outlines"> (best)
        //      - or multiple per-country <path id="COUNTRY_ID"> entries (useful for per-country highlight)
        const outlineAsset = Asset.fromModule(require('../../../assets/world-mapOutline.svg'));
        await outlineAsset.downloadAsync();
        const outlineResp = await fetch(outlineAsset.uri);
        if (!outlineResp.ok) throw new Error('Failed to fetch outline svg');
        const outlineText = await outlineResp.text();

        // Try to find a merged outline path first (common workflow: export a single combined path)
        const mergedRegex = /<path[^>]*id="([^"]*outline[^"]*)"[^>]*d="([^"]+)"[^>]*>/i;
        const mergedMatch = outlineText.match(mergedRegex);
        if (mergedMatch) {
          // merged path found
          const mergedD = mergedMatch[2];
          outlineMergedPathRef.current = Skia.Path.MakeFromSVGString(mergedD);
        } else {
          // fallback: collect any <path ... d="..." id="..."> entries and build a merged Path
          const outlinePaths: { id: string; d: string; path: any }[] = [];
          const outlinePathRegex = /<path[^>]*d="([^"]+)"[^>]*(?:id="([^"]+)")?[^>]*>/g;
          while ((m = outlinePathRegex.exec(outlineText)) !== null) {
            const d = m[1];
            const id = m[2] || `outline_${outlinePaths.length}`;
            const skPath = Skia.Path.MakeFromSVGString(d) || null;
            outlinePaths.push({ id, d, path: skPath });
            if (skPath) {
              perCountryOutlineMapRef.current[id] = skPath;
            }
          }
          // if we gathered many small outlines, try to merge them into one big path string
          if (outlinePaths.length > 0 && !outlineMergedPathRef.current) {
            // quick merge: concatenate path data strings with spaces (works if they are separate subpaths)
            const mergedD = outlinePaths.map(p => p.d).join(' ');
            outlineMergedPathRef.current = Skia.Path.MakeFromSVGString(mergedD);
          }
        }

        if (!cancelled) {
          setLoaded(true);
          console.log('Loaded fills:', countryFillPathsRef.current.length, 'outline merged?', !!outlineMergedPathRef.current);
        }
      } catch (err) {
        console.error('Failed loading SVGS:', err);
      }
    };

    loadSvgs();

    return () => { cancelled = true; };
  }, []);

  // helper: basic visibility culling (optional but useful)
  const isBoxVisible = (bbox: any, scaleVal: number, tx: number, ty: number) => {
    if (!bbox) return true;
    const left = bbox.minX * initialScale * scaleVal + tx;
    const right = bbox.maxX * initialScale * scaleVal + tx;
    const top = bbox.minY * initialScale * scaleVal + ty;
    const bottom = bbox.maxY * initialScale * scaleVal + ty;
    return !(right < 0 || left > screenWidth || bottom < 0 || top > screenHeight);
  };

  // Example simple pan gesture — keep your existing gestures if preferred,
  // IMPORTANT: don't call runOnJS every frame in production (throttle / use Skia native values)
  const pan = Gesture.Pan()
    .onStart(() => {
      baseTranslateX.value = skiaTx.value;
      baseTranslateY.value = skiaTy.value;
    })
    .onUpdate((e) => {
      const newX = baseTranslateX.value + e.translationX;
      const newY = baseTranslateY.value + e.translationY;
      skiaTx.value = newX;
      skiaTy.value = newY;
      // optionally sync to JS infrequently if you need it
    })
    .onEnd(() => {
      runOnJS(setTranslate)(skiaTx.value, skiaTy.value);
    });

  // Render
  // NOTE: using Skia Path objects stored in refs (cached) — no recreation on each render
  return (
    <GestureDetector gesture={pan}>
      <Canvas style={{ flex: 1 }}>
        <Group
          // IMPORTANT: these transforms are plain numbers; if you use shared values you can update Skia via useValue/useComputedValue for true native updates
          transform={[
            { translateX: skiaTx.value },
            { translateY: skiaTy.value },
            { scale: skiaScale.value },
          ]}
        >
          {/* ocean background */}
          <Path path={`M0,0 L${initialSvgW},0 L${initialSvgW},${initialSvgH} L0,${initialSvgH} Z`} color="rgb(109,204,236)" style="fill" />

          {/* country fills (still per-country; still filter by visibility to reduce draws) */}
          {loaded && countryFillPathsRef.current.map((c) => {
            if (!c.path) return null;
            // c.bbox may be undefined for some; guard
            if (!isBoxVisible(c.bbox, skiaScale.value, skiaTx.value, skiaTy.value)) return null;
            return (
              <Path key={`fill-${c.id}`} path={c.path} color="#FFFFE0" style="fill" />
            );
          })}

          {/* merged outlines — draw as a single filled path (cheap) */}
          {outlineMergedPathRef.current && (
            <Path key="merged-outlines" path={outlineMergedPathRef.current} color="#000000" style="fill" />
          )}

          {/* highlight selected country: if you exported per-country outline paths with matching ids */}
          {selectedCountryId && perCountryOutlineMapRef.current[selectedCountryId] && (
            <Path key={`sel-${selectedCountryId}`} path={perCountryOutlineMapRef.current[selectedCountryId]} color="#ff6600" style="fill" />
          )}
        </Group>
      </Canvas>
    </GestureDetector>
  );
};
