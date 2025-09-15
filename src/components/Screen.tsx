import React from 'react';
import { View, StyleSheet, ViewProps, SafeAreaView } from 'react-native';
import { useTheme } from '@/hooks';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  safe?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  safe = true,
  ...props
}) => {
  const theme = useTheme();

  const screenStyle = [
    styles.screen,
    {
      backgroundColor: theme.colors.background,
    },
    style,
  ];

  const Container = safe ? SafeAreaView : View;

  return (
    <Container style={screenStyle} {...props}>
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});