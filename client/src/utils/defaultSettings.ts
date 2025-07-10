import { Settings } from '../types';

export const defaultSettings: Settings = {
  slotPricing: {
    'Morning': 1000,
    'Afternoon': 1200,
    'Evening': 1500
  },
  slotTimings: {
    'Morning': '6:00 AM - 12:00 PM',
    'Afternoon': '12:00 PM - 6:00 PM',
    'Evening': '6:00 PM - 12:00 AM'
  },
  emailProvider: 'gmail',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  emailUser: 'your-email@gmail.com',
  emailPassword: 'your-app-password',
  telegramChatIds: [],
  welcomeEmailTemplate: 'Welcome to VidhyaDham!',
  dueDateEmailTemplate: 'Payment due reminder'
};
