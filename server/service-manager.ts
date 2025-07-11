import { mongoStorage } from './mongo-storage';
import { emailService } from './email-service';
import { telegramService } from './telegram-service';
import { cloudinaryService } from './cloudinary';

export interface ServiceStatus {
  email: boolean;
  telegram: boolean;
  cloudinary: boolean;
  database: boolean;
}

export class ServiceManager {
  private static instance: ServiceManager;
  private serviceStatus: ServiceStatus = {
    email: false,
    telegram: false,
    cloudinary: false,
    database: false
  };

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async checkServiceAvailability(): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      email: false,
      telegram: false,
      cloudinary: false,
      database: false
    };

    // Check Database
    try {
      const { database } = await import('./database');
      if (database.isConnectedToDatabase()) {
        await mongoStorage.getAllUsers();
        status.database = true;
      }
    } catch (error) {
      console.warn('Database service unavailable:', error);
    }

    // Check Email Service
    try {
      const settings = await mongoStorage.getSettings();
      if (settings?.emailUser && settings?.emailPassword) {
        status.email = true;
      }
    } catch (error) {
      console.warn('Email service configuration unavailable:', error);
    }

    // Check Telegram Service
    try {
      const { telegramService } = await import('./telegram-service');
      const availableBots = await telegramService.getAllBots();
      
      // Telegram is available if there are any bots (including the default one)
      if (availableBots && availableBots.length > 0) {
        status.telegram = true;
        console.log(`🤖 [SERVICE-MANAGER] Found ${availableBots.length} Telegram bot(s) available`);
      } else {
        console.log('🤖 [SERVICE-MANAGER] No Telegram bots found');
      }
    } catch (error) {
      console.warn('Telegram service configuration unavailable:', error);
    }

    // Check Cloudinary Service
    try {
      // Simple check - if we can access cloudinary configuration
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        status.cloudinary = true;
      }
    } catch (error) {
      console.warn('Cloudinary service unavailable:', error);
    }

    this.serviceStatus = status;
    return status;
  }

  getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  isServiceAvailable(service: keyof ServiceStatus): boolean {
    return this.serviceStatus[service];
  }

  async executeWithFallback<T>(
    primaryFunction: () => Promise<T>,
    fallbackFunction: () => Promise<T> | T,
    serviceName: string
  ): Promise<T> {
    try {
      return await primaryFunction();
    } catch (error) {
      console.warn(`${serviceName} service failed, using fallback:`, error);
      return await fallbackFunction();
    }
  }

  async sendEmailWithFallback(
    to: string,
    subject: string,
    content: string,
    templateData?: any
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isServiceAvailable('email')) {
      return {
        success: false,
        message: 'Email service is currently unavailable. Please contact administrator directly.'
      };
    }

    try {
      const result = await emailService.sendEmail({
        to,
        subject,
        html: content
      });
      return {
        success: result.success,
        message: result.success ? 'Email sent successfully' : result.error || 'Email sending failed'
      };
    } catch (error) {
      // Fallback: Log the email for manual sending
      console.error('Email sending failed:', {
        to,
        subject,
        content: content.substring(0, 100) + '...',
        error
      });
      
      return {
        success: false,
        message: 'Email service temporarily unavailable. Your request has been logged for manual processing.'
      };
    }
  }

  async sendTelegramWithFallback(
    message: string,
    notificationType: 'newUser' | 'feeDue' | 'feeOverdue' | 'feePaid' = 'newUser'
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isServiceAvailable('telegram')) {
      return {
        success: false,
        message: 'Telegram notifications are currently unavailable.'
      };
    }

    try {
      const success = await telegramService.sendNotification(message, notificationType);
      return {
        success,
        message: success ? 'Telegram notification sent' : 'Failed to send Telegram notification'
      };
    } catch (error) {
      console.error('Telegram sending failed:', error);
      return {
        success: false,
        message: 'Telegram service temporarily unavailable.'
      };
    }
  }

  async uploadFileWithFallback(
    file: Express.Multer.File,
    folder: string = 'id-documents'
  ): Promise<{ success: boolean; url?: string; message: string }> {
    if (!this.isServiceAvailable('cloudinary')) {
      return {
        success: false,
        message: 'File upload service is currently unavailable. Please try again later or contact administrator.'
      };
    }

    try {
      const result = await cloudinaryService.uploadBuffer(file.buffer, {
        folder,
        resource_type: 'auto'
      });
      
      return {
        success: true,
        url: result.secure_url,
        message: 'File uploaded successfully'
      };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        message: 'File upload temporarily unavailable. Please try again later.'
      };
    }
  }

  async getDataWithFallback<T>(
    dataFetcher: () => Promise<T>,
    fallbackData: T,
    dataType: string
  ): Promise<T> {
    if (!this.isServiceAvailable('database')) {
      console.warn(`Database unavailable, using fallback for ${dataType}`);
      return fallbackData;
    }

    try {
      return await dataFetcher();
    } catch (error) {
      console.error(`Failed to fetch ${dataType}, using fallback:`, error);
      return fallbackData;
    }
  }

  // Initialize service status check
  async initialize(): Promise<void> {
    await this.checkServiceAvailability();
    
    // Check services every 5 minutes
    setInterval(async () => {
      await this.checkServiceAvailability();
    }, 5 * 60 * 1000);
    
    console.log('Service manager initialized with status:', this.serviceStatus);
  }
}

export const serviceManager = ServiceManager.getInstance();
