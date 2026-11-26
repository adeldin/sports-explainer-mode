// Google Play "may crash on 16 KB devices" warning (Nov 2026): androidx.graphics:graphics-path
// 1.0.1 ships a native library built with NDK r25c. It reaches the app through Jetpack Compose
// (expo-modules-core / RevenueCat paywall UI). Version 1.1.0 is built with a current NDK and is
// 16 KB aligned, so force every build to use it. Android only; iOS is untouched.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// sportswise-16kb-libs';
const BLOCK = `
${MARK}
configurations.all {
    resolutionStrategy.force 'androidx.graphics:graphics-path:1.1.0'
}
`;

module.exports = function withAndroid16kbLibs(config) {
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes(MARK)) c.modResults.contents += BLOCK;
    return c;
  });
};
