import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useMapStore } from '@/store';
import { useTheme } from '@/hooks';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const countryPaths = {
  USA: 'M50 100 L200 100 L200 150 L180 170 L100 170 L50 150 Z',
  CAN: 'M50 50 L250 50 L250 100 L50 100 Z',
  MEX: 'M80 170 L180 170 L160 200 L100 200 Z',
  BRA: 'M180 200 L250 200 L260 280 L200 300 L180 250 Z',
  ARG: 'M200 300 L220 350 L200 380 L180 350 Z',
  GBR: 'M380 120 L400 120 L400 140 L380 140 Z',
  FRA: 'M400 140 L430 140 L430 170 L400 170 Z',
  DEU: 'M430 120 L460 120 L460 150 L430 150 Z',
  ESP: 'M380 170 L430 170 L430 200 L380 200 Z',
  RUS: 'M460 50 L700 50 L700 150 L460 150 Z',
  EGY: 'M450 200 L500 200 L500 230 L450 230 Z',
  ZAF: 'M480 300 L530 300 L530 350 L480 350 Z',
  NGA: 'M420 250 L470 250 L470 280 L420 280 Z',
  CHN: 'M550 120 L650 120 L650 200 L550 200 Z',
  IND: 'M520 200 L580 200 L580 270 L520 270 Z',
  JPN: 'M680 150 L720 150 L720 180 L680 180 Z',
  AUS: 'M600 300 L700 300 L700 350 L600 350 Z',
};

const countryColors = {
  USA: '#4CAF50',
  CAN: '#81C784',
  MEX: '#66BB6A',
  BRA: '#8BC34A',
  ARG: '#9CCC65',
  GBR: '#FF9800',
  FRA: '#FFB74D',
  DEU: '#FFCC02',
  ESP: '#FFC107',
  RUS: '#FF8F00',
  EGY: '#795548',
  ZAF: '#8D6E63',
  NGA: '#A1887F',
  CHN: '#E91E63',
  IND: '#F06292',
  JPN: '#EC407A',
  AUS: '#9C27B0',
};

export const WorldMap: React.FC = () => {
  const theme = useTheme();
  const { scale, translateX, translateY, setScale, setTranslate } = useMapStore();

  const animatedScale = useSharedValue(scale);
  const animatedTranslateX = useSharedValue(translateX);
  const animatedTranslateY = useSharedValue(translateY);

  const baseScale = useSharedValue(1);

  const handleCountryPress = (countryCode: string) => {
    router.push(`/country/${countryCode}`);
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      baseScale.value = animatedScale.value;
    })
    .onUpdate(event => {
      const newScale = Math.max(0.5, Math.min(5, baseScale.value * event.scale));
      animatedScale.value = newScale;
    })
    .onEnd(() => {
      runOnJS(setScale)(animatedScale.value);
    });

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      animatedTranslateX.value = event.translationX;
      animatedTranslateY.value = event.translationY;
    })
    .onEnd(event => {
      runOnJS(setTranslate)(event.translationX, event.translationY);
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animatedTranslateX.value },
      { translateY: animatedTranslateY.value },
      { scale: animatedScale.value },
    ],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.mapContainer, animatedStyle]}>
          <Svg width={screenWidth} height={screenHeight * 0.8} viewBox="0 0 800 400">
            {Object.entries(countryPaths).map(([code, path]) => (
              <Path
                key={code}
                d={path}
                fill={countryColors[code as keyof typeof countryColors]}
                stroke={theme.colors.border}
                strokeWidth="1"
                onPress={() => runOnJS(handleCountryPress)(code)}
              />
            ))}
          </Svg>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});