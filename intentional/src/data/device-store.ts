import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from './key-value-store';

/**
 * On-device storage. AsyncStorage is unencrypted, which is acceptable for
 * tasks and preferences in this prototype; OAuth tokens must never be stored
 * here (see docs/ARCHITECTURE.md, "Credential handling").
 */
export const deviceStore: KeyValueStore = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
};
