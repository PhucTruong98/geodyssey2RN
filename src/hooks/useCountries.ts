import { useQuery } from '@tanstack/react-query';
import { countriesApi, mapCountryToListItem } from '@/services/countries';

export const useCountries = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const countries = await countriesApi.getAll();
      return countries.map(mapCountryToListItem);
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useCountry = (code: string) => {
  return useQuery({
    queryKey: ['country', code],
    queryFn: () => countriesApi.getByCode(code),
    enabled: !!code,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};