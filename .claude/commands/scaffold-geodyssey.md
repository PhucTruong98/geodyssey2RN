/goal You are lead engineer for “Geodyssey,” a React Native + Expo app. 
Scaffold a stable, production-ready baseline WITHOUT Skia first. After this completes, I’ll run a separate prompt to add Skia.

## Tech & Structure
- Expo (TypeScript), Expo Router (file-based routing on /src/app), React Navigation.
- State: Zustand for UI prefs and map UI state (scale, translate).
- Data: TanStack Query (react-query) for REST Countries API fetches + caching.
- UI: minimal custom components; theme (light/dark) + system preference.
- Maps (phase 1): react-native-svg world map with smooth pinch-zoom + pan via react-native-gesture-handler + Reanimated.
- Testing: vitest + @testing-library/react-native.
- Lint/format: ESLint + Prettier.
- Absolute imports via tsconfig paths using prefix "@/*".

## Folder Layout
/src
  /app                 # expo-router routes (tabs + stacks)
  /components          # Button, Card, ListItem, Screen utility
  /features/worldmap   # WorldMap screen + utils (SVG version)
  /features/country    # CountryDetail, list item, adapters
  /hooks               # useCountries, useTheme, useIsOnline
  /services            # restcountries client + DTO mappers
  /store               # Zustand slices (ui, map)
  /types               # shared types
tests
  unit/
  components/

## Functionality (MVP)
1) Tabs: Explore, Search, Profile.
2) Explore → WorldMap (SVG):
   - Render placeholder assets/world.svg (continents/country paths).
   - Pinch-zoom + pan with gesture-handler + Reanimated at 60fps.
   - On country tap → navigate to CountryDetail(code).
3) Search:
   - List from https://restcountries.com/v3.1/all using TanStack Query.
   - TextInput to filter by name; tap → CountryDetail.
4) CountryDetail:
   - Show flag, official/common name, region, population, languages.
   - Placeholder “Map focus” area (will upgrade to Skia later).
5) App-wide:
   - Dark/light theme toggle stored in Zustand; system default on first run.
   - Error boundary + basic toast for query errors.
   - Offline tolerance via query cache (sensible staleTime).

## Dev Experience
- npm scripts: start, ios, android, web, lint, format, typecheck, test, test:watch, clean.
- ESLint + Prettier configs; fixable rules.
- Example .env.example with notes; make sure .env is gitignored.
- Absolute imports: configure tsconfig and Jest/Vitest aliases.
- Reanimated + gesture-handler properly configured; add Babel plugin for Reanimated.

## Deliverables
- Implement minimal screens and navigation.
- Provide assets/world.svg placeholder; wire hit-testing for taps on countries.
- Provide a simple projection/util so label positions don’t drift when zoomed.
- Tests: 
  - unit test for data adapter (country DTO mapping),
  - component test for the Search list,
  - util test for a hit-test or projection function.
- Add README with decisions, commands, and “Next: Skia integration” section.

## Constraints
- Keep dependency count minimal; explain each in README.
- Must run on iOS Simulator and Android Emulator; retain Web compatibility.
- No Skia in this phase.

## After applying diffs
1) Run: npm i
2) Run: npm run typecheck && npm run lint && npm test
3) Run: npm run start (and try i / a)
4) Paste back the command outputs and any issues.
