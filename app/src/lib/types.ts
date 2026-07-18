export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Item {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  owner_name?: string;
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
  due_date: string | null;
  requested_at: string;
  accepted_at: string | null;
  returned_at: string | null;
  item_name: string;
  owner_name: string;
  borrower_name: string;
}
