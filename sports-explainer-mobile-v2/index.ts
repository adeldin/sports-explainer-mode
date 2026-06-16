import 'react-native-gesture-handler'; // must be first — required by gesture-handler
import { registerRootComponent } from 'expo';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import App from './App';
import { ThemeProvider } from './lib/theme';

// GestureHandlerRootView must be at the very root for drag/long-press gestures
// (the sortable sport tabs) to register. ThemeProvider wraps the app so every
// screen can read the active theme; the launch cinematic ignores it (stays dark).
function Root() {
  return React.createElement(
    GestureHandlerRootView,
    { style: { flex: 1 } },
    React.createElement(ThemeProvider, null, React.createElement(App)),
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
