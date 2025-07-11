import mongoose from 'mongoose';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (this.isConnected && mongoose.connection.readyState === 1) {
        console.log('Database already connected');
        return;
      }

      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      console.log('Connecting to MongoDB...');
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxIdleTimeMS: 30000,
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
      });
      
      this.isConnected = true;
      console.log('MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        // Only log non-connection errors to reduce spam
        if (!error.message.includes('MongoNotConnectedError') && 
            !error.message.includes('Client must be connected')) {
          console.error('MongoDB connection error:', error);
        }
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected - attempting to reconnect...');
        this.isConnected = false;
        this.reconnect();
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected successfully');
        this.isConnected = true;
      });

      // Initialize default data if needed
      await this.initializeDefaults();
      
      // Start connection monitor
      this.startConnectionMonitor();

    } catch (error) {
      console.error('Database connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  private startConnectionMonitor(): void {
    // Check connection every 30 seconds
    setInterval(async () => {
      try {
        if (mongoose.connection.readyState !== 1) {
          console.log('⚠️ [DATABASE] Connection state check: disconnected, attempting reconnect...');
          this.isConnected = false;
          await this.reconnect();
        } else if (!this.isConnected) {
          console.log('✅ [DATABASE] Connection restored');
          this.isConnected = true;
        }
      } catch (error) {
        console.error('❌ [DATABASE] Connection monitor error:', error);
      }
    }, 30000); // 30 seconds
  }

  private async reconnect(): Promise<void> {
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries && !this.isConnected) {
      try {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        console.log(`Attempting to reconnect to MongoDB (attempt ${retries + 1}/${maxRetries})`);
        
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.MONGODB_URI!, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxIdleTimeMS: 30000,
            connectTimeoutMS: 10000,
            heartbeatFrequencyMS: 10000,
            retryWrites: true,
            retryReads: true,
          });
        }
        
        this.isConnected = true;
        console.log('MongoDB reconnected successfully');
        break;
      } catch (error) {
        retries++;
        console.error(`Reconnection attempt ${retries} failed:`, error);
        if (retries >= maxRetries) {
          console.error('Max reconnection attempts reached. Manual intervention required.');
        }
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB disconnected');
    }
  }

  public isConnectedToDatabase(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  private async initializeDefaults(): Promise<void> {
    try {
      // Import models
      const { Admin, Settings, Seat } = await import('../shared/mongoose-schema');
      const bcrypt = await import('bcryptjs');

      // Create default admin if not exists
      const adminExists = await Admin.findOne({ username: 'Vidhyadham' });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const defaultAdmin = new Admin({
          username: 'Vidhyadham',
          password: hashedPassword,
          email: 'admin@vidhyadham.com',
          role: 'super-admin'
        });
        await defaultAdmin.save();
        console.log('Default admin created');
      }

      // Create default settings if not exists
      const settingsExists = await Settings.findOne();
      if (!settingsExists) {
        const defaultSettings = new Settings({
          slotPricing: {
            Morning: 1000,
            Afternoon: 1200,
            Evening: 1500
          },
          slotTimings: {
            Morning: '6:00 AM - 12:00 PM',
            Afternoon: '12:00 PM - 6:00 PM',
            Evening: '6:00 PM - 12:00 AM'
          },
          emailProvider: 'gmail',
          emailUser: process.env.GMAIL_USER || 'your-email@gmail.com',
          emailPassword: process.env.GMAIL_PASSWORD || 'your-app-password',
          telegramChatIds: process.env.TELEGRAM_CHAT_IDS ? process.env.TELEGRAM_CHAT_IDS.split(',').map(id => id.trim()) : ['939382380'],
          telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '7987816282:AAFlkQP8hASFjATNp2s4MhgspPP2yovaLUI',
          telegramBots: [],
          welcomeEmailTemplate: `Dear {{name}},

Welcome to VidhyaDham! Your registration is confirmed.

Registration Details:
- Name: {{name}}
- Email: {{email}}
- Phone: {{phone}}
- Seat Number: {{seatNumber}}
- Time Slot: {{slot}}
- Valid Till: {{validTill}} (30 days)

Thank you for choosing VidhyaDham.

Best regards,
Team VidhyaDham`,
          dueDateEmailTemplate: `Dear {{name}},

We hope your time at VidhyaDham has been peaceful and productive.

This is a gentle reminder that your seat subscription is due for renewal.

Membership Details:
- Seat Number: {{seatNumber}}
- Time Slot: {{slot}}
- Due Date: {{dueDate}}
- Payment Status: Pending

Please contact the admin to complete your renewal process.

Failure to renew within 3 days of this message will result in automatic termination of your seat.

Best regards,
Team VidhyaDham`,
          paymentConfirmationEmailTemplate: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Confirmation</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background-color: #f4f9f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 620px;
      margin: auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.08);
      border-left: 6px solid #27ae60;
    }
    h2 {
      color: #2ecc71;
      margin-top: 0;
    }
    .info {
      background-color: #f0fbf4;
      padding: 15px 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .info p {
      margin: 5px 0;
    }
    .footer {
      margin-top: 30px;
      font-size: 14px;
      color: #555;
    }
    blockquote {
      font-style: italic;
      color: #444;
      background-color: #eafaf1;
      border-left: 5px solid #1abc9c;
      padding: 10px 20px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>✅ Payment Received!</h2>
    <p>Dear <strong>{{name}}</strong>,</p>

    <p>We're pleased to confirm that your payment has been successfully recorded for your seat at <strong>VidhyaDham</strong>. Your membership has been reactivated, and you may continue using the facilities during your selected time slot.</p>

    <div class="info">
      <p><strong>📅 Payment Date:</strong> {{paidDate}}</p>
      <p><strong>🪑 Seat Number:</strong> {{seatNumber}}</p>
      <p><strong>⏱️ Time Slot:</strong> {{slot}}</p>
      <p><strong>🧾 Valid Until:</strong> {{nextDueDate}}</p>
    </div>

    <p class="footer">
      If you have any questions or need support, feel free to contact us.<br>
      Thank you for choosing VidhyaDham – a place for discipline, focus, and progress.
    </p>

    <blockquote>
      "विद्या ददाति विनयं"<br>
      <span style="font-size: 13px;">_Knowledge gives humility._</span>
    </blockquote>

    <p class="footer">– Team VidhyaDham</p>
  </div>
</body>
</html>`,
          cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
          cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || null,
          cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || null
        });
        await defaultSettings.save();
        console.log('Default settings created');
      } else {
        // Migration: Add payment confirmation template if it doesn't exist
        if (!settingsExists.paymentConfirmationEmailTemplate) {
          settingsExists.paymentConfirmationEmailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Confirmation</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background-color: #f4f9f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 620px;
      margin: auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.08);
      border-left: 6px solid #27ae60;
    }
    h2 {
      color: #2ecc71;
      margin-top: 0;
    }
    .info {
      background-color: #f0fbf4;
      padding: 15px 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .info p {
      margin: 5px 0;
    }
    .footer {
      margin-top: 30px;
      font-size: 14px;
      color: #555;
    }
    blockquote {
      font-style: italic;
      color: #444;
      background-color: #eafaf1;
      border-left: 5px solid #1abc9c;
      padding: 10px 20px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>✅ Payment Received!</h2>
    <p>Dear <strong>{{name}}</strong>,</p>

    <p>We're pleased to confirm that your payment has been successfully recorded for your seat at <strong>VidhyaDham</strong>. Your membership has been reactivated, and you may continue using the facilities during your selected time slot.</p>

    <div class="info">
      <p><strong>📅 Payment Date:</strong> {{paidDate}}</p>
      <p><strong>🪑 Seat Number:</strong> {{seatNumber}}</p>
      <p><strong>⏱️ Time Slot:</strong> {{slot}}</p>
      <p><strong>🧾 Valid Until:</strong> {{nextDueDate}}</p>
    </div>

    <p class="footer">
      If you have any questions or need support, feel free to contact us.<br>
      Thank you for choosing VidhyaDham – a place for discipline, focus, and progress.
    </p>

    <blockquote>
      "विद्या ददाति विनयं"<br>
      <span style="font-size: 13px;">_Knowledge gives humility._</span>
    </blockquote>

    <p class="footer">– Team VidhyaDham</p>
  </div>
</body>
</html>`;
          await settingsExists.save();
          console.log('Payment confirmation email template added to existing settings');
        }
      }

      // Create 114 seats if not exists
      const seatsCount = await Seat.countDocuments();
      if (seatsCount === 0) {
        const seats = [];
        for (let i = 1; i <= 114; i++) {
          seats.push({
            number: i,
            status: 'available',
            userId: null
          });
        }
        await Seat.insertMany(seats);
        console.log('114 seats initialized');
      }

    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  }
}

export const database = DatabaseConnection.getInstance();
