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
      gmail: 'upwebmonitor@gmail.com',
      appPassword: 'zfjthyhndoayvgwd',
      telegramChatIds: [],
      welcomeEmailTemplate: `Dear {{name}},

We're thrilled to welcome you to VidhyaDham, your dedicated learning sanctuary where silence, structure, and self-growth go hand-in-hand. Your registration is complete, and your journey of focused study begins now.

📋 Your Registration Details
Field   Information
👤 Name  {{name}}
📧 Email {{email}}
📱 Phone Number  {{phone}}
💺 Seat Number   {{seatNumber}}
⏰ Time Slot     {{slot}}
🆔 ID Type       {{idType}} (optional)
📅 Valid Till    {{validTill}} (30 days)

You will receive a renewal reminder 3 days before your due date. If the payment is not marked by the admin within 3 days after that, your seat will be auto-terminated.

🌱 Make the Most of Your Time Here
"Here at Vidhyadham, we believe in creating not just a space, but an experience — where every hour you spend is a step closer to your goals."

To maintain your membership:

Keep track of your fee status from the dashboard.

Reach out to the admin for any updates or edits to your details.

Remember: your comfort and concentration is our top priority.

🌸 A Thoughtful Blessing Before You Begin
"सरस्वती नमस्तुभ्यं वरदे कामरूपिणि।
विद्यारम्भं करिष्यामि सिद्धिर्भवतु मे सदा॥"

"O Goddess Saraswati, granter of boons and embodiment of knowledge, I begin my learning – may success be mine always."

Thank you for choosing Vidhyadham.
We're honored to be part of your journey.

Warm regards,
Team Vidhyadham
📚 Learn. Focus. Transform.`,
      dueDateEmailTemplate: `Dear {{name}},

We hope your time at VidhyaDham has been peaceful and productive.

This is a gentle reminder that your seat subscription is due for renewal.

🪪 Your Membership Details
Detail  Information
📍 Seat Number   {{seatNumber}}
⏰ Time Slot     {{slot}}
📅 Due Date      {{dueDate}}
🧾 Payment Status        ❗ Pending

🔔 What You Need to Do
To keep your seat active and uninterrupted:

Please contact the admin to complete your renewal process.

Failure to renew within 3 days of this message will result in automatic termination of your seat.

Once renewed, you'll receive confirmation on your registered email.

🌟 Why Renew?
VidhyaDham is more than just a study space. It's a place of:

Focus and discipline

Calm environment for deep work

Dedicated seating based on your chosen schedule

"विद्या धनं सर्वधनप्रधानम्।"
Knowledge is the greatest wealth of all.

Let's continue your journey of learning together.
Warm regards,
Team VidhyaDham
📚 Learn. Focus. Transform.`,
      sendgridApiKey: null
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
      registrationDate: new Date()
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
    const seat: Seat = { ...insertSeat };
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
      timestamp: new Date()
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
