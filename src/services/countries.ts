import { Country, CountryListItem } from '@/types';

const BASE_URL = 'https://restcountries.com/v3.1';

export const countriesApi = {
  async getAll(): Promise<Country[]> {
    const response = await fetch(`${BASE_URL}/all`);
    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }
    return response.json();
  },

  async getByCode(code: string): Promise<Country> {
    const response = await fetch(`${BASE_URL}/alpha/${code}`);
    if (!response.ok) {
      throw new Error('Failed to fetch country');
    }
    const [country] = await response.json();
    return country;
  },
};

export const mapCountryToListItem = (country: Country): CountryListItem => ({
  code: country.cca3,
  name: country.name.common,
  officialName: country.name.official,
  region: country.region,
  population: country.population,
  flagUrl: country.flags.png,
});