import { Redirect } from 'expo-router';

/**
 * Return address for the Google connection flow. Normally the in-app browser
 * catches it; if the OS opens it as a link instead, go back to settings, which
 * refreshes the connection status.
 */
export default function GoogleConnected() {
  return <Redirect href="/settings" />;
}
