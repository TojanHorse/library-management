import { User, Seat, Settings } from '../types';

class ApiService {
  private baseUrl = '/api'; // Use relative path for same-origin requests

  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Request failed');
    }

    return response;
  }

  async registerUser(userData: Omit<User, 'id' | 'logs'>): Promise<User> {
    const response = await this.makeRequest(`${this.baseUrl}/users`, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    return response.json();
  }

  async loginAdmin(username: string, password: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/admin/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      return false;
    }
  }

  async getUsers(): Promise<User[]> {
    const response = await this.makeRequest(`${this.baseUrl}/users`);
    return response.json();
  }

  async updateUser(user: User): Promise<User> {
    const response = await this.makeRequest(`${this.baseUrl}/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
    
    return response.json();
  }

  async deleteUser(userId: string): Promise<void> {
    await this.makeRequest(`${this.baseUrl}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getSeats(): Promise<Seat[]> {
    const response = await this.makeRequest(`${this.baseUrl}/seats`);
    return response.json();
  }

  async updateSeat(seat: Seat): Promise<Seat> {
    const response = await this.makeRequest(`${this.baseUrl}/seats/${seat.number}`, {
      method: 'PUT',
      body: JSON.stringify(seat),
    });
    
    return response.json();
  }

  async getSettings(): Promise<Settings> {
    const response = await this.makeRequest(`${this.baseUrl}/settings`);
    return response.json();
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    const response = await this.makeRequest(`${this.baseUrl}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    
    return response.json();
  }

  async downloadCsv(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export/csv`);
    
    if (!response.ok) {
      throw new Error('Failed to download CSV');
    }
    
    return response.blob();
  }

  async downloadPdf(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export/pdf`);
    
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }
    
    return response.blob();
  }

  async testEmail(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/test/email`, {
        method: 'POST',
      });
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      return false;
    }
  }

  async testTelegram(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/test/telegram`, {
        method: 'POST',
      });
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      return false;
    }
  }

  async createAdmin(adminData: { username: string; password: string }): Promise<{ id: number; username: string }> {
    const response = await this.makeRequest(`${this.baseUrl}/admin`, {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
    
    return response.json();
  }
}

export const apiService = new ApiService();