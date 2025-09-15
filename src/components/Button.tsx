import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '@/hooks';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  style,
  disabled,
  ...props
}) => {
  const theme = useTheme();

  const buttonStyle = [
    styles.button,
    {
      backgroundColor:
        variant === 'primary' ? theme.colors.primary : theme.colors.card,
      borderColor: theme.colors.border,
    },
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    {
      color:
        variant === 'primary' ? '#FFFFFF' : theme.colors.text,
    },
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : theme.colors.primary} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});