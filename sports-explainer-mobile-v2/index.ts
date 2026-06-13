import { registerRootComponent } from 'expo';
import React from 'react';

import App from './App';
import { ThemeProvider } from './lib/theme';

// Wrap the app in the theme provider so every screen (onboarding, settings,
// main) can read the active theme. The launch cinematic ignores it (stays dark).
function Root() {
  return React.createElement(ThemeProvider, null, React.createElement(App));
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
