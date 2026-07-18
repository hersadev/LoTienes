import { Platform } from 'react-native';

import type { AcceptInviteResult, Friend, Invite, InviteInfo, Item, Loan, User } from './types';

// En web usamos el mismo host desde el que se abrió la página, así los enlaces
// de invitación funcionan también desde otro dispositivo de la red local.
// En el emulador Android, 10.0.2.2 es el localhost de tu máquina. En un móvil
// físico con Expo Go, sustituye localhost por la IP local de tu ordenador,
// p. ej. 'http://192.168.1.30:3001'.
export const API_URL =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3001`
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:3001'
      : 'http://localhost:3001';

// Sesión provisional: SessionProvider fija aquí el id del usuario que entró y
// cada petición lo manda en el header x-user-id. Tokens de verdad, pendientes.
let currentUserId: number | null = null;

export function setApiUserId(id: number | null) {
  currentUserId = id;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(currentUserId != null ? { 'x-user-id': String(currentUserId) } : {}),
      ...options.headers,
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
  return body as T;
}

export const api = {
  users: () => request<User[]>('/api/users'),
  register: (name: string, email: string) =>
    request<User>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    }),

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

  friends: () => request<Friend[]>('/api/friends'),
  createInvite: () => request<Invite>('/api/invites', { method: 'POST' }),
  myInvites: () => request<Invite[]>('/api/invites'),
  inviteInfo: (token: string) => request<InviteInfo>(`/api/invites/${token}`),
  // Sin sesión hay que mandar { name, email }; con sesión basta el header
  acceptInvite: (token: string, data?: { name: string; email: string }) =>
    request<AcceptInviteResult>(`/api/invites/${token}/accept`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),
};
