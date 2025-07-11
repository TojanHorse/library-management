import { User, Seat, Settings } from '../types';

class ApiService {
  private baseUrl = '/api'; // Use relative path for same-origin requests
  private retryCount = 3;
  private retryDelay = 1000; // 1 second

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        const headers: Record<string, string> = {};
        
        // Only add Content-Type header if we have a body
        if (options.body) {
          headers['Content-Type'] = 'application/json';
        }

        // Add timeout to request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(url, {
          headers: {
            ...headers,
            ...options.headers,
          },
          signal: controller.signal,
          ...options,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = 'Request failed';
          try {
            const error = await response.json();
            errorMessage = error.message || error.error || `HTTP ${response.status}: ${response.statusText}`;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on client errors (4xx) or abort errors
        if (error instanceof Error && 
            (error.message.includes('HTTP 4') || error.name === 'AbortError')) {
          break;
        }
        
        // Don't retry on the last attempt
        if (attempt === this.retryCount - 1) {
          break;
        }
        
        console.warn(`Request failed (attempt ${attempt + 1}/${this.retryCount}):`, error);
        await this.delay(this.retryDelay * (attempt + 1)); // Exponential backoff
      }
    }

    // Handle specific error types
    if (lastError.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    if (lastError instanceof TypeError || lastError.message.includes('fetch')) {
      throw new Error('Network error - please check your connection');
    }
    
    throw lastError;
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
    const userId = user._id || user.id;
    const response = await this.makeRequest(`${this.baseUrl}/users/${userId}`, {
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

  async testEmail(testEmail?: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/test/email`, {
        method: 'POST',
        body: JSON.stringify({ testEmail: testEmail || 'test@example.com' }),
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