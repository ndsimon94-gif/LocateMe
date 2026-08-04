// Expo Router requires a platform-suffix-free fallback file alongside any
// .native.tsx/.web.tsx split, even though index.native.tsx and index.web.tsx
// cover every real target (iOS, Android, web) between them. Re-exporting the
// web variant here — it has no native dependencies — keeps this file from
// ever actually needing to render anything on its own.
export { default } from './index.web';
