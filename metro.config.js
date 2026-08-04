const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-maps has no web build and reaches into React Native internals
// that don't exist there. The map screen already has a index.web.tsx
// fallback that never imports it, but Metro's route-context scanning still
// evaluates every platform variant of a route file, so react-native-maps'
// source gets parsed regardless. Stubbing it to an empty module for the web
// platform stops that at the resolver instead.
const { resolveRequest } = config.resolver;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName.startsWith('react-native-maps')) {
    return { type: 'empty' };
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
