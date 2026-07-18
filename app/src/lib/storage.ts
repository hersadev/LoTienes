import { Platform } from 'react-native';

// Persistencia mínima para la sesión: localStorage en web y memoria en nativo
// (ahí la sesión se pierde al cerrar la app; cuando moleste, sustituir por
// @react-native-async-storage/async-storage).
const memory = new Map<string, string>();
const hasLocalStorage = Platform.OS === 'web' && typeof localStorage !== 'undefined';

export const storage = {
  get(key: string): string | null {
    if (hasLocalStorage) return localStorage.getItem(key);
    return memory.get(key) ?? null;
  },
  set(key: string, value: string) {
    if (hasLocalStorage) localStorage.setItem(key, value);
    else memory.set(key, value);
  },
  remove(key: string) {
    if (hasLocalStorage) localStorage.removeItem(key);
    else memory.delete(key);
  },
};
