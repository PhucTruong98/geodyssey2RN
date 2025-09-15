export interface Country {
  cca3: string;
  name: {
    common: string;
    official: string;
  };
  region: string;
  population: number;
  languages?: Record<string, string>;
  flags: {
    png: string;
    svg: string;
  };
}

export interface CountryListItem {
  code: string;
  name: string;
  officialName: string;
  region: string;
  population: number;
  flagUrl: string;
}

export interface MapState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
}

export interface Theme {
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
  };
}