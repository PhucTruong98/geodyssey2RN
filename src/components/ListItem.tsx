import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  Image,
  View,
} from 'react-native';
import { useTheme } from '@/hooks';

interface ListItemProps extends TouchableOpacityProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  rightElement?: React.ReactNode;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  imageUrl,
  rightElement,
  style,
  ...props
}) => {
  const theme = useTheme();

  const itemStyle = [
    styles.item,
    {
      borderBottomColor: theme.colors.border,
    },
    style,
  ];

  const titleStyle = [
    styles.title,
    {
      color: theme.colors.text,
    },
  ];

  const subtitleStyle = [
    styles.subtitle,
    {
      color: theme.colors.text,
    },
  ];

  return (
    <TouchableOpacity style={itemStyle} {...props}>
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      )}
      <View style={styles.content}>
        <Text style={titleStyle}>{title}</Text>
        {subtitle && <Text style={subtitleStyle}>{subtitle}</Text>}
      </View>
      {rightElement && <View style={styles.right}>{rightElement}</View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  image: {
    width: 40,
    height: 30,
    borderRadius: 4,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  right: {
    marginLeft: 12,
  },
});