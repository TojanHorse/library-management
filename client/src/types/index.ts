export interface User {
  _id?: string; // MongoDB ObjectId
  id?: string;  // For backwards compatibility
  name: string;
  email: string;
  phone: string;
  address: string;
  seatNumber: number;
  slot: 'Morning' | 'Afternoon' | 'Evening' | '12Hour' | '24Hour';
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

export interface TelegramBot {
  nickname: string;
  botToken: string;
  chatIds: string[];
  enabled: boolean;
  notifications: {
    newUser: boolean;
    feeDue: boolean;
    feeOverdue: boolean;
    feePaid: boolean;
  };
  settings: {
    sendSilently: boolean;
    protectContent: boolean;
    threadId: string | null;
    serverUrl: string;
  };
}

export interface Settings {
  id?: number;
  _id?: string; // MongoDB ObjectId
  slotPricing: Record<string, number>;
  slotTimings: Record<string, string>;
  emailProvider: 'gmail' | 'outlook' | 'custom';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  emailUser: string;
  emailPassword: string;
  telegramChatIds: string[];
  telegramBotToken?: string;
  telegramServerUrl?: string;
  telegramThreadId?: string;
  telegramFriendlyName?: string;
  telegramDefaultEnabled?: boolean;
  telegramCustomTemplate?: boolean;
  telegramSendSilently?: boolean;
  telegramProtectContent?: boolean;
  telegramBots?: TelegramBot[];
  welcomeEmailTemplate: string;
  dueDateEmailTemplate: string;
  paymentConfirmationEmailTemplate?: string;
  // New MongoDB fields
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  // Legacy fields for backwards compatibility
  gmail?: string;
  appPassword?: string;
  sendgridApiKey?: string;
}

export type Theme = 'light' | 'dark';
