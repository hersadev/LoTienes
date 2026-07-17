import { Platform } from 'react-native';

import type { Item, Loan, User } from './types';

// En web, simulador iOS y emulador Android esto funciona tal cual.
// En un móvil físico, sustituye localhost por la IP local de tu ordenador,
// p. ej. 'http://192.168.1.30:3001'.
export const API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

// Usuario "logueado" provisional hasta que haya auth de verdad.
// El seed crea: 1 = Juanjo, 2 = Ana, 3 = Luis. Cámbialo para probar el otro lado.
export const CURRENT_USER_ID = 1;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': String(CURRENT_USER_ID),
      ...options.headers,
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
  return body as T;
}

export const api = {
  users: () => request<User[]>('/api/users'),

  items: () => request<Item[]>('/api/items'),
  createItem: (name: string, description = '') =>
    request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  loans: () => request<Loan[]>('/api/loans'),
  requestLoan: (item_id: number, message = '', due_date: string | null = null) =>
    request<Loan>('/api/loans', {
      method: 'POST',
      body: JSON.stringify({ item_id, message, due_date }),
    }),
  loanAction: (id: number, action: 'accept' | 'reject' | 'return') =>
    request<Loan>(`/api/loans/${id}/${action}`, { method: 'POST' }),
};
