import { User } from '../types';

// Normalize user data from MongoDB API response
export function normalizeUser(user: any): User {
  return {
    ...user,
    id: user._id || user.id, // Ensure id field exists for backwards compatibility
    _id: user._id || user.id,
    logs: user.logs || []
  };
}

// Prepare user data for API submission
export function prepareUserForApi(user: Partial<User>): any {
  const { id, _id, logs, ...userData } = user;
  return userData;
}

// Normalize settings from MongoDB API response
export function normalizeSettings(settings: any): any {
  return {
    ...settings,
    // Handle potential differences in settings structure
    slotPricing: settings.slotPricing || {},
    slotTimings: settings.slotTimings || {},
    telegramChatIds: settings.telegramChatIds || []
  };
}
