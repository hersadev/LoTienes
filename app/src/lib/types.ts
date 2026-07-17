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
