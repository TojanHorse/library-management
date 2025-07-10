export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  seatNumber: number;
  slot: string;
  feeStatus: 'paid' | 'due' | 'expired';
  registrationDate: string;
  idType?: string;
  idNumber?: string;
  idUpload?: string;
  logs: UserLog[];
}

export interface UserLog {
  id: string;
  action: string;
  timestamp: string;
  adminId?: string;
}

export interface Seat {
  number: number;
  status: 'available' | 'paid' | 'due' | 'expired';
  userId?: string;
}

export interface Admin {
  id: string;
  username: string;
  password: string;
}

export interface Settings {
  slotPricing: Record<string, number>;
  gmail: string;
  appPassword: string;
  telegramChatIds: string[];
}

export type Theme = 'light' | 'dark';