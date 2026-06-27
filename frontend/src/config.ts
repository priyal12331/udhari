import Constants from 'expo-constants';

/** Resolve backend base URL. On a physical device via Expo Go QR, localhost won't work — use Metro's LAN host. */
export function getBackendUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri;

  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000`;
    }
  }

  return 'http://localhost:8000';
}
