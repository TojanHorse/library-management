// Using native fetch API (Node.js 18+)
import { mongoStorage } from './mongo-storage';

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

export class TelegramService {
  private readonly TELEGRAM_TIMEOUT = 15000; // 15 seconds
  
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error(`Telegram API timeout after ${this.TELEGRAM_TIMEOUT / 1000} seconds`)), this.TELEGRAM_TIMEOUT);
    });
    
    return Promise.race([
      fetch(url, options),
      timeoutPromise
    ]);
  }

  private async getEnabledBots(notificationType: keyof TelegramBot['notifications']): Promise<TelegramBot[]> {
    const settings = await mongoStorage.getSettings();
    if (!settings) {
      console.log('❌ [TELEGRAM] No settings found in database');
      return [];
    }
    
    console.log(`🔍 [TELEGRAM] Checking settings for notification type: ${notificationType}`);
    console.log(`🔍 [TELEGRAM] Settings telegramBots count: ${settings.telegramBots?.length || 0}`);
    console.log(`🔍 [TELEGRAM] Settings telegramBotToken exists: ${!!settings.telegramBotToken}`);
    console.log(`🔍 [TELEGRAM] Settings telegramChatIds count: ${settings.telegramChatIds?.length || 0}`);
    
    const bots: TelegramBot[] = [];
    
    // Add configured bots
    if (settings.telegramBots) {
      const enabledBots = settings.telegramBots.filter(bot => 
        bot.enabled && 
        bot.notifications[notificationType] && 
        bot.chatIds.length > 0
      );
      bots.push(...enabledBots);
      console.log(`🤖 [TELEGRAM] Found ${enabledBots.length} configured bots for ${notificationType}`);
    }
    
    // Add legacy bot configuration if exists
    if (settings.telegramBotToken && settings.telegramChatIds && settings.telegramChatIds.length > 0) {
      const legacyBot: TelegramBot = {
        nickname: settings.telegramFriendlyName || 'VidhyaDham Bot',
        botToken: settings.telegramBotToken,
        chatIds: settings.telegramChatIds,
        enabled: settings.telegramDefaultEnabled !== false,
        notifications: {
          newUser: true,
          feeDue: true,
          feeOverdue: true,
          feePaid: true
        },
        settings: {
          sendSilently: settings.telegramSendSilently || false,
          protectContent: settings.telegramProtectContent || false,
          threadId: settings.telegramThreadId || null,
          serverUrl: settings.telegramServerUrl || 'https://api.telegram.org'
        }
      };
      bots.push(legacyBot);
      console.log(`🤖 [TELEGRAM] Using legacy Telegram config: ${legacyBot.nickname} with ${legacyBot.chatIds.length} chat ID(s)`);
    }
    
    console.log(`📊 [TELEGRAM] Total enabled bots for ${notificationType}: ${bots.length}`);
    return bots;
  }

  private async getAllEnabledBots(): Promise<TelegramBot[]> {
    const settings = await mongoStorage.getSettings();
    if (!settings) return [];
    
    const bots: TelegramBot[] = [];
    
    // Add configured bots
    if (settings.telegramBots) {
      bots.push(...settings.telegramBots.filter(bot => 
        bot.enabled && 
        bot.chatIds.length > 0
      ));
    }
    
    // Add legacy bot configuration if exists
    if (settings.telegramBotToken && settings.telegramChatIds && settings.telegramChatIds.length > 0) {
      const legacyBot: TelegramBot = {
        nickname: settings.telegramFriendlyName || 'VidhyaDham Bot',
        botToken: settings.telegramBotToken,
        chatIds: settings.telegramChatIds,
        enabled: settings.telegramDefaultEnabled !== false,
        notifications: {
          newUser: true,
          feeDue: true,
          feeOverdue: true,
          feePaid: true
        },
        settings: {
          sendSilently: settings.telegramSendSilently || false,
          protectContent: settings.telegramProtectContent || false,
          threadId: settings.telegramThreadId || null,
          serverUrl: settings.telegramServerUrl || 'https://api.telegram.org'
        }
      };
      bots.push(legacyBot);
      console.log(`🤖 Using dynamic Telegram config: ${legacyBot.nickname} with ${legacyBot.chatIds.length} chat ID(s)`);
    }
    
    return bots;
  }

  async sendMessage(
    botToken: string, 
    message: string, 
    chatId: string, 
    options: {
      silent?: boolean;
      protectContent?: boolean;
      threadId?: string;
      serverUrl?: string;
    } = {}
  ): Promise<boolean> {
    const { 
      silent = false, 
      protectContent = false, 
      threadId, 
      serverUrl = 'https://api.telegram.org' 
    } = options;

    try {
      const url = `${serverUrl}/bot${botToken}/sendMessage`;
      const payload: any = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_notification: silent,
        protect_content: protectContent
      };

      if (threadId) {
        payload.message_thread_id = threadId;
      }

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [TELEGRAM] Failed to send message to chat ${chatId}:`, errorText);
        return false;
      }

      const result = await response.json();
      console.log(`✅ [TELEGRAM] Message sent to chat ${chatId}, message ID: ${result.result?.message_id}`);
      return true;
    } catch (error) {
      console.error(`Error sending message to chat ${chatId}:`, error);
      return false;
    }
  }

  private async sendToEnabledBots(message: string, notificationType: keyof TelegramBot['notifications']): Promise<boolean> {
    const enabledBots = await this.getEnabledBots(notificationType);
    
    console.log(`📱 [TELEGRAM] Attempting to send ${notificationType} notification...`);
    
    if (enabledBots.length === 0) {
      console.log(`❌ [TELEGRAM] No enabled bots found for notification type: ${notificationType}`);
      console.log(`💡 [TELEGRAM] Configure bot token and chat IDs in settings to receive notifications`);
      return false;
    }

    console.log(`🤖 [TELEGRAM] Found ${enabledBots.length} enabled bot(s) for ${notificationType}`);
    let allSent = true;
    let totalMessages = 0;
    let successfulMessages = 0;
    
    for (const bot of enabledBots) {
      console.log(`📤 [TELEGRAM] Sending via bot: "${bot.nickname}" to ${bot.chatIds.length} chat(s)`);
      
      for (const chatId of bot.chatIds) {
        totalMessages++;
        console.log(`🎯 [TELEGRAM] Sending to chat ID: ${chatId}...`);
        
        const success = await this.sendMessage(
          bot.botToken, 
          message, 
          chatId, 
          {
            silent: bot.settings.sendSilently,
            protectContent: bot.settings.protectContent,
            threadId: bot.settings.threadId || undefined,
            serverUrl: bot.settings.serverUrl
          }
        );
        
        if (success) {
          successfulMessages++;
          console.log(`✅ [TELEGRAM] Message sent successfully to ${chatId}`);
        } else {
          console.log(`❌ [TELEGRAM] Failed to send message to ${chatId}`);
          allSent = false;
        }
      }
    }
    
    console.log(`📊 [TELEGRAM] Summary: ${successfulMessages}/${totalMessages} messages sent successfully`);
    return allSent;
  }

  // Test a specific bot
  async testBot(botToken: string, chatId: string, options: {
    silent?: boolean;
    protectContent?: boolean;
    threadId?: string;
    serverUrl?: string;
  } = {}): Promise<boolean> {
    const testMessage = `🤖 <b>TELEGRAM BOT TEST</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `✅ <b>Status:</b> Bot is working correctly!\n` +
      `📅 <b>Test Date:</b> ${new Date().toLocaleString('en-IN')}\n` +
      `🔗 <b>Connection:</b> Successful\n\n` +
      `🎯 <b>Bot Configuration:</b>\n` +
      `• Silent Mode: ${options.silent ? 'Enabled' : 'Disabled'}\n` +
      `• Content Protection: ${options.protectContent ? 'Enabled' : 'Disabled'}\n` +
      `• Server URL: ${options.serverUrl || 'Default'}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📚 <b>VidhyaDham Library Admin Panel</b>\n` +
      `🚀 <i>Ready to send notifications!</i>`;

    return this.sendMessage(botToken, testMessage, chatId, options);
  }

  // Notification methods
  async sendNewUserNotification(userData: any): Promise<boolean> {
    console.log(`🎉 [TELEGRAM] Sending new user notification for: ${userData.name} (Seat #${userData.seatNumber})`);
    const message = `🎉 <b>NEW USER REGISTRATION</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Name:</b> ${userData.name}\n` +
      `📧 <b>Email:</b> ${userData.email}\n` +
      `📱 <b>Phone:</b> ${userData.phone}\n` +
      `🪑 <b>Seat Number:</b> #${userData.seatNumber}\n` +
      `⏰ <b>Time Slot:</b> ${userData.slot}\n` +
      `📅 <b>Registration Date:</b> ${new Date().toLocaleString('en-IN')}\n\n` +
      `🎯 <b>Status:</b> Account Created Successfully\n` +
      `💳 <b>Fee Status:</b> Due for Payment\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📚 <b>Welcome to VidhyaDham Library!</b>\n` +
      `🏢 <i>Professional Learning Environment</i>`;

    return this.sendToEnabledBots(message, 'newUser');
  }

  async sendFeeDueNotification(userData: any, daysLeft: number): Promise<boolean> {
    console.log(`⚠️ [TELEGRAM] Sending fee due notification for: ${userData.name} (${daysLeft} days left)`);
    const urgency = daysLeft <= 1 ? '🚨' : '⚠️';
    const statusColor = daysLeft <= 1 ? '🔴' : '🟡';
    const message = `${urgency} <b>FEE PAYMENT REMINDER</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Name:</b> ${userData.name}\n` +
      `🪑 <b>Seat Number:</b> #${userData.seatNumber}\n` +
      `⏰ <b>Time Slot:</b> ${userData.slot}\n` +
      `📅 <b>Due Date:</b> ${new Date(userData.nextDueDate).toLocaleDateString('en-IN')}\n` +
      `⏳ <b>Days Remaining:</b> ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}\n\n` +
      `${statusColor} <b>Priority:</b> ${daysLeft <= 1 ? 'URGENT - Payment Due Tomorrow!' : 'Payment Due Soon'}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💼 <b>VidhyaDham Library</b>\n` +
      `📞 <i>Please contact admin for payment details</i>`;

    return this.sendToEnabledBots(message, 'feeDue');
  }

  async sendPaymentReceivedNotification(userData: any): Promise<boolean> {
    console.log(`💰 [TELEGRAM] Sending payment confirmation for: ${userData.name} (₹${userData.amount})`);
    const message = `✅ <b>PAYMENT CONFIRMATION</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Name:</b> ${userData.name}\n` +
      `🪑 <b>Seat Number:</b> #${userData.seatNumber}\n` +
      `⏰ <b>Time Slot:</b> ${userData.slot}\n` +
      `💰 <b>Amount Paid:</b> ₹${userData.amount || 'N/A'}\n` +
      `📅 <b>Payment Date:</b> ${new Date().toLocaleDateString('en-IN')}\n` +
      `📅 <b>Next Due Date:</b> ${new Date(userData.nextDueDate).toLocaleDateString('en-IN')}\n\n` +
      `🎯 <b>Status:</b> Payment Successful\n` +
      `💳 <b>Account Status:</b> Active\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💚 <b>Thank you for your payment!</b>\n` +
      `📚 <i>Continue your learning journey</i>`;

    return this.sendToEnabledBots(message, 'feePaid');
  }

  async sendFeeOverdueNotification(userData: any, daysOverdue: number): Promise<boolean> {
    const message = `🚨 <b>PAYMENT OVERDUE ALERT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Name:</b> ${userData.name}\n` +
      `🪑 <b>Seat Number:</b> #${userData.seatNumber}\n` +
      `⏰ <b>Time Slot:</b> ${userData.slot}\n` +
      `📅 <b>Due Date:</b> ${new Date(userData.nextDueDate).toLocaleDateString('en-IN')}\n` +
      `⏳ <b>Days Overdue:</b> ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}\n\n` +
      `🔴 <b>Status:</b> URGENT - Payment Overdue\n` +
      `⚠️ <b>Action Required:</b> Contact user immediately\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📞 <b>VidhyaDham Library</b>\n` +
      `🚨 <i>Immediate attention required</i>`;

    return this.sendToEnabledBots(message, 'feeOverdue');
  }

  async sendUserDeletedNotification(userData: any): Promise<boolean> {
    console.log(`🗑️ [TELEGRAM] Sending user deletion notification for: ${userData.name}`);
    const message = `🗑️ <b>USER ACCOUNT DELETED</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Name:</b> ${userData.name}\n` +
      `📧 <b>Email:</b> ${userData.email}\n` +
      `🪑 <b>Seat Number:</b> #${userData.seatNumber}\n` +
      `⏰ <b>Time Slot:</b> ${userData.slot}\n` +
      `📅 <b>Deleted Date:</b> ${new Date().toLocaleString('en-IN')}\n\n` +
      `🎯 <b>Status:</b> Account Terminated\n` +
      `🆓 <b>Seat Status:</b> Available for new registrations\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 <b>VidhyaDham Library</b>\n` +
      `📝 <i>Admin action completed</i>`;

    return this.sendToEnabledBots(message, 'newUser'); // Using newUser notification type for admin alerts
  }

  async sendUserUpdatedNotification(userData: any): Promise<boolean> {
    console.log(`✏️ [TELEGRAM] Sending user update notification for: ${userData.name}`);
    const message = `✏️ <b>USER INFORMATION UPDATED</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Name:</b> ${userData.name}\n` +
      `📧 <b>Email:</b> ${userData.email}\n` +
      `🪑 <b>Seat Number:</b> #${userData.seatNumber}\n` +
      `⏰ <b>Time Slot:</b> ${userData.slot}\n` +
      `📅 <b>Updated Date:</b> ${new Date().toLocaleString('en-IN')}\n\n` +
      `🎯 <b>Status:</b> Profile Updated Successfully\n` +
      `💼 <b>Changes:</b> User information modified\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 <b>VidhyaDham Library</b>\n` +
      `📝 <i>Admin action completed</i>`;

    return this.sendToEnabledBots(message, 'newUser'); // Using newUser notification type for admin alerts
  }

  // Generic notification method
  async sendNotification(message: string, notificationType: keyof TelegramBot['notifications'] = 'newUser'): Promise<boolean> {
    console.log(`📢 [TELEGRAM] Sending generic notification (${notificationType}): ${message.substring(0, 100)}...`);
    return this.sendToEnabledBots(message, notificationType);
  }

  // Get all configured bots for management
  async getAllBots(): Promise<TelegramBot[]> {
    return this.getAllEnabledBots();
  }
}

export const telegramService = new TelegramService();
