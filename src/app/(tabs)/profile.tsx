import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Screen, Card } from '@/components';
import { useTheme } from '@/hooks';
import { useUIStore } from '@/store';

export default function ProfileScreen() {
  const theme = useTheme();
  const { theme: currentTheme, setTheme } = useUIStore();

  const handleThemeToggle = (value: boolean) => {
    setTheme(value ? 'dark' : 'light');
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Settings
        </Text>
      </View>

      <Card style={styles.themeCard}>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
            Dark Mode
          </Text>
          <Switch
            value={currentTheme === 'dark'}
            onValueChange={handleThemeToggle}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.card}
          />
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          About Geodyssey
        </Text>
        <Text style={[styles.cardText, { color: theme.colors.text }]}>
          Explore the world through an interactive map and discover detailed
          information about countries and regions.
        </Text>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Features
        </Text>
        <Text style={[styles.cardText, { color: theme.colors.text }]}>
          • Interactive world map with zoom and pan{'\n'}
          • Search and filter countries{'\n'}
          • Detailed country information{'\n'}
          • Dark and light theme support{'\n'}
          • Offline data caching
        </Text>
      </Card>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.text }]}>
          Version 1.0.0
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  themeCard: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '500',
  },
  infoCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
  },
});