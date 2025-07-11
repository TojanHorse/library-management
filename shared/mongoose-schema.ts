import mongoose from 'mongoose';

// User Log Schema
const userLogSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Changed to String for flexibility
  action: { type: String, required: true },
  adminId: { type: String, default: null }, // Changed to String for flexibility
  timestamp: { type: Date, default: Date.now }
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  seatNumber: { type: Number, required: true },
  slot: { type: String, required: true },
  feeStatus: { type: String, enum: ['paid', 'due', 'expired'], default: 'due' },
  registrationDate: { type: Date, default: Date.now },
  idType: { type: String, default: null },
  idNumber: { type: String, default: null },
  idUpload: { type: String, default: null } // Cloudinary URL
}, {
  timestamps: true
});

// Seat Schema
const seatSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  status: { type: String, enum: ['available', 'paid', 'due', 'expired'], default: 'available' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Will be hashed with bcrypt
  email: { type: String, required: false, unique: true, sparse: true, default: null },
  role: { type: String, enum: ['admin', 'super-admin'], default: 'admin' }
}, {
  timestamps: true
});

// Settings Schema
const settingsSchema = new mongoose.Schema({
  slotPricing: {
    Morning: { type: Number, default: 1000 },
    Afternoon: { type: Number, default: 1200 },
    Evening: { type: Number, default: 1500 },
    '12Hour': { type: Number, default: 1800 },
    '24Hour': { type: Number, default: 2500 }
  },
  slotTimings: {
    Morning: { type: String, default: '6:00 AM - 12:00 PM' },
    Afternoon: { type: String, default: '12:00 PM - 6:00 PM' },
    Evening: { type: String, default: '6:00 PM - 12:00 AM' },
    '12Hour': { type: String, default: '6:00 AM - 6:00 PM' },
    '24Hour': { type: String, default: '24 Hours Access' }
  },
  emailProvider: { type: String, enum: ['gmail', 'outlook', 'custom'], default: 'gmail' },
  smtpHost: { type: String, default: null },
  smtpPort: { type: Number, default: null },
  smtpSecure: { type: Boolean, default: null },
  emailUser: { type: String, required: true },
  emailPassword: { type: String, required: true },
  telegramChatIds: [{ type: String }],
  // Multi-bot configuration
  telegramBots: [{
    nickname: { type: String, required: true },
    botToken: { type: String, required: true },
    chatIds: [{ type: String }],
    enabled: { type: Boolean, default: true },
    notifications: {
      newUser: { type: Boolean, default: true },
      feeDue: { type: Boolean, default: true },
      feeOverdue: { type: Boolean, default: true },
      feePaid: { type: Boolean, default: true }
    },
    settings: {
      sendSilently: { type: Boolean, default: false },
      protectContent: { type: Boolean, default: false },
      threadId: { type: String, default: null },
      serverUrl: { type: String, default: 'https://api.telegram.org' }
    }
  }],
  welcomeEmailTemplate: { type: String, required: true },
  dueDateEmailTemplate: { type: String, required: true },
  paymentConfirmationEmailTemplate: { type: String, required: true },
  // Cloudinary configuration
  cloudinaryCloudName: { type: String, default: null },
  cloudinaryApiKey: { type: String, default: null },
  cloudinaryApiSecret: { type: String, default: null }
}, {
  timestamps: true
});

// Create models
export const UserLog = mongoose.model('UserLog', userLogSchema);
export const User = mongoose.model('User', userSchema);
export const Seat = mongoose.model('Seat', seatSchema);
export const Admin = mongoose.model('Admin', adminSchema);
export const Settings = mongoose.model('Settings', settingsSchema);

// TypeScript interfaces for better type safety
export interface IUser {
  _id?: mongoose.Types.ObjectId | string;
  name: string;
  email: string;
  phone: string;
  address: string;
  seatNumber: number;
  slot: string;
  feeStatus: 'paid' | 'due' | 'expired';
  registrationDate: Date;
  idType?: string;
  idNumber?: string;
  idUpload?: string;
}

export interface IAdmin {
  _id?: mongoose.Types.ObjectId | string;
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'super-admin';
}

export interface ISeat {
  _id?: mongoose.Types.ObjectId | string;
  number: number;
  status: 'available' | 'paid' | 'due' | 'expired';
  userId?: mongoose.Types.ObjectId | string | null;
}

export interface ITelegramBot {
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

export interface ISettings {
  _id?: mongoose.Types.ObjectId | string;
  slotPricing: {
    Morning: number;
    Afternoon: number;
    Evening: number;
    '12Hour': number;
    '24Hour': number;
  };
  slotTimings: {
    Morning: string;
    Afternoon: string;
    Evening: string;
    '12Hour': string;
    '24Hour': string;
  };
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
  telegramSendSilently?: boolean;
  telegramProtectContent?: boolean;
  telegramBots?: ITelegramBot[];
  welcomeEmailTemplate: string;
  dueDateEmailTemplate: string;
  paymentConfirmationEmailTemplate?: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
}

export interface IUserLog {
  _id?: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  action: string;
  adminId?: mongoose.Types.ObjectId | string;
  timestamp: Date;
}
