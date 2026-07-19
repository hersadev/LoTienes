export interface User {
  id: number;
  name: string;
  email: string;
}

// Categorías de la ficha, para filtrar en la lista de objetos
export const Categories = [
  'Herramientas',
  'Libros',
  'Electrónica',
  'Cocina',
  'Deporte',
  'Juegos',
  'Otros',
] as const;
export type Category = (typeof Categories)[number];

export interface Item {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  photo: string;
  category: string;
  owner_name?: string;
  // Préstamo activo o pendiente sobre el objeto, si lo hay
  loan_status?: 'pendiente' | 'aceptado' | null;
  loan_borrower_name?: string | null;
}

export interface Friend extends User {
  friends_since: string;
}

export type InviteStatus = 'pendiente' | 'aceptada';

export interface Invite {
  id: number;
  token: string;
  inviter_id: number;
  status: InviteStatus;
  created_at: string;
  accepted_by: number | null;
  accepted_at: string | null;
  accepted_by_name?: string | null;
  url: string;
}

// Lo que ve quien abre un enlace de invitación, sin necesidad de cuenta
export interface InviteInfo {
  status: InviteStatus;
  inviter_id: number;
  inviter_name: string;
}

export interface AcceptInviteResult {
  user: User;
  inviter: { id: number; name: string };
}

export type LoanStatus = 'pendiente' | 'aceptado' | 'rechazado' | 'devuelto';

export interface Loan {
  id: number;
  item_id: number;
  owner_id: number;
  borrower_id: number;
  status: LoanStatus;
  message: string;
  start_date: string | null;
  due_date: string | null;
  requested_at: string;
  accepted_at: string | null;
  returned_at: string | null;
  item_name: string;
  item_photo: string;
  item_category: string;
  owner_name: string;
  borrower_name: string;
}
