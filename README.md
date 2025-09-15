# Geodyssey

A React Native + Expo app for exploring the world through an interactive map and discovering detailed information about countries and regions.

## 🌟 Features

- **Interactive World Map**: SVG-based world map with smooth pinch-zoom and pan gestures
- **Country Search**: Filter and search through all countries
- **Country Details**: Comprehensive information including population, languages, and region
- **Dark/Light Theme**: System-aware theme switching with manual override
- **Offline Support**: Smart caching with TanStack Query for offline data access
- **Cross-Platform**: Runs on iOS, Android, and Web

## 🛠 Tech Stack

- **Framework**: Expo SDK 54 with TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand for UI state, TanStack Query for server state
- **Maps**: react-native-svg with react-native-gesture-handler + Reanimated
- **UI**: Custom components with theme system
- **Testing**: Vitest + @testing-library/react-native
- **Code Quality**: ESLint + Prettier + TypeScript strict mode

## 📁 Project Structure

```
src/
├── app/                 # Expo Router routes (tabs + stacks)
│   ├── (tabs)/          # Tab navigation
│   │   ├── index.tsx    # Explore (WorldMap)
│   │   ├── search.tsx   # Country search
│   │   └── profile.tsx  # Settings
│   ├── country/[code].tsx # Country details
│   └── _layout.tsx      # Root layout
├── components/          # Reusable UI components
├── features/            # Feature-specific components
│   ├── worldmap/        # WorldMap with gestures
│   └── country/         # Country-related components
├── hooks/               # Custom hooks
├── services/            # API clients and data adapters
├── store/               # Zustand stores
└── types/               # TypeScript definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```

3. **Run on platforms**
   ```bash
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   npm run web     # Web browser
   ```

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run ios` | Run on iOS Simulator |
| `npm run android` | Run on Android Emulator |
| `npm run web` | Run in web browser |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript compiler |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run clean` | Clear Expo cache |

## 🏗 Architecture Decisions

### State Management
- **Zustand**: Lightweight state management for UI preferences and map state
- **TanStack Query**: Server state management with intelligent caching and offline support

### Navigation
- **Expo Router**: File-based routing system for type-safe navigation
- Tab navigation for main features (Explore, Search, Profile)
- Stack navigation for detail screens

### Styling & Theming
- Custom theme system supporting light/dark modes
- System-aware theme detection with manual override
- Consistent design tokens across components

### Data Layer
- REST Countries API integration with proper error handling
- Data transformation layer for consistent internal types
- Optimistic caching strategy for offline-first experience

### Testing Strategy
- Unit tests for utility functions and data adapters
- Component tests for UI components
- Mock strategy for external dependencies

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```bash
# API Configuration
API_BASE_URL=https://restcountries.com/v3.1
```

### Absolute Imports
The project uses absolute imports with the `@/*` prefix:
```typescript
import { Button } from '@/components';
import { useCountries } from '@/hooks';
```

## 🧪 Testing

Run the test suite:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Test coverage includes:
- Data adapter functions
- Custom hooks
- UI component behavior
- Navigation flows

## 📱 Platform Support

- **iOS**: Full support with native gesture handling
- **Android**: Full support with native gesture handling
- **Web**: Complete feature parity with responsive design

## 🔮 Next: Skia Integration

This baseline implementation uses react-native-svg for the world map. The next phase will integrate react-native-skia for:

- Enhanced graphics performance
- Complex map projections
- Advanced animations and effects
- Custom drawing capabilities

The current SVG implementation provides a solid foundation that can be incrementally upgraded to Skia while maintaining feature parity.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.