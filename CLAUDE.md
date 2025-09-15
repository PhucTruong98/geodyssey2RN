

## Tech
- Expo (TypeScript) + Expo Router; React Navigation under the hood.
- State: Zustand for UI/map UI state; Data: TanStack Query for REST Countries.
- Maps (phase 1): react-native-svg + gesture-handler + Reanimated (pinch/zoom/pan).
- ❗ Skia later only, behind Platform guards; keep Web working first.

## Conventions
- Absolute imports: `@/*`. ESLint + Prettier; TypeScript strict.
- Small diffs; ask before adding deps or changing project structure.
- Maintain iOS/Android/Web parity; no native-only changes unless requested.