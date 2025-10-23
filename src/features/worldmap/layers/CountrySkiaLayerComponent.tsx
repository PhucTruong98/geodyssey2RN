import { Canvas, Group, ImageSVG, Skia, useValue, Paint } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS, useDerivedValue } from 'react-native-reanimated';
import { useMapContext } from '../WorldMapMainComponent';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
export const CountrySkiaLayerComponent: React.FC<CountrySkiaLayerComponentProps> = ({
  countryCode,
}) => {
  const { setSelectedCountryCode } = useMapContext();
  const [svgData, setSvgData] = useState<string | null>(null);
  const [svgDom, setSvgDom] = useState<any>(null);

  // Local transform state - independent from WebView map
  const localX = useSharedValue(0);
  const localY = useSharedValue(0);
  const localScale = useSharedValue(1);

  // Saved state for gestures
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Handle close button press - return to world map view
  const handleClose = () => {
    setSelectedCountryCode(null);
  };

  // Helper functions for logging (must use runOnJS in gesture handlers)
  const logPanChange = (x: number, y: number) => {
    console.log('👆 Pan translationX/Y:', x, y);
  };

  const logPinchChange = (scale: number) => {
    console.log('🤏 Pinch scale:', scale);
  };

  // Pan gesture - update local transform
  const panGesture = Gesture.Pan()
    .onStart(() => {
      console.log('🟢 Pan gesture started');
      savedX.value = localX.value;
      savedY.value = localY.value;
    })
    .onUpdate((event) => {
      'worklet';
      runOnJS(logPanChange)(event.translationX, event.translationY);
      localX.value = savedX.value + event.translationX;
      localY.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      console.log('🔴 Pan gesture ended');
    });

  // Pinch gesture - update local scale
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      console.log('🟢 Pinch gesture started');
      savedScale.value = localScale.value;
    })
    .onUpdate((event) => {
      'worklet';
      runOnJS(logPinchChange)(event.scale);

      // Scale around the focal point
      const newScale = savedScale.value * event.scale;

      // Apply scale limits (reasonable zoom range)
      const minScale = 0.5;  // Can zoom out to 50%
      const maxScale = 10;   // Can zoom in to 10x

      if (newScale >= minScale && newScale <= maxScale) {
        localScale.value = newScale;
      }
    })
    .onEnd(() => {
      console.log('🔴 Pinch gesture ended');
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
      setSvgDom(null);
      return;
    }

    const loadCountrySvg = async () => {
      try {
        // Get the require path from the map
        const svgRequire = COUNTRY_SVG_MAP[countryCode];

        if (!svgRequire) {
          console.warn(`No detailed SVG available for country: ${countryCode}`);
          setSvgData(null);
          setSvgDom(null);
          return;
        }

        // Use Asset to load the SVG
        const asset = Asset.fromModule(svgRequire);
        await asset.downloadAsync();

        const response = await fetch(asset.uri);
        let svgText = await response.text();

        // Style the SVG: add yellow fill and black stroke to all paths
        svgText = svgText.replace(
          /<path/g,
          '<path fill="#FFEB3B" stroke="#000000" stroke-width="0.5"'
        );

        setSvgData(svgText);

        // Parse SVG with Skia
        const svg = Skia.SVG.MakeFromString(svgText);
        setSvgDom(svg);

        console.log(`Loaded detailed SVG for country: ${countryCode}`);

        // Initialize transform to center and fit the SVG on screen
        if (svg) {
          const svgWidth = svg.width();
          const svgHeight = svg.height();

          // Calculate scale to fit the SVG on screen (with some padding)
          const padding = 40; // pixels of padding
          const scaleX = (screenWidth - padding * 2) / svgWidth;
          const scaleY = (screenHeight - padding * 2) / svgHeight;
          const initialScale = Math.min(scaleX, scaleY);

          // Center the SVG on screen
          const scaledWidth = svgWidth * initialScale;
          const scaledHeight = svgHeight * initialScale;
          const initialX = (screenWidth - scaledWidth) / 2;
          const initialY = (screenHeight - scaledHeight) / 2;

          // Set initial transform values
          localX.value = initialX;
          localY.value = initialY;
          localScale.value = initialScale;

          console.log(`Initialized country transform:`, {
            svgDims: [svgWidth, svgHeight],
            scale: initialScale,
            position: [initialX, initialY],
          });
        }
      } catch (error) {
        console.error(`Error loading SVG for country ${countryCode}:`, error);
        setSvgData(null);
        setSvgDom(null);
      }
    };

    loadCountrySvg();
  }, [countryCode]);

  // Don't render if no country is selected or SVG hasn't loaded
  if (!countryCode || !svgDom) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="auto">
      <GestureDetector gesture={combinedGesture}>
        <Animated.View style={styles.canvas}>
          <Canvas style={styles.canvas}>
            <Group transform={transform}>
              <ImageSVG
                svg={svgDom}
                x={0}
                y={0}
                width={svgDom.width()}
                height={svgDom.height()}
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
