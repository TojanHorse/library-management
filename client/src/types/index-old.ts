export interface User {
  _id?: string; // MongoDB ObjectId
  id?: string;  // For backwards compatibility
  name: string;
  email: string;
  phone: string;
  address: string;
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
  id?: number;
  slotPricing: Record<string, number>;
  slotTimings: Record<string, string>;
  emailProvider: 'gmail' | 'outlook' | 'custom';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  emailUser: string;
  emailPassword: string;
  telegramChatIds: string[];
  welcomeEmailTemplate: string;
  dueDateEmailTemplate: string;
}

export type Theme = 'light' | 'dark';