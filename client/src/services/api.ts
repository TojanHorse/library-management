import { User, Seat, Settings } from '../types';

// Mock API service - replace with actual backend calls
class ApiService {
  private baseUrl = 'https://your-backend-url.replit.app/api';

  async registerUser(userData: Omit<User, 'id' | 'logs'>): Promise<User> {
    // Mock implementation
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      logs: [{
        id: Date.now().toString(),
        action: 'User registered',
        timestamp: new Date().toISOString()
      }]
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return newUser;
  }

  async loginAdmin(username: string, password: string): Promise<boolean> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return username === 'Vidhyadham' && password === '9012vidhya09';
  }

  async getUsers(): Promise<User[]> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return [];
  }

  async updateUser(user: User): Promise<User> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async getSeats(): Promise<Seat[]> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return Array.from({ length: 114 }, (_, i) => ({
      number: i + 1,
      status: 'available'
    }));
  }

  async updateSeat(seat: Seat): Promise<Seat> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return seat;
  }

  async getSettings(): Promise<Settings> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      slotPricing: {
        'Morning': 1000,
        'Afternoon': 1200,
        'Evening': 1500
      },
      gmail: 'upwebmonitor@gmail.com',
      appPassword: 'zfjthyhndoayvgwd',
      telegramChatIds: []
    };
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return settings;
  }

  async downloadCsv(): Promise<Blob> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    return new Blob(['mock csv data'], { type: 'text/csv' });
  }

  async downloadPdf(): Promise<Blob> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 2000));
    return new Blob(['mock pdf data'], { type: 'application/pdf' });
  }

  async testEmail(): Promise<boolean> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  async testTelegram(): Promise<boolean> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }
}

export const apiService = new ApiService();