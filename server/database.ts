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
      if (this.isConnected) {
        console.log('Database already connected');
        return;
      }

      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      await mongoose.connect(mongoUri);
      this.isConnected = true;
      console.log('MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

      // Initialize default data if needed
      await this.initializeDefaults();

    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
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
    return this.isConnected;
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
          telegramChatIds: [],
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
          cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
          cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || null,
          cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || null
        });
        await defaultSettings.save();
        console.log('Default settings created');
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
