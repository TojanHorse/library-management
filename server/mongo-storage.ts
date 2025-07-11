import bcrypt from 'bcryptjs';
import { database } from './database';
import { 
  User, 
  Seat, 
  Admin, 
  Settings, 
  UserLog,
  type IUser,
  type ISeat,
  type IAdmin,
  type ISettings,
  type IUserLog
} from '../shared/mongoose-schema';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<IUser | null>;
  getUserByEmail(email: string): Promise<IUser | null>;
  createUser(user: Partial<IUser>): Promise<IUser>;
  updateUser(id: string, user: Partial<IUser>): Promise<IUser | null>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<IUser[]>;
  getActiveUsers(): Promise<IUser[]>;
  getLeftUsers(): Promise<IUser[]>;
  markUserAsLeft(id: string): Promise<IUser | null>;
  reactivateUser(id: string, newSeatNumber: number): Promise<IUser | null>;
  
  // Seat operations
  getSeat(number: number): Promise<ISeat | null>;
  createSeat(seat: Partial<ISeat>): Promise<ISeat>;
  updateSeat(number: number, seat: Partial<ISeat>): Promise<ISeat | null>;
  getAllSeats(): Promise<ISeat[]>;
  
  // Admin operations
  getAdmin(id: string): Promise<IAdmin | null>;
  getAdminByUsername(username: string): Promise<IAdmin | null>;
  createAdmin(admin: Partial<IAdmin>): Promise<IAdmin>;
  loginAdmin(username: string, password: string): Promise<IAdmin | null>;
  
  // Settings operations
  getSettings(): Promise<ISettings | null>;
  updateSettings(settings: Partial<ISettings>): Promise<ISettings>;
  
  // User logs operations
  createUserLog(log: Partial<IUserLog>): Promise<IUserLog>;
  getUserLogs(userId: string): Promise<IUserLog[]>;
}

export class MongoStorage implements IStorage {
  
  // Helper method to ensure database connection
  private async ensureConnection(): Promise<boolean> {
    if (!database.isConnectedToDatabase()) {
      console.log('Database not connected, attempting to reconnect...');
      try {
        await database.connect();
        return true;
      } catch (error) {
        console.error('Failed to reconnect to database:', error);
        return false;
      }
    }
    return true;
  }
  
  // User operations
  async getUser(id: string): Promise<IUser | null> {
    try {
      if (!(await this.ensureConnection())) {
        console.error('Database not available for getUser operation');
        return null;
      }
      
      const user = await User.findById(id).lean();
      return user ? { ...user, _id: user._id.toString() } as IUser : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ email }).lean();
      return user ? { ...user, _id: user._id.toString() } as IUser : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async createUser(userData: Partial<IUser>): Promise<IUser> {
    try {
      const user = new User(userData);
      await user.save();
      const userObj = user.toObject();
      return { ...userObj, _id: userObj._id.toString() } as IUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<IUser>): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(id, userData, { new: true }).lean();
      return user ? { ...user, _id: user._id.toString() } as IUser : null;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getAllUsers(): Promise<IUser[]> {
    try {
      if (!(await this.ensureConnection())) {
        console.error('Database not available for getAllUsers operation');
        return [];
      }
      
      const users = await User.find().lean();
      return users.map(user => ({ ...user, _id: user._id.toString() })) as IUser[];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getActiveUsers(): Promise<IUser[]> {
    try {
      if (!(await this.ensureConnection())) {
        console.error('Database not available for getActiveUsers operation');
        return [];
      }
      
      const users = await User.find({ status: 'active' }).lean();
      return users.map(user => ({ ...user, _id: user._id.toString() })) as IUser[];
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  async getLeftUsers(): Promise<IUser[]> {
    try {
      const users = await User.find({ status: 'left' }).lean();
      return users.map(user => ({ ...user, _id: user._id.toString() })) as IUser[];
    } catch (error) {
      console.error('Error getting left users:', error);
      return [];
    }
  }

  async markUserAsLeft(id: string): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        id, 
        { status: 'left', leftDate: new Date() }, 
        { new: true }
      ).lean();
      return user ? { ...user, _id: user._id.toString() } as IUser : null;
    } catch (error) {
      console.error('Error marking user as left:', error);
      return null;
    }
  }

  async reactivateUser(id: string, newSeatNumber: number): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        id, 
        { 
          status: 'active', 
          leftDate: null,
          seatNumber: newSeatNumber,
          feeStatus: 'due',
          registrationDate: new Date() // Reset registration date to current date
        }, 
        { new: true }
      ).lean();
      return user ? { ...user, _id: user._id.toString() } as IUser : null;
    } catch (error) {
      console.error('Error reactivating user:', error);
      return null;
    }
  }

  // Seat operations
  async getSeat(number: number): Promise<ISeat | null> {
    try {
      const seat = await Seat.findOne({ number }).lean();
      return seat ? { ...seat, _id: seat._id.toString() } as ISeat : null;
    } catch (error) {
      console.error('Error getting seat:', error);
      return null;
    }
  }

  async createSeat(seatData: Partial<ISeat>): Promise<ISeat> {
    try {
      const seat = new Seat(seatData);
      await seat.save();
      const seatObj = seat.toObject();
      return { ...seatObj, _id: seatObj._id.toString() } as ISeat;
    } catch (error) {
      console.error('Error creating seat:', error);
      throw error;
    }
  }

  async updateSeat(number: number, seatData: Partial<ISeat>): Promise<ISeat | null> {
    try {
      const seat = await Seat.findOneAndUpdate({ number }, seatData, { new: true }).lean();
      return seat ? { ...seat, _id: seat._id.toString() } as ISeat : null;
    } catch (error) {
      console.error('Error updating seat:', error);
      return null;
    }
  }

  async getAllSeats(): Promise<ISeat[]> {
    try {
      const seats = await Seat.find().sort({ number: 1 }).lean();
      return seats.map(seat => ({ ...seat, _id: seat._id.toString() })) as ISeat[];
    } catch (error) {
      console.error('Error getting all seats:', error);
      return [];
    }
  }

  // Admin operations
  async getAdmin(id: string): Promise<IAdmin | null> {
    try {
      const admin = await Admin.findById(id).lean();
      return admin ? { ...admin, _id: admin._id.toString() } as IAdmin : null;
    } catch (error) {
      console.error('Error getting admin:', error);
      return null;
    }
  }

  async getAdminByUsername(username: string): Promise<IAdmin | null> {
    try {
      const admin = await Admin.findOne({ username }).lean();
      return admin ? { ...admin, _id: admin._id.toString() } as IAdmin : null;
    } catch (error) {
      console.error('Error getting admin by username:', error);
      return null;
    }
  }

  async createAdmin(adminData: Partial<IAdmin>): Promise<IAdmin> {
    try {
      if (adminData.password) {
        adminData.password = await bcrypt.hash(adminData.password, 10);
      }
      const admin = new Admin(adminData);
      await admin.save();
      const adminObj = admin.toObject();
      return { ...adminObj, _id: adminObj._id.toString() } as IAdmin;
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  }

  async loginAdmin(username: string, password: string): Promise<IAdmin | null> {
    try {
      const admin = await Admin.findOne({ username });
      if (!admin) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return null;
      }

      const adminObj = admin.toObject();
      return { ...adminObj, _id: adminObj._id.toString() } as IAdmin;
    } catch (error) {
      console.error('Error logging in admin:', error);
      return null;
    }
  }

  // Settings operations
  async getSettings(): Promise<ISettings | null> {
    try {
      if (!(await this.ensureConnection())) {
        console.error('Database not available for getSettings operation');
        return null;
      }
      
      const settings = await Settings.findOne().lean();
      return settings ? { ...settings, _id: settings._id.toString() } as ISettings : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  }

  async updateSettings(settingsData: Partial<ISettings>): Promise<ISettings> {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings(settingsData);
        await settings.save();
      } else {
        Object.assign(settings, settingsData);
        await settings.save();
      }
      const settingsObj = settings.toObject();
      return { ...settingsObj, _id: settingsObj._id.toString() } as ISettings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // User logs operations
  async createUserLog(logData: Partial<IUserLog>): Promise<IUserLog> {
    try {
      const log = new UserLog(logData);
      await log.save();
      const logObj = log.toObject();
      return { ...logObj, _id: logObj._id.toString() } as IUserLog;
    } catch (error) {
      console.error('Error creating user log:', error);
      throw error;
    }
  }

  async getUserLogs(userId: string): Promise<IUserLog[]> {
    try {
      const logs = await UserLog.find({ userId }).sort({ timestamp: -1 }).lean();
      return logs.map(log => ({ ...log, _id: log._id.toString() })) as IUserLog[];
    } catch (error) {
      console.error('Error getting user logs:', error);
      return [];
    }
  }
}

export const mongoStorage = new MongoStorage();
