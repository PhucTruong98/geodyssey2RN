import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card } from '@/components';
import { useCountry, useTheme } from '@/hooks';

export default function CountryDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const theme = useTheme();
  const { data: country, isLoading, error } = useCountry(code);

  if (isLoading) {
    return (
      <Screen style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading country details...
        </Text>
      </Screen>
    );
  }

  if (error || !country) {
    return (
      <Screen style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.colors.notification }]}>
          Failed to load country details. Please try again.
        </Text>
      </Screen>
    );
  }

  const languages = country.languages
    ? Object.values(country.languages).join(', ')
    : 'N/A';

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={{ uri: country.flags.png }} style={styles.flag} />
          <View style={styles.headerText}>
            <Text style={[styles.countryName, { color: theme.colors.text }]}>
              {country.name.common}
            </Text>
            <Text style={[styles.officialName, { color: theme.colors.text }]}>
              {country.name.official}
            </Text>
          </View>
        </View>

        <Card style={styles.infoCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Basic Information
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
              Region:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {country.region}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
              Population:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {country.population.toLocaleString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
              Languages:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {languages}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
              Country Code:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {country.cca3}
            </Text>
          </View>
        </Card>

        <Card style={styles.mapCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Map Focus
          </Text>
          <View style={[styles.mapPlaceholder, { backgroundColor: theme.colors.border }]}>
            <Text style={[styles.mapPlaceholderText, { color: theme.colors.text }]}>
              Enhanced map view with Skia will be available in the next phase
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  flag: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  countryName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  officialName: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  infoCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    width: 120,
  },
  infoValue: {
    fontSize: 16,
    flex: 1,
  },
  mapCard: {
    marginBottom: 32,
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
});