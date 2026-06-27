import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cross-platform secure store (SecureStore unsupported on web)
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

const SESSION_KEY = 'kut_session_unlocked';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export const Session = {
  async unlock(): Promise<void> {
    await storage.set(SESSION_KEY, String(Date.now()));
  },
  async lock(): Promise<void> {
    await storage.del(SESSION_KEY);
  },
  async isUnlocked(): Promise<boolean> {
    const v = await storage.get(SESSION_KEY);
    if (!v) return false;
    const ts = parseInt(v, 10);
    if (!ts) return false;
    return Date.now() - ts < SESSION_TTL_MS;
  },
};
