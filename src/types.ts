export type QuoteStatus = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';

export interface QuoteItem {
  id: string;
  description: string;
}

export interface ClientInfo {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  zipCode: string;
}

export interface Quote {
  id: string;
  number: string;
  date: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  status: QuoteStatus;
  client: ClientInfo;
  items: QuoteItem[];
  totalAmount: number;
  generalConditions: string;
  executionTime: string;
  paymentConditions: string;
  companySigner: string;
  clientSigner: string;
  updatedAt: string;
}

export interface CompanySettings {
  brandTitle: string;
  brandSubtitle: string;
  brandTagline: string;
  cnpj: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  email: string;
  cityForDate: string;
  mysqlHost: string;
  mysqlDatabase: string;
  mysqlUser: string;
  mysqlPassword?: string;
  mysqlApiUrl: string;
}

export interface AuthSettings {
  adminUsername: string;
  adminPassword: string; // Plain or hashed in storage
  adminName: string;
  rememberMe: boolean;
}

export interface AuthSession {
  isAuthenticated: boolean;
  username: string;
  name: string;
  loginTime: string;
}

