// External webhook-based scheduler for free hosting services
import { mongoStorage } from './mongo-storage';
import { emailService } from './email-service';
import { telegramService } from './telegram-service';
import { feeCalculator } from './fee-calculator';

export class WebhookScheduler {
  
  // This endpoint can be called by external cron services
  async executeScheduledTasks(): Promise<{
    success: boolean;
    results: {
      dueDateReminders: number;
      overdueNotifications: number;
      errors: string[];
    };
  }> {
    const results = {
      dueDateReminders: 0,
      overdueNotifications: 0,
      errors: [] as string[]
    };

    try {
      console.log('🔄 Webhook scheduler: Executing scheduled tasks...');
      
      const users = await mongoStorage.getAllUsers();
      const settings = await mongoStorage.getSettings();

      if (!settings?.emailUser || !settings?.emailPassword) {
        results.errors.push('Email service not configured');
        return { success: false, results };
      }

      // Configure email service
      let smtpConfig;
      if (settings.emailProvider === 'gmail') {
        smtpConfig = emailService.createGmailConfig(settings.emailUser, settings.emailPassword);
      } else if (settings.emailProvider === 'outlook') {
        smtpConfig = emailService.createOutlookConfig(settings.emailUser, settings.emailPassword);
      } else if (settings.emailProvider === 'custom') {
        smtpConfig = {
          host: settings.smtpHost || 'smtp.gmail.com',
          port: settings.smtpPort || 587,
          secure: settings.smtpSecure || false,
          auth: {
            user: settings.emailUser,
            pass: settings.emailPassword
          }
        };
      }

      if (smtpConfig) {
        emailService.configure(smtpConfig);
      }

      // Process each user
      for (const user of users) {
        try {
          if (user.feeStatus === 'paid') {
            const calculation = feeCalculator.calculateNextDueDate(
              user.registrationDate,
              user.slot as 'Morning' | 'Afternoon' | 'Evening',
              settings.slotPricing
            );

            const today = new Date();
            const dueDate = calculation.nextDueDate;
            const timeDiff = dueDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            // Send due date reminder (3 days before)
            if (daysLeft <= 3 && daysLeft > 0) {
              console.log(`📧 Sending due date reminder to ${user.name} (${daysLeft} days left)`);
              
              // Send email
              if (settings.dueDateEmailTemplate) {
                const emailData = {
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                  address: user.address,
                  seatNumber: user.seatNumber,
                  slot: user.slot,
                  dueDate: dueDate.toLocaleDateString()
                };

                await emailService.sendDueDateReminder(
                  user.email,
                  emailData,
                  settings.dueDateEmailTemplate
                );
              }

              // Send Telegram notification
              await telegramService.sendFeeDueNotification(user, daysLeft);
              results.dueDateReminders++;
            }
          } else if (user.feeStatus === 'due' || user.feeStatus === 'expired') {
            // Handle overdue payments
            const calculation = feeCalculator.calculateNextDueDate(
              user.registrationDate,
              user.registrationDate,
              settings.slotPricing,
              user.slot as 'Morning' | 'Afternoon' | 'Evening'
            );

            const today = new Date();
            const dueDate = calculation.nextDueDate;
            const timeDiff = today.getTime() - dueDate.getTime();
            const daysOverdue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysOverdue > 0) {
              console.log(`🚨 Sending overdue notification to ${user.name} (${daysOverdue} days overdue)`);
              
              // Send Telegram notification for overdue
              await telegramService.sendFeeOverdueNotification(user, daysOverdue);
              results.overdueNotifications++;
            }
          }
        } catch (userError) {
          console.error(`Error processing user ${user.name}:`, userError);
          results.errors.push(`User ${user.name}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
        }
      }

      console.log(`✅ Webhook scheduler completed:`, results);
      return { success: true, results };

    } catch (error) {
      console.error('❌ Webhook scheduler error:', error);
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return { success: false, results };
    }
  }

  // Health check specifically for webhook schedulers
  async getWebhookStatus() {
    try {
      const settings = await mongoStorage.getSettings();
      const users = await mongoStorage.getAllUsers();
      
      return {
        timestamp: new Date().toISOString(),
        ready: true,
        services: {
          email: !!settings?.emailUser,
          telegram: (settings?.telegramBots?.length || 0) > 0,
          database: true
        },
        stats: {
          totalUsers: users.length,
          paidUsers: users.filter(u => u.feeStatus === 'paid').length,
          dueUsers: users.filter(u => u.feeStatus === 'due').length,
          expiredUsers: users.filter(u => u.feeStatus === 'expired').length
        },
        webhookInfo: {
          endpoint: '/api/webhook/scheduler',
          method: 'POST',
          recommendedSchedule: 'Daily at 9:00 AM IST',
          cronExpression: '0 9 * * *'
        }
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        ready: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const webhookScheduler = new WebhookScheduler();
