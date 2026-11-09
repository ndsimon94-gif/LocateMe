import { unavailableNotifier } from './notifications';

/** Local notifications aren't supported in the web preview. */
export const expoNotifier = unavailableNotifier;
