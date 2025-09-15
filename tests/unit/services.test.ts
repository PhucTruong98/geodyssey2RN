import { describe, it, expect } from '@jest/globals';
import { mapCountryToListItem } from '@/services/countries';
import { Country } from '@/types';

describe('Countries Service', () => {
  describe('mapCountryToListItem', () => {
    it('should correctly map a Country to CountryListItem', () => {
      const mockCountry: Country = {
        cca3: 'USA',
        name: {
          common: 'United States',
          official: 'United States of America',
        },
        region: 'Americas',
        population: 331900000,
        languages: {
          eng: 'English',
        },
        flags: {
          png: 'https://example.com/flag.png',
          svg: 'https://example.com/flag.svg',
        },
      };

      const result = mapCountryToListItem(mockCountry);

      expect(result).toEqual({
        code: 'USA',
        name: 'United States',
        officialName: 'United States of America',
        region: 'Americas',
        population: 331900000,
        flagUrl: 'https://example.com/flag.png',
      });
    });

    it('should handle countries without languages', () => {
      const mockCountry: Country = {
        cca3: 'TST',
        name: {
          common: 'Test Country',
          official: 'Test Country Official',
        },
        region: 'Test Region',
        population: 1000000,
        flags: {
          png: 'https://example.com/test-flag.png',
          svg: 'https://example.com/test-flag.svg',
        },
      };

      const result = mapCountryToListItem(mockCountry);

      expect(result.code).toBe('TST');
      expect(result.name).toBe('Test Country');
    });
  });
});