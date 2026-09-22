// TypeScript's module resolution doesn't know about Metro's .native/.web
// suffix convention the way the bundler and Expo Router's route scanner do,
// so a plain import needs this bare file to resolve against. Re-exporting
// the web variant — it has no native dependencies — keeps this file from
// ever actually needing to render anything on its own.
export { HistoryMap } from './history-map.web';
