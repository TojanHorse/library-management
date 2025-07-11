import { mongoStorage } from './mongo-storage';
import { emailService, EmailService } from './email-service';
import { telegramService } from './telegram-service';
import { feeCalculator } from './fee-calculator';

interface DueDateUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  seatNumber: number;
  slot: string;
  feeStatus: string;
  registrationDate: Date;
}

export class DueDateScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private lastCheckTime: Date | null = null;
  private isRunning: boolean = false;

  start() {
    console.log('Starting due date reminder scheduler...');
    
    if (this.isRunning) {
      console.log('Scheduler already running');
      return;
    }
    
    this.isRunning = true;
    
    // Run immediately on start
    this.checkDueDates();
    
    // Then run every 24 hours
    this.intervalId = setInterval(() => {
      this.checkDueDates();
    }, this.CHECK_INTERVAL);
    
    console.log(`Scheduler started - will check every ${this.CHECK_INTERVAL / (60 * 60 * 1000)} hours`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('Due date reminder scheduler stopped');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      nextCheckTime: this.lastCheckTime ? new Date(this.lastCheckTime.getTime() + this.CHECK_INTERVAL) : null,
      checkInterval: this.CHECK_INTERVAL
    };
  }

  private async checkDueDates() {
    try {
      this.lastCheckTime = new Date();
      console.log(`📅 [SCHEDULER] Enhanced fee management check... (${this.lastCheckTime.toLocaleString()})`);
      
      const users = await mongoStorage.getAllUsers();
      const settings = await mongoStorage.getSettings();
      
      console.log(`👥 [SCHEDULER] Found ${users.length} total users to check`);

      // Check email configuration
      const hasEmailConfig = settings?.emailUser && settings?.emailPassword;
      if (!hasEmailConfig) {
        console.log('📧 [SCHEDULER] Email service not configured - skipping email notifications');
      }

      // Check Telegram configuration
      const telegramBots = settings?.telegramBots || [];
      const hasActiveBots = telegramBots.some(bot => bot.enabled && bot.chatIds.length > 0) ||
                           (settings?.telegramBotToken && settings?.telegramChatIds && settings?.telegramChatIds.length > 0);
      
      console.log(`🤖 [SCHEDULER] Telegram bots configured: ${hasActiveBots ? 'Yes' : 'No'}`);

      // Configure email service if available
      let emailConfigured = false;
      if (hasEmailConfig) {
        let smtpConfig;
        if (settings.emailProvider === 'gmail') {
          smtpConfig = EmailService.createGmailConfig(settings.emailUser, settings.emailPassword);
        } else if (settings.emailProvider === 'outlook') {
          smtpConfig = EmailService.createOutlookConfig(settings.emailUser, settings.emailPassword);
        } else if (settings.emailProvider === 'custom' && settings.smtpHost && typeof settings.smtpPort === 'number' && typeof settings.smtpSecure === 'boolean') {
          smtpConfig = {
            host: settings.smtpHost,
            port: settings.smtpPort,
            secure: settings.smtpSecure,
            auth: {
              user: settings.emailUser,
              pass: settings.emailPassword
            }
          };
        }

        if (smtpConfig) {
          emailService.configure(smtpConfig, settings.emailUser);
          emailConfigured = true;
        }
      }

      // Enhanced fee management categories
      const threeDayReminders: DueDateUser[] = [];
      const dueTodayReminders: DueDateUser[] = [];
      const terminationCandidates: DueDateUser[] = [];

      for (const user of users) {
        const feeSummary = feeCalculator.getFeeSummary(user, settings?.slotPricing || {});
        const daysUntilDue = feeSummary.daysUntilDue;
        
        // 3 days before due date - send reminder
        if (daysUntilDue === 3 && user.feeStatus !== 'expired') {
          threeDayReminders.push(user as DueDateUser);
        }
        
        // Due today - send due notice
        if (daysUntilDue === 0 && user.feeStatus === 'due') {
          dueTodayReminders.push(user as DueDateUser);
        }
        
        // 3 days after due date - terminate membership
        if (daysUntilDue === -3 && user.feeStatus === 'expired') {
          terminationCandidates.push(user as DueDateUser);
        }
      }

      console.log(`📊 [SCHEDULER] 3-day reminders: ${threeDayReminders.length}`);
      console.log(`📊 [SCHEDULER] Due today notices: ${dueTodayReminders.length}`);
      console.log(`📊 [SCHEDULER] Termination candidates: ${terminationCandidates.length}`);

      // Process 3-day reminders
      for (const user of threeDayReminders) {
        await this.sendDueDateReminder(user, settings?.dueDateEmailTemplate || 'Default reminder template');
      }

      // Process due today notices
      for (const user of dueTodayReminders) {
        await this.sendDueDateReminder(user, settings?.dueDateEmailTemplate || 'Default reminder template');
      }

      // Process terminations
      for (const user of terminationCandidates) {
        await this.processTermination(user, settings, emailConfigured, hasActiveBots);
      }

    } catch (error) {
      console.error('❌ [SCHEDULER] Error in enhanced fee management:', error);
    }
  }

  private async sendDueDateReminder(user: DueDateUser, template: string) {
    try {
      const registrationDate = new Date(user.registrationDate);
      const dueDate = new Date(registrationDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days from registration

      const emailData = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        seatNumber: user.seatNumber,
        slot: user.slot,
        dueDate: dueDate.toLocaleDateString('en-IN')
      };

      const result = await emailService.sendDueDateReminder(
        user.email,
        emailData,
        template
      );

      if (result.success) {
        console.log(`Due date reminder sent to ${user.email}`);
        
        // Log the reminder
        await mongoStorage.createUserLog({
          userId: user.id.toString(),
          action: 'Due date reminder email sent',
          adminId: 'system'
        });
      } else {
        console.error(`Failed to send due date reminder to ${user.email}:`, result.error);
      }

    } catch (error) {
      console.error(`Error sending due date reminder to ${user.email}:`, error);
    }
  }

  // Manual trigger for testing
  async triggerDueDateCheck() {
    console.log('Manually triggering due date check...');
    await this.checkDueDates();
  }
}

export const dueDateScheduler = new DueDateScheduler();
