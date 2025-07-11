import { mongoStorage } from './mongo-storage';
import { emailService, EmailService } from './email-service';
import { telegramService } from './telegram-service';
import { feeCalculator } from './fee-calculator';
import * as cron from 'node-cron';

interface DueDateUser {
  _id?: string;
  id?: string;
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
  private cronJob: cron.ScheduledTask | null = null;
  private lastCheckTime: Date | null = null;
  private isRunning: boolean = false;

  start() {
    console.log('🚀 Starting due date reminder scheduler with node-cron...');
    
    if (this.isRunning) {
      console.log('⚠️  Scheduler already running');
      return;
    }
    
    this.isRunning = true;
    
    // Run immediately on start
    this.checkDueDates();
    
    // Schedule to run every day at 9:00 AM
    this.cronJob = cron.schedule('0 9 * * *', () => {
      console.log('🔄 Cron job triggered at 9:00 AM');
      this.checkDueDates();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata' // Indian timezone
    });
    
    // Also run every 6 hours as backup
    const backupCron = cron.schedule('0 */6 * * *', () => {
      console.log('🔄 Backup cron job triggered (every 6 hours)');
      this.checkDueDates();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });
    
    console.log('✅ Scheduler started - will check daily at 9:00 AM and every 6 hours as backup');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      console.log('❌ Due date reminder scheduler stopped');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      nextCheckTime: this.cronJob ? 'Daily at 9:00 AM IST + Every 6 hours' : null,
      checkInterval: 'Daily at 9:00 AM IST + Every 6 hours as backup'
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

  private async processTermination(user: DueDateUser, settings: any, emailConfigured: boolean, hasActiveBots: boolean) {
    try {
      console.log(`🚫 [SCHEDULER] Processing termination for user: ${user.name} (${user.email})`);
      
      // Get user ID (handle both _id and id fields)
      const userId = user._id?.toString() || user.id?.toString();
      if (!userId) {
        console.error('User ID not found for termination processing');
        return;
      }
      
      // Update user status to expired
      await mongoStorage.updateUser(userId, { feeStatus: 'expired' });
      
      // Free up the seat
      await mongoStorage.updateSeat(user.seatNumber, {
        status: 'available',
        userId: null
      });
      
      // Send termination notification if email is configured
      if (emailConfigured && settings?.dueDateEmailTemplate) {
        await this.sendTerminationNotice(user, settings.dueDateEmailTemplate);
      }
      
      // Send Telegram notification if configured
      if (hasActiveBots) {
        const message = `🚫 *Seat Termination Notice*\n\nSeat ${user.seatNumber} has been terminated due to overdue fees.\n\nUser: ${user.name}\nEmail: ${user.email}\nPhone: ${user.phone}`;
        await telegramService.sendMessage(message);
      }
      
      console.log(`✅ [SCHEDULER] Termination processed for ${user.name}`);
    } catch (error) {
      console.error(`❌ [SCHEDULER] Error processing termination for ${user.name}:`, error);
    }
  }

  private async sendTerminationNotice(user: DueDateUser, template: string) {
    try {
      const emailData = {
        name: user.name || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        seatNumber: user.seatNumber?.toString() || 'N/A',
        slot: user.slot || 'N/A'
      };

      let emailContent = template.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
        return emailData[key as keyof typeof emailData] || match;
      });

      const emailOptions = {
        to: user.email,
        subject: 'Seat Termination Notice - VidhyaDham',
        html: emailContent
      };

      await emailService.sendEmail(emailOptions);
      console.log(`📧 [SCHEDULER] Termination notice sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ [SCHEDULER] Error sending termination notice to ${user.email}:`, error);
    }
  }

  private async sendDueDateReminder(user: DueDateUser, template: string) {
    try {
      console.log(`📧 [SCHEDULER] Sending due date reminder to: ${user.email}`);
      
      if (!user.registrationDate) {
        console.error('Registration date is missing for user:', user.email);
        return;
      }
      
      const registrationDate = new Date(user.registrationDate);
      const dueDate = new Date(registrationDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days from registration

      const emailData = {
        name: user.name || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        address: user.address || 'N/A',
        seatNumber: user.seatNumber?.toString() || 'N/A',
        slot: user.slot || 'N/A',
        dueDate: dueDate.toLocaleDateString('en-IN')
      };

      if (!user.email) {
        console.error('User email is missing for reminder');
        return;
      }

      const result = await emailService.sendDueDateReminder(
        user.email,
        emailData,
        template
      );

      if (result.success) {
        console.log(`✅ [SCHEDULER] Due date reminder sent to ${user.email}`);
        
        // Log the reminder
        const userId = user._id?.toString() || user.id?.toString();
        if (userId) {
          await mongoStorage.createUserLog({
            userId,
            action: 'Due date reminder email sent',
            adminId: 'system'
          });
        }
      } else {
        console.error(`❌ [SCHEDULER] Failed to send due date reminder to ${user.email}:`, result.error);
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
