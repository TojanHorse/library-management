import { mongoStorage } from './mongo-storage';
import { emailService, EmailService } from './email-service';

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

  start() {
    console.log('Starting due date reminder scheduler...');
    
    // Run immediately on start
    this.checkDueDates();
    
    // Then run every 24 hours
    this.intervalId = setInterval(() => {
      this.checkDueDates();
    }, this.CHECK_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Due date reminder scheduler stopped');
    }
  }

  private async checkDueDates() {
    try {
      console.log('Checking for users with upcoming due dates...');
      
      const users = await mongoStorage.getAllUsers();
      const settings = await mongoStorage.getSettings();

      if (!settings?.emailUser || !settings?.emailPassword || !settings?.dueDateEmailTemplate) {
        console.log('Email service not configured - skipping due date checks');
        return;
      }

      // Configure email service
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

      if (!smtpConfig) {
        console.log('Invalid email provider configuration - skipping due date checks');
        return;
      }

      emailService.configure(smtpConfig, settings.emailUser);

      const today = new Date();
      const usersToRemind: DueDateUser[] = [];

      for (const user of users) {
        if (user.feeStatus === 'due' || user.feeStatus === 'expired') {
          // Calculate days since registration
          const registrationDate = new Date(user.registrationDate);
          const daysSinceRegistration = Math.floor((today.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Send reminder after 27 days (3 days before 30-day expiry)
          // and then every 3 days for expired users
          if (daysSinceRegistration === 27 || (daysSinceRegistration > 30 && daysSinceRegistration % 3 === 0)) {
            usersToRemind.push(user as DueDateUser);
          }
        }
      }

      console.log(`Found ${usersToRemind.length} users to send due date reminders`);

      for (const user of usersToRemind) {
        await this.sendDueDateReminder(user, settings.dueDateEmailTemplate);
      }

    } catch (error) {
      console.error('Error checking due dates:', error);
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
