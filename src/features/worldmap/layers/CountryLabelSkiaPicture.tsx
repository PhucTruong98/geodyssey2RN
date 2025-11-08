import { BackdropFilter, Blur, Canvas, Group, Image, PaintStyle, Rect, Skia, SkImage } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useDerivedValue, useSharedValue, withDecay } from 'react-native-reanimated';
import { useMapContext } from '../WorldMapMainComponent';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Rasterization scale for high-quality rendering
// 5x provides crisp detail up to 5x zoom with acceptable quality to 10x max zoom
const RASTER_SCALE = 5;

interface CountrySkiaLayerComponentProps {
  countryCode: string | null;
}

// Map of country codes to their SVG require paths
// Metro bundler requires static require() calls, so we need to map them all
const COUNTRY_SVG_MAP: Record<string, any> = {
  AD: require('../../../assets/svg/countries/AD/AD.svg'),
  AE: require('../../../assets/svg/countries/AE/AE.svg'),
  AF: require('../../../assets/svg/countries/AF/AF.svg'),
  AG: require('../../../assets/svg/countries/AG/AG.svg'),
  AI: require('../../../assets/svg/countries/AI/AI.svg'),
  AL: require('../../../assets/svg/countries/AL/AL.svg'),
  AM: require('../../../assets/svg/countries/AM/AM.svg'),
  AO: require('../../../assets/svg/countries/AO/AO.svg'),
  AQ: require('../../../assets/svg/countries/AQ/AQ.svg'),
  AR: require('../../../assets/svg/countries/AR/AR.svg'),
  AS: require('../../../assets/svg/countries/AS/AS.svg'),
  AT: require('../../../assets/svg/countries/AT/AT.svg'),
  AU: require('../../../assets/svg/countries/AU/AU.svg'),
  AW: require('../../../assets/svg/countries/AW/AW.svg'),
  AX: require('../../../assets/svg/countries/AX/AX.svg'),
  AZ: require('../../../assets/svg/countries/AZ/AZ.svg'),
  BA: require('../../../assets/svg/countries/BA/BA.svg'),
  BB: require('../../../assets/svg/countries/BB/BB.svg'),
  BD: require('../../../assets/svg/countries/BD/BD.svg'),
  BE: require('../../../assets/svg/countries/BE/BE.svg'),
  BF: require('../../../assets/svg/countries/BF/BF.svg'),
  BG: require('../../../assets/svg/countries/BG/BG.svg'),
  BH: require('../../../assets/svg/countries/BH/BH.svg'),
  BI: require('../../../assets/svg/countries/BI/BI.svg'),
  BJ: require('../../../assets/svg/countries/BJ/BJ.svg'),
  BL: require('../../../assets/svg/countries/BL/BL.svg'),
  BM: require('../../../assets/svg/countries/BM/BM.svg'),
  BN: require('../../../assets/svg/countries/BN/BN.svg'),
  BO: require('../../../assets/svg/countries/BO/BO.svg'),
  BR: require('../../../assets/svg/countries/BR/BR.svg'),
  BS: require('../../../assets/svg/countries/BS/BS.svg'),
  BT: require('../../../assets/svg/countries/BT/BT.svg'),
  BW: require('../../../assets/svg/countries/BW/BW.svg'),
  BY: require('../../../assets/svg/countries/BY/BY.svg'),
  BZ: require('../../../assets/svg/countries/BZ/BZ.svg'),
  CA: require('../../../assets/svg/countries/CA/CA.svg'),
  CD: require('../../../assets/svg/countries/CD/CD.svg'),
  CF: require('../../../assets/svg/countries/CF/CF.svg'),
  CG: require('../../../assets/svg/countries/CG/CG.svg'),
  CH: require('../../../assets/svg/countries/CH/CH.svg'),
  CI: require('../../../assets/svg/countries/CI/CI.svg'),
  CK: require('../../../assets/svg/countries/CK/CK.svg'),
  CL: require('../../../assets/svg/countries/CL/CL.svg'),
  CM: require('../../../assets/svg/countries/CM/CM.svg'),
  CN: require('../../../assets/svg/countries/CN/CN.svg'),
  CO: require('../../../assets/svg/countries/CO/CO.svg'),
  CR: require('../../../assets/svg/countries/CR/CR.svg'),
  CU: require('../../../assets/svg/countries/CU/CU.svg'),
  CV: require('../../../assets/svg/countries/CV/CV.svg'),
  CW: require('../../../assets/svg/countries/CW/CW.svg'),
  CY: require('../../../assets/svg/countries/CY/CY.svg'),
  CZ: require('../../../assets/svg/countries/CZ/CZ.svg'),
  DE: require('../../../assets/svg/countries/DE/DE.svg'),
  DJ: require('../../../assets/svg/countries/DJ/DJ.svg'),
  DK: require('../../../assets/svg/countries/DK/DK.svg'),
  DM: require('../../../assets/svg/countries/DM/DM.svg'),
  DO: require('../../../assets/svg/countries/DO/DO.svg'),
  DZ: require('../../../assets/svg/countries/DZ/DZ.svg'),
  EC: require('../../../assets/svg/countries/EC/EC.svg'),
  EE: require('../../../assets/svg/countries/EE/EE.svg'),
  EG: require('../../../assets/svg/countries/EG/EG.svg'),
  EH: require('../../../assets/svg/countries/EH/EH.svg'),
  ER: require('../../../assets/svg/countries/ER/ER.svg'),
  ES: require('../../../assets/svg/countries/ES/ES.svg'),
  ET: require('../../../assets/svg/countries/ET/ET.svg'),
  FI: require('../../../assets/svg/countries/FI/FI.svg'),
  FJ: require('../../../assets/svg/countries/FJ/FJ.svg'),
  FK: require('../../../assets/svg/countries/FK/FK.svg'),
  FM: require('../../../assets/svg/countries/FM/FM.svg'),
  FO: require('../../../assets/svg/countries/FO/FO.svg'),
  FR: require('../../../assets/svg/countries/FR/FR.svg'),
  GA: require('../../../assets/svg/countries/GA/GA.svg'),
  GB: require('../../../assets/svg/countries/GB/GB.svg'),
  GD: require('../../../assets/svg/countries/GD/GD.svg'),
  GE: require('../../../assets/svg/countries/GE/GE.svg'),
  GG: require('../../../assets/svg/countries/GG/GG.svg'),
  GH: require('../../../assets/svg/countries/GH/GH.svg'),
  GI: require('../../../assets/svg/countries/GI/GI.svg'),
  GL: require('../../../assets/svg/countries/GL/GL.svg'),
  GM: require('../../../assets/svg/countries/GM/GM.svg'),
  GN: require('../../../assets/svg/countries/GN/GN.svg'),
  GQ: require('../../../assets/svg/countries/GQ/GQ.svg'),
  GR: require('../../../assets/svg/countries/GR/GR.svg'),
  GS: require('../../../assets/svg/countries/GS/GS.svg'),
  GT: require('../../../assets/svg/countries/GT/GT.svg'),
  GU: require('../../../assets/svg/countries/GU/GU.svg'),
  GW: require('../../../assets/svg/countries/GW/GW.svg'),
  GY: require('../../../assets/svg/countries/GY/GY.svg'),
  HK: require('../../../assets/svg/countries/HK/HK.svg'),
  HM: require('../../../assets/svg/countries/HM/HM.svg'),
  HN: require('../../../assets/svg/countries/HN/HN.svg'),
  HR: require('../../../assets/svg/countries/HR/HR.svg'),
  HT: require('../../../assets/svg/countries/HT/HT.svg'),
  HU: require('../../../assets/svg/countries/HU/HU.svg'),
  ID: require('../../../assets/svg/countries/ID/ID.svg'),
  IE: require('../../../assets/svg/countries/IE/IE.svg'),
  IL: require('../../../assets/svg/countries/IL/IL.svg'),
  IM: require('../../../assets/svg/countries/IM/IM.svg'),
  IN: require('../../../assets/svg/countries/IN/IN.svg'),
  IO: require('../../../assets/svg/countries/IO/IO.svg'),
  IQ: require('../../../assets/svg/countries/IQ/IQ.svg'),
  IR: require('../../../assets/svg/countries/IR/IR.svg'),
  IS: require('../../../assets/svg/countries/IS/IS.svg'),
  IT: require('../../../assets/svg/countries/IT/IT.svg'),
  JE: require('../../../assets/svg/countries/JE/JE.svg'),
  JM: require('../../../assets/svg/countries/JM/JM.svg'),
  JO: require('../../../assets/svg/countries/JO/JO.svg'),
  JP: require('../../../assets/svg/countries/JP/JP.svg'),
  KE: require('../../../assets/svg/countries/KE/KE.svg'),
  KG: require('../../../assets/svg/countries/KG/KG.svg'),
  KH: require('../../../assets/svg/countries/KH/KH.svg'),
  KI: require('../../../assets/svg/countries/KI/KI.svg'),
  KM: require('../../../assets/svg/countries/KM/KM.svg'),
  KN: require('../../../assets/svg/countries/KN/KN.svg'),
  KP: require('../../../assets/svg/countries/KP/KP.svg'),
  KR: require('../../../assets/svg/countries/KR/KR.svg'),
  KW: require('../../../assets/svg/countries/KW/KW.svg'),
  KY: require('../../../assets/svg/countries/KY/KY.svg'),
  KZ: require('../../../assets/svg/countries/KZ/KZ.svg'),
  LA: require('../../../assets/svg/countries/LA/LA.svg'),
  LB: require('../../../assets/svg/countries/LB/LB.svg'),
  LC: require('../../../assets/svg/countries/LC/LC.svg'),
  LI: require('../../../assets/svg/countries/LI/LI.svg'),
  LK: require('../../../assets/svg/countries/LK/LK.svg'),
  LR: require('../../../assets/svg/countries/LR/LR.svg'),
  LS: require('../../../assets/svg/countries/LS/LS.svg'),
  LT: require('../../../assets/svg/countries/LT/LT.svg'),
  LU: require('../../../assets/svg/countries/LU/LU.svg'),
  LV: require('../../../assets/svg/countries/LV/LV.svg'),
  LY: require('../../../assets/svg/countries/LY/LY.svg'),
  MA: require('../../../assets/svg/countries/MA/MA.svg'),
  MC: require('../../../assets/svg/countries/MC/MC.svg'),
  MD: require('../../../assets/svg/countries/MD/MD.svg'),
  ME: require('../../../assets/svg/countries/ME/ME.svg'),
  MF: require('../../../assets/svg/countries/MF/MF.svg'),
  MG: require('../../../assets/svg/countries/MG/MG.svg'),
  MH: require('../../../assets/svg/countries/MH/MH.svg'),
  MK: require('../../../assets/svg/countries/MK/MK.svg'),
  ML: require('../../../assets/svg/countries/ML/ML.svg'),
  MM: require('../../../assets/svg/countries/MM/MM.svg'),
  MN: require('../../../assets/svg/countries/MN/MN.svg'),
  MO: require('../../../assets/svg/countries/MO/MO.svg'),
  MP: require('../../../assets/svg/countries/MP/MP.svg'),
  MR: require('../../../assets/svg/countries/MR/MR.svg'),
  MS: require('../../../assets/svg/countries/MS/MS.svg'),
  MT: require('../../../assets/svg/countries/MT/MT.svg'),
  MU: require('../../../assets/svg/countries/MU/MU.svg'),
  MV: require('../../../assets/svg/countries/MV/MV.svg'),
  MW: require('../../../assets/svg/countries/MW/MW.svg'),
  MX: require('../../../assets/svg/countries/MX/MX.svg'),
  MY: require('../../../assets/svg/countries/MY/MY.svg'),
  MZ: require('../../../assets/svg/countries/MZ/MZ.svg'),
  NA: require('../../../assets/svg/countries/NA/NA.svg'),
  NC: require('../../../assets/svg/countries/NC/NC.svg'),
  NE: require('../../../assets/svg/countries/NE/NE.svg'),
  NF: require('../../../assets/svg/countries/NF/NF.svg'),
  NG: require('../../../assets/svg/countries/NG/NG.svg'),
  NI: require('../../../assets/svg/countries/NI/NI.svg'),
  NL: require('../../../assets/svg/countries/NL/NL.svg'),
  NO: require('../../../assets/svg/countries/NO/NO.svg'),
  NP: require('../../../assets/svg/countries/NP/NP.svg'),
  NR: require('../../../assets/svg/countries/NR/NR.svg'),
  NU: require('../../../assets/svg/countries/NU/NU.svg'),
  NZ: require('../../../assets/svg/countries/NZ/NZ.svg'),
  OM: require('../../../assets/svg/countries/OM/OM.svg'),
  PA: require('../../../assets/svg/countries/PA/PA.svg'),
  PE: require('../../../assets/svg/countries/PE/PE.svg'),
  PF: require('../../../assets/svg/countries/PF/PF.svg'),
  PG: require('../../../assets/svg/countries/PG/PG.svg'),
  PH: require('../../../assets/svg/countries/PH/PH.svg'),
  PK: require('../../../assets/svg/countries/PK/PK.svg'),
  PL: require('../../../assets/svg/countries/PL/PL.svg'),
  PM: require('../../../assets/svg/countries/PM/PM.svg'),
  PN: require('../../../assets/svg/countries/PN/PN.svg'),
  PR: require('../../../assets/svg/countries/PR/PR.svg'),
  PS: require('../../../assets/svg/countries/PS/PS.svg'),
  PT: require('../../../assets/svg/countries/PT/PT.svg'),
  PW: require('../../../assets/svg/countries/PW/PW.svg'),
  PY: require('../../../assets/svg/countries/PY/PY.svg'),
  QA: require('../../../assets/svg/countries/QA/QA.svg'),
  RO: require('../../../assets/svg/countries/RO/RO.svg'),
  RS: require('../../../assets/svg/countries/RS/RS.svg'),
  RU: require('../../../assets/svg/countries/RU/RU.svg'),
  RW: require('../../../assets/svg/countries/RW/RW.svg'),
  SA: require('../../../assets/svg/countries/SA/SA.svg'),
  SB: require('../../../assets/svg/countries/SB/SB.svg'),
  SC: require('../../../assets/svg/countries/SC/SC.svg'),
  SD: require('../../../assets/svg/countries/SD/SD.svg'),
  SE: require('../../../assets/svg/countries/SE/SE.svg'),
  SG: require('../../../assets/svg/countries/SG/SG.svg'),
  SH: require('../../../assets/svg/countries/SH/SH.svg'),
  SI: require('../../../assets/svg/countries/SI/SI.svg'),
  SK: require('../../../assets/svg/countries/SK/SK.svg'),
  SL: require('../../../assets/svg/countries/SL/SL.svg'),
  SM: require('../../../assets/svg/countries/SM/SM.svg'),
  SN: require('../../../assets/svg/countries/SN/SN.svg'),
  SO: require('../../../assets/svg/countries/SO/SO.svg'),
  SR: require('../../../assets/svg/countries/SR/SR.svg'),
  SS: require('../../../assets/svg/countries/SS/SS.svg'),
  ST: require('../../../assets/svg/countries/ST/ST.svg'),
  SV: require('../../../assets/svg/countries/SV/SV.svg'),
  SX: require('../../../assets/svg/countries/SX/SX.svg'),
  SY: require('../../../assets/svg/countries/SY/SY.svg'),
  SZ: require('../../../assets/svg/countries/SZ/SZ.svg'),
  TC: require('../../../assets/svg/countries/TC/TC.svg'),
  TD: require('../../../assets/svg/countries/TD/TD.svg'),
  TF: require('../../../assets/svg/countries/TF/TF.svg'),
  TG: require('../../../assets/svg/countries/TG/TG.svg'),
  TH: require('../../../assets/svg/countries/TH/TH.svg'),
  TJ: require('../../../assets/svg/countries/TJ/TJ.svg'),
  TK: require('../../../assets/svg/countries/TK/TK.svg'),
  TL: require('../../../assets/svg/countries/TL/TL.svg'),
  TM: require('../../../assets/svg/countries/TM/TM.svg'),
  TN: require('../../../assets/svg/countries/TN/TN.svg'),
  TO: require('../../../assets/svg/countries/TO/TO.svg'),
  TR: require('../../../assets/svg/countries/TR/TR.svg'),
  TT: require('../../../assets/svg/countries/TT/TT.svg'),
  TV: require('../../../assets/svg/countries/TV/TV.svg'),
  TW: require('../../../assets/svg/countries/TW/TW.svg'),
  TZ: require('../../../assets/svg/countries/TZ/TZ.svg'),
  UA: require('../../../assets/svg/countries/UA/UA.svg'),
  UG: require('../../../assets/svg/countries/UG/UG.svg'),
  UM: require('../../../assets/svg/countries/UM/UM.svg'),
  US: require('../../../assets/svg/countries/US/US.svg'),
  UY: require('../../../assets/svg/countries/UY/UY.svg'),
  UZ: require('../../../assets/svg/countries/UZ/UZ.svg'),
  VA: require('../../../assets/svg/countries/VA/VA.svg'),
  VC: require('../../../assets/svg/countries/VC/VC.svg'),
  VE: require('../../../assets/svg/countries/VE/VE.svg'),
  VG: require('../../../assets/svg/countries/VG/VG.svg'),
  VI: require('../../../assets/svg/countries/VI/VI.svg'),
  VN: require('../../../assets/svg/countries/VN/VN.svg'),
  VU: require('../../../assets/svg/countries/VU/VU.svg'),
  WF: require('../../../assets/svg/countries/WF/WF.svg'),
  WS: require('../../../assets/svg/countries/WS/WS.svg'),
  XK: require('../../../assets/svg/countries/XK/XK.svg'),
  YE: require('../../../assets/svg/countries/YE/YE.svg'),
  ZA: require('../../../assets/svg/countries/ZA/ZA.svg'),
  ZM: require('../../../assets/svg/countries/ZM/ZM.svg'),
  ZW: require('../../../assets/svg/countries/ZW/ZW.svg'),
};

/**
 * CountrySkiaLayerComponent - Renders detailed country SVG using Skia
 * Shows detailed state/province boundaries when a country is selected
 */
/**
 * Parse SVG path elements from SVG text
 * Extracts all <path d="..." /> elements and returns their path data
 */
const parseSVGPaths = (svgText: string): string[] => {
  const pathRegex = /<path[^>]*\sd="([^"]*)"/g;
  const paths: string[] = [];
  let match;

  while ((match = pathRegex.exec(svgText)) !== null) {
    if (match[1]) {
      paths.push(match[1]);
    }
  }

  console.log(`Parsed ${paths.length} paths from SVG`);
  return paths;
};

/**
 * Create a Skia Image from SVG path data
 * Uses PictureRecorder to capture drawing operations at high resolution,
 * then converts to GPU-cached image for crisp rendering when zoomed
 */
const createImageFromPaths = (
  pathDataArray: string[],
  width: number,
  height: number
): SkImage | null => {
  if (pathDataArray.length === 0) {
    console.warn('No paths to render');
    return null;
  }

  // Scale dimensions for high-quality rasterization
  const rasterWidth = width * RASTER_SCALE;
  const rasterHeight = height * RASTER_SCALE;

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording({
    x: 0,
    y: 0,
    width: rasterWidth,
    height: rasterHeight
  });

  // Scale the canvas to draw at higher resolution
  canvas.scale(RASTER_SCALE, RASTER_SCALE);

  // Create paint for fill (yellow)
  const fillPaint = Skia.Paint();
  fillPaint.setColor(Skia.Color('#FFEB3B')); // Yellow
  fillPaint.setStyle(PaintStyle.Fill);
  fillPaint.setAntiAlias(true);

  // Create paint for stroke (black)
  // Scale stroke width proportionally to maintain visual appearance
  const strokePaint = Skia.Paint();
  strokePaint.setColor(Skia.Color('#000000')); // Black
  strokePaint.setStyle(PaintStyle.Stroke);
  strokePaint.setStrokeWidth(0.5); // Will be rendered at 2.5 due to canvas scale
  strokePaint.setAntiAlias(true);

  // Draw each path
  let successCount = 0;
  pathDataArray.forEach((pathData, index) => {
    try {
      const path = Skia.Path.MakeFromSVGString(pathData);
      if (path) {
        // Draw fill first, then stroke on top
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        successCount++;
      }
    } catch (error) {
      console.warn(`Failed to create path ${index}:`, error);
    }
  });

  console.log(`Successfully drew ${successCount}/${pathDataArray.length} paths at ${RASTER_SCALE}x resolution`);

  const picture = recorder.finishRecordingAsPicture();

  // Convert Picture to Image (GPU texture) for better performance
  // Create a surface at high resolution, draw the picture, and snapshot
  const surface = Skia.Surface.Make(Math.ceil(rasterWidth), Math.ceil(rasterHeight));

  if (!surface) {
    console.error('Failed to create surface for image conversion');
    return null;
  }

  const canvas2 = surface.getCanvas();
  canvas2.drawPicture(picture);

  // Get the high-resolution image from the surface
  const image = surface.makeImageSnapshot();

  return image;
};

export const CountrySkiaLayerComponent: React.FC<CountrySkiaLayerComponentProps> = ({
  countryCode,
}) => {
  const { setSelectedCountryCode } = useMapContext();
  const [svgData, setSvgData] = useState<string | null>(null);
  const [image, setImage] = useState<SkImage | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Local transform state - independent from WebView map
  const localX = useSharedValue(0);
  const localY = useSharedValue(0);
  const localScale = useSharedValue(1);

  // Saved state for gestures
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Store image dimensions as shared values for worklet access
  const imageWidth = useSharedValue(1000);
  const imageHeight = useSharedValue(1000);

  // Store screen dimensions as shared values for worklet access
  const screenWidthShared = useSharedValue(screenWidth);
  const screenHeightShared = useSharedValue(screenHeight);

  // Store initial scale as shared value for worklet access
  const initialScaleShared = useSharedValue(1);

  // Handle close button press - return to world map view
  const handleClose = () => {
    setSelectedCountryCode(null);
  };

  // Pan gesture - update local transform
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      'worklet';
      savedX.value = localX.value;
      savedY.value = localY.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newTranslateX = savedX.value + event.translationX;
      const newTranslateY = savedY.value + event.translationY;

      // Calculate current scaled dimensions
      const currentScale = localScale.value;
      const scaledWidth = imageWidth.value * currentScale;
      const scaledHeight = imageHeight.value * currentScale;

      // Calculate boundaries to prevent panning off screen
      // When image is larger than screen, constrain so image edges don't go past screen edges
      // When image is smaller than screen, allow centering
      let minTranslateX, maxTranslateX, minTranslateY, maxTranslateY;

      let padding = 100;


        minTranslateX =  - scaledWidth + padding; // Left edge limit
        maxTranslateX = screenWidthShared.value - padding; // Right edge limit
   

        // Image taller than screen - constrain vertically
        minTranslateY =  - scaledHeight + padding; // Top edge limit
        maxTranslateY = screenHeightShared.value - padding; // Bottom edge limit
    

      // Apply constraints
      localX.value = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
      localY.value = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));
    })
    .onEnd((event) => {
      'worklet';


      const currentScale = localScale.value;
      const scaledMapWidth = imageWidth.value * currentScale;
      const scaledMapHeight = imageHeight.value * currentScale;
      let minTranslateX, maxTranslateX, minTranslateY, maxTranslateY;

      let padding = 100;

      minTranslateX =  - scaledMapWidth + padding; // Left edge limit
      maxTranslateX = screenWidthShared.value - padding; // Right edge limit
 

      // Image taller than screen - constrain vertically
      minTranslateY =  - scaledMapHeight + padding; // Top edge limit
      maxTranslateY = screenHeightShared.value - padding; // Bottom edge limit
 
      // Apply momentum with decay animation
      localX.value = withDecay({
        velocity: event.velocityX,
        clamp: [minTranslateX, maxTranslateX],
        deceleration: 0.998,
      });

      localY.value = withDecay({
        velocity: event.velocityY,
        clamp: [minTranslateY, maxTranslateY],
        deceleration: 0.998,
      });

      savedX.value = localX.value;
      savedY.value = localY.value;


    });

  // Pinch gesture - update local scale
  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      'worklet';
      savedScale.value = localScale.value;
      savedX.value = localX.value;
      savedY.value = localY.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onUpdate((event) => {
      'worklet';

      // Calculate new scale with limits
      const minScale = 0.1;
      const maxScale = 30;
      const newScale = Math.max(minScale, Math.min(maxScale, savedScale.value * event.scale));

      // Calculate the focal point position in image coordinates using SAVED values from onStart
      const imagePointX = (focalX.value - savedX.value) / savedScale.value;
      const imagePointY = (focalY.value - savedY.value) / savedScale.value;

      // Calculate new translation to keep the focal point fixed on screen
      const newTranslateX = focalX.value - imagePointX * newScale;
      const newTranslateY = focalY.value - imagePointY * newScale;

      // Calculate actual rendered image dimensions using shared values
      const scaledWidth = imageWidth.value * newScale;
      const scaledHeight = imageHeight.value * newScale;

      // Calculate proper boundaries to keep image on screen
      const minTranslateX = screenWidthShared.value - scaledWidth;
      const maxTranslateX = 0;
      const minTranslateY = screenHeightShared.value - scaledHeight;
      const maxTranslateY = 0;

      // Constrain translation
      // const constrainedX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
      // const constrainedY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));

            // Auto-close if zoomed out below 80% of initial scale
            if (newScale < initialScaleShared.value * 0.8) {
              runOnJS(handleClose)();
            }
      // Update shared values on UI thread
      localScale.value = newScale;
      localX.value = newTranslateX;
      localY.value = newTranslateY;
    })
    .onEnd(() => {
      'worklet';
      const finalScale = localScale.value;
      const finalX = localX.value;
      const finalY = localY.value;

      // Update saved values for next gesture
      savedScale.value = finalScale;
      savedX.value = finalX;
      savedY.value = finalY;


    });

  // Combine gestures - allow simultaneous pan and pinch
  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Create derived transform for Skia (Skia needs the transform in this format)
  const transform = useDerivedValue(() => {
    return [
      { translateX: localX.value },
      { translateY: localY.value },
      { scale: localScale.value },
    ];
  }, [localX, localY, localScale]);

  // Load the country SVG when countryCode changes
  useEffect(() => {
    if (!countryCode) {
      setSvgData(null);
      setImage(null);
      setImageDimensions(null);
      return;
    }

    const loadCountrySvg = async () => {
      try {
        // Get the require path from the map
        const svgRequire = COUNTRY_SVG_MAP[countryCode];

        if (!svgRequire) {
          console.warn(`No detailed SVG available for country: ${countryCode}`);
          setSvgData(null);
          setImage(null);
          setImageDimensions(null);
          return;
        }

        // Use Asset to load the SVG
        const asset = Asset.fromModule(svgRequire);
        await asset.downloadAsync();

        const response = await fetch(asset.uri);
        const svgText = await response.text();

        setSvgData(svgText);

        // First, parse the SVG to get dimensions from viewBox or width/height
        const viewBoxMatch = svgText.match(/viewBox="([^"]*)"/);
        const widthMatch = svgText.match(/width="([^"]*)"/);
        const heightMatch = svgText.match(/height="([^"]*)"/);

        let svgWidth = 1000; // default fallback
        let svgHeight = 1000;

        if (viewBoxMatch) {
          const viewBoxValues = viewBoxMatch[1].split(/\s+/);
          if (viewBoxValues.length === 4) {
            svgWidth = parseFloat(viewBoxValues[2]);
            svgHeight = parseFloat(viewBoxValues[3]);
          }
        } else if (widthMatch && heightMatch) {
          svgWidth = parseFloat(widthMatch[1]);
          svgHeight = parseFloat(heightMatch[1]);
        }

        console.log(`SVG dimensions for ${countryCode}: ${svgWidth} x ${svgHeight}`);

        // Parse SVG paths and create GPU-cached Image
        const pathDataArray = parseSVGPaths(svgText);
        const createdImage = createImageFromPaths(pathDataArray, svgWidth, svgHeight);

        if (createdImage) {
          setImage(createdImage);
          setImageDimensions({ width: svgWidth, height: svgHeight });

          // Update shared values for worklet access
          imageWidth.value = svgWidth;
          imageHeight.value = svgHeight;

          console.log(`Created GPU-cached Image for country: ${countryCode}`);

          // Initialize transform to center and fit the image on screen
          const padding = 0; // pixels of padding
          const scaleX = (screenWidth - padding * 2) / svgWidth;
          const scaleY = (screenHeight - padding * 2) / svgHeight;
          const initialScale = Math.min(scaleX, scaleY);

          // Center the image on screen
          const scaledWidth = svgWidth * initialScale;
          const scaledHeight = svgHeight * initialScale;
          const initialX = (screenWidth - scaledWidth) / 2;
          const initialY = (screenHeight - scaledHeight) / 2;

          // Set initial transform values
          localX.value = initialX;
          localY.value = initialY;
          localScale.value = initialScale;

          // Update saved values for gestures
          savedX.value = initialX;
          savedY.value = initialY;
          savedScale.value = initialScale;

          // Store initial scale for auto-close detection
          initialScaleShared.value = initialScale;

          console.log(`Initialized country transform:`, {
            imageDims: [svgWidth, svgHeight],
            scale: initialScale,
            position: [initialX, initialY],
          });
        } else {
          console.error('Failed to create Image from SVG paths');
          setImage(null);
          setImageDimensions(null);
        }
      } catch (error) {
        console.error(`Error loading SVG for country ${countryCode}:`, error);
        setSvgData(null);
        setImage(null);
        setImageDimensions(null);
      }
    };

    loadCountrySvg();
  }, [countryCode]);

  // Don't render if no country is selected or Image hasn't loaded
  if (!countryCode || !image || !imageDimensions) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Blurred backdrop using Skia BackdropFilter */}
      <Canvas style={styles.backdropCanvas} pointerEvents="none">
        <BackdropFilter filter={<Blur blur={20} />}>
          <Rect
            x={0}
            y={0}
            width={screenWidth}
            height={screenHeight}
            color="rgba(0, 0, 0, 0.5)"
          />
        </BackdropFilter>
      </Canvas>

      {/* Country detail layer with gestures */}
      <GestureDetector gesture={combinedGesture}>
        <Animated.View style={styles.canvas} pointerEvents="auto">
          <Canvas style={styles.canvas}>
            <Group transform={transform}>
              <Image
                image={image}
                x={0}
                y={0}
                width={imageDimensions.width}
                height={imageDimensions.height}
                fit="contain"
              />
            </Group>
          </Canvas>
        </Animated.View>
      </GestureDetector>

      {/* Close button - positioned in top-right corner */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  backdropCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  canvas: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 24,
  },
});




