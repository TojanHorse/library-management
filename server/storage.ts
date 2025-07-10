// DEPRECATED: This file is no longer used. 
// The application now uses MongoDB with mongoStorage (mongo-storage.ts)
// This file is kept for reference only.

import { 
  users, 
  seats, 
  admins, 
  settings, 
  userLogs,
  type User, 
  type InsertUser,
  type Seat,
  type InsertSeat,
  type Admin,
  type InsertAdmin,
  type Settings,
  type InsertSettings,
  type UserLog,
  type InsertUserLog
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Seat operations
  getSeat(number: number): Promise<Seat | undefined>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  updateSeat(number: number, seat: Partial<InsertSeat>): Promise<Seat | undefined>;
  getAllSeats(): Promise<Seat[]>;
  
  // Admin operations
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  
  // Settings operations
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: InsertSettings): Promise<Settings>;
  
  // User logs operations
  createUserLog(log: InsertUserLog): Promise<UserLog>;
  getUserLogs(userId: string): Promise<UserLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private seats: Map<number, Seat>;
  private admins: Map<number, Admin>;
  private settings: Settings | undefined;
  private userLogs: Map<number, UserLog>;
  private currentUserId: number;
  private currentAdminId: number;
  private currentLogId: number;

  constructor() {
    this.users = new Map();
    this.seats = new Map();
    this.admins = new Map();
    this.userLogs = new Map();
    this.currentUserId = 1;
    this.currentAdminId = 1;
    this.currentLogId = 1;
    
    // Initialize with default admin
    this.admins.set(1, {
      id: 1,
      username: 'Vidhyadham',
      password: '9012vidhya09'
    });
    
    // Initialize with default settings
    this.settings = {
      id: 1,
      slotPricing: {
        'Morning': 1000,
        'Afternoon': 1200,
        'Evening': 1500
      },
      slotTimings: {
        'Morning': '6:00 AM - 12:00 PM',
        'Afternoon': '12:00 PM - 6:00 PM',
        'Evening': '6:00 PM - 12:00 AM'
      },
      emailProvider: 'gmail',
      smtpHost: null,
      smtpPort: null,
      smtpSecure: null,
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
      // Add missing Cloudinary fields
      cloudinaryCloudName: null,
      cloudinaryApiKey: null,
      cloudinaryApiSecret: null
    };
    
    // Initialize 114 seats
    for (let i = 1; i <= 114; i++) {
      this.seats.set(i, {
        number: i,
        status: 'available',
        userId: null
      });
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      registrationDate: new Date(),
      feeStatus: insertUser.feeStatus || 'due',
      idType: insertUser.idType || null,
      idNumber: insertUser.idNumber || null,
      idUpload: insertUser.idUpload || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Seat operations
  async getSeat(number: number): Promise<Seat | undefined> {
    return this.seats.get(number);
  }

  async createSeat(insertSeat: InsertSeat): Promise<Seat> {
    const seat: Seat = { 
      ...insertSeat,
      status: insertSeat.status || 'available',
      userId: insertSeat.userId || null
    };
    this.seats.set(seat.number, seat);
    return seat;
  }

  async updateSeat(number: number, seatData: Partial<InsertSeat>): Promise<Seat | undefined> {
    const seat = this.seats.get(number);
    if (!seat) return undefined;
    
    const updatedSeat = { ...seat, ...seatData };
    this.seats.set(number, updatedSeat);
    return updatedSeat;
  }

  async getAllSeats(): Promise<Seat[]> {
    return Array.from(this.seats.values());
  }

  // Admin operations
  async getAdmin(id: number): Promise<Admin | undefined> {
    return this.admins.get(id);
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    return Array.from(this.admins.values()).find(
      (admin) => admin.username === username,
    );
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const id = this.currentAdminId++;
    const admin: Admin = { ...insertAdmin, id };
    this.admins.set(id, admin);
    return admin;
  }

  // Settings operations
  async getSettings(): Promise<Settings | undefined> {
    return this.settings;
  }

  async updateSettings(settingsData: InsertSettings): Promise<Settings> {
    this.settings = { ...this.settings!, ...settingsData };
    return this.settings;
  }

  // User logs operations
  async createUserLog(insertLog: InsertUserLog): Promise<UserLog> {
    const id = this.currentLogId++;
    const log: UserLog = { 
      ...insertLog, 
      id, 
      timestamp: new Date(),
      action: insertLog.action,
      userId: insertLog.userId,
      adminId: insertLog.adminId || null
    };
    this.userLogs.set(id, log);
    return log;
  }

  async getUserLogs(userId: string): Promise<UserLog[]> {
    return Array.from(this.userLogs.values()).filter(
      (log) => log.userId === userId
    );
  }
}

export const storage = new MemStorage();
