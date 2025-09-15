import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import 'expo-router/entry';

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);