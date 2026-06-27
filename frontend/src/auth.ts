import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'kut_auth_user';
const PASS_KEY = 'kut_auth_pass';

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async del(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

function toBase64(value: string): string {
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(value);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < value.length) {
    const a = value.charCodeAt(i++);
    const b = i < value.length ? value.charCodeAt(i++) : 0;
    const c = i < value.length ? value.charCodeAt(i++) : 0;
    result += chars[a >> 2];
    result += chars[((a & 3) << 4) | (b >> 4)];
    result += i - 1 < value.length ? chars[((b & 15) << 2) | (c >> 6)] : '=';
    result += i - 2 < value.length ? chars[c & 63] : '=';
  }
  return result;
}

export const Auth = {
  async save(username: string, password: string): Promise<void> {
    await storage.set(USER_KEY, username.trim().toLowerCase());
    await storage.set(PASS_KEY, password);
  },

  async clear(): Promise<void> {
    await storage.del(USER_KEY);
    await storage.del(PASS_KEY);
  },

  async getCredentials(): Promise<{ username: string; password: string } | null> {
    const username = await storage.get(USER_KEY);
    const password = await storage.get(PASS_KEY);
    if (!username || !password) return null;
    return { username, password };
  },

  async isLoggedIn(): Promise<boolean> {
    const creds = await this.getCredentials();
    return creds !== null;
  },

  async getAuthHeader(): Promise<Record<string, string>> {
    const creds = await this.getCredentials();
    if (!creds) return {};
    const token = toBase64(`${creds.username}:${creds.password}`);
    return { Authorization: `Basic ${token}` };
  },
};
