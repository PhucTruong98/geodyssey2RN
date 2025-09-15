import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '@/hooks';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
  const theme = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
    },
    style,
  ];

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});