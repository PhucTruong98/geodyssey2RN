import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Screen, ListItem } from '@/components';
import { useCountries, useTheme } from '@/hooks';
import { CountryListItem } from '@/types';

export default function SearchScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: countries, isLoading, error } = useCountries();

  const filteredCountries = useMemo(() => {
    if (!countries) return [];
    if (!searchQuery.trim()) return countries;

    return countries.filter((country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.region.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [countries, searchQuery]);

  const handleCountryPress = (country: CountryListItem) => {
    router.push(`/country/${country.code}`);
  };

  const renderCountryItem = ({ item }: { item: CountryListItem }) => (
    <ListItem
      title={item.name}
      subtitle={`${item.region} • ${item.population.toLocaleString()}`}
      imageUrl={item.flagUrl}
      onPress={() => handleCountryPress(item)}
    />
  );

  const searchInputStyle = [
    styles.searchInput,
    {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      color: theme.colors.text,
    },
  ];

  const placeholderTextColor = theme.colors.text + '80';

  if (isLoading) {
    return (
      <Screen style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading countries...
        </Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.colors.notification }]}>
          Failed to load countries. Please check your internet connection.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <TextInput
          style={searchInputStyle}
          placeholder="Search countries or regions..."
          placeholderTextColor={placeholderTextColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FlatList
          data={filteredCountries}
          renderItem={renderCountryItem}
          keyExtractor={(item) => item.code}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchInput: {
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 16,
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
});