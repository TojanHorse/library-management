import { mongoStorage } from './mongo-storage';
import { database } from './database';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      message?: string;
      responseTime?: number;
    };
    email: {
      status: 'healthy' | 'unhealthy';
      message?: string;
    };
    telegram: {
      status: 'healthy' | 'unhealthy';
      message?: string;
    };
  };
  timestamp: Date;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private lastHealthCheck: HealthStatus | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    const healthStatus: HealthStatus = {
      status: 'healthy',
      services: {
        database: { status: 'healthy' },
        email: { status: 'healthy' },
        telegram: { status: 'healthy' }
      },
      timestamp: new Date()
    };

    // Check Database
    try {
      const dbStartTime = Date.now();
      await mongoStorage.getAllUsers(); // Simple query to test DB
      const dbResponseTime = Date.now() - dbStartTime;
      
      healthStatus.services.database = {
        status: 'healthy',
        responseTime: dbResponseTime
      };
      
      if (dbResponseTime > 5000) { // Slow response
        healthStatus.services.database.message = 'Database responding slowly';
      }
    } catch (error) {
      healthStatus.services.database = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed'
      };
      healthStatus.status = 'unhealthy';
    }

    // Check Email Service
    try {
      const settings = await mongoStorage.getSettings();
      if (!settings?.emailUser || !settings?.emailPassword) {
        healthStatus.services.email = {
          status: 'unhealthy',
          message: 'Email service not configured'
        };
      }
    } catch (error) {
      healthStatus.services.email = {
        status: 'unhealthy',
        message: 'Failed to check email configuration'
      };
    }

    // Check Telegram Service
    try {
      const settings = await mongoStorage.getSettings();
      const hasActiveBots = settings?.telegramBots?.some(bot => bot.enabled && bot.chatIds.length > 0) ||
                           (settings?.telegramBotToken && settings?.telegramChatIds?.length > 0);
      
      if (!hasActiveBots) {
        healthStatus.services.telegram = {
          status: 'unhealthy',
          message: 'No active Telegram bots configured'
        };
      }
    } catch (error) {
      healthStatus.services.telegram = {
        status: 'unhealthy',
        message: 'Failed to check Telegram configuration'
      };
    }

    this.lastHealthCheck = healthStatus;
    return healthStatus;
  }

  async retryDatabaseConnection(): Promise<boolean> {
    try {
      console.log('🔄 Attempting to reconnect to database...');
      await database.disconnect();
      await database.connect();
      console.log('✅ Database reconnection successful');
      return true;
    } catch (error) {
      console.error('❌ Database reconnection failed:', error);
      return false;
    }
  }

  startHealthCheckInterval(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        
        if (health.status === 'unhealthy') {
          console.log('🚨 Health check failed:', health);
          
          // Attempt to recover from database issues
          if (health.services.database.status === 'unhealthy') {
            await this.retryDatabaseConnection();
          }
        }
      } catch (error) {
        console.error('❌ Health check error:', error);
      }
    }, intervalMs);

    console.log(`✅ Health check interval started (${intervalMs}ms)`);
  }

  stopHealthCheckInterval(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('❌ Health check interval stopped');
    }
  }

  getLastHealthCheck(): HealthStatus | null {
    return this.lastHealthCheck;
  }
}

export const healthCheckService = HealthCheckService.getInstance();
