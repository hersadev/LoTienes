import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { setApiUserId } from './api';
import { storage } from './storage';
import type { User } from './types';

// Sesión provisional sin contraseñas: se guarda el usuario elegido/registrado
// y api.ts manda su id en cada petición. Se lee en un efecto (no en el primer
// render) para que el HTML prerenderizado de la web no dependa de localStorage.
interface Session {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const SessionContext = createContext<Session | null>(null);

const KEY = 'lotienes-user';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = storage.get(KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as User;
        setApiUserId(parsed.id);
        setUser(parsed);
      } catch {
        storage.remove(KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = (next: User) => {
    setApiUserId(next.id);
    storage.set(KEY, JSON.stringify(next));
    setUser(next);
  };

  const logout = () => {
    setApiUserId(null);
    storage.remove(KEY);
    setUser(null);
  };

  return (
    <SessionContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return session;
}
