import { mongoStorage } from './mongo-storage';

export class SeatManager {
  private static instance: SeatManager;
  private seatLocks: Map<number, { userId: string; timestamp: number }> = new Map();
  private readonly LOCK_TIMEOUT = 30000; // 30 seconds

  static getInstance(): SeatManager {
    if (!SeatManager.instance) {
      SeatManager.instance = new SeatManager();
    }
    return SeatManager.instance;
  }

  private cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [seatNumber, lock] of this.seatLocks.entries()) {
      if (now - lock.timestamp > this.LOCK_TIMEOUT) {
        this.seatLocks.delete(seatNumber);
        console.log(`🔓 Seat ${seatNumber} lock expired and removed`);
      }
    }
  }

  async reserveSeat(seatNumber: number, userId: string, slot: string): Promise<{
    success: boolean;
    message?: string;
    conflictingUser?: string;
  }> {
    this.cleanupExpiredLocks();

    // Check if seat is already locked by another user
    const existingLock = this.seatLocks.get(seatNumber);
    if (existingLock && existingLock.userId !== userId) {
      return {
        success: false,
        message: 'Seat is currently being reserved by another user. Please try again in a moment.',
        conflictingUser: existingLock.userId
      };
    }

    // Lock the seat
    this.seatLocks.set(seatNumber, { userId, timestamp: Date.now() });

    try {
      // Double-check seat availability in database
      const seat = await mongoStorage.getSeat(seatNumber);
      if (!seat) {
        return {
          success: false,
          message: 'Seat not found'
        };
      }

      // Check if seat is available or can be shared (different slot)
      if (seat.status !== 'available' && seat.userId) {
        const occupyingUser = await mongoStorage.getUser(seat.userId.toString());
        if (occupyingUser && occupyingUser.slot === slot) {
          this.seatLocks.delete(seatNumber);
          return {
            success: false,
            message: 'Seat is already occupied by someone with the same slot',
            conflictingUser: occupyingUser.name
          };
        }
      }

      // Reserve the seat
      const updatedSeat = await mongoStorage.updateSeat(seatNumber, {
        status: 'due', // or whatever the appropriate status is
        userId: userId
      });

      if (!updatedSeat) {
        this.seatLocks.delete(seatNumber);
        return {
          success: false,
          message: 'Failed to reserve seat'
        };
      }

      // Keep lock for a bit longer to ensure the user creation completes
      setTimeout(() => {
        this.seatLocks.delete(seatNumber);
      }, 5000);

      return {
        success: true,
        message: 'Seat reserved successfully'
      };

    } catch (error) {
      this.seatLocks.delete(seatNumber);
      console.error('Error reserving seat:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async releaseSeat(seatNumber: number, userId: string): Promise<boolean> {
    try {
      const seat = await mongoStorage.getSeat(seatNumber);
      if (!seat || seat.userId !== userId) {
        return false;
      }

      await mongoStorage.updateSeat(seatNumber, {
        status: 'available',
        userId: null
      });

      this.seatLocks.delete(seatNumber);
      return true;
    } catch (error) {
      console.error('Error releasing seat:', error);
      return false;
    }
  }

  getSeatLockStatus(seatNumber: number): { locked: boolean; userId?: string; timeRemaining?: number } {
    const lock = this.seatLocks.get(seatNumber);
    if (!lock) {
      return { locked: false };
    }

    const timeRemaining = this.LOCK_TIMEOUT - (Date.now() - lock.timestamp);
    if (timeRemaining <= 0) {
      this.seatLocks.delete(seatNumber);
      return { locked: false };
    }

    return {
      locked: true,
      userId: lock.userId,
      timeRemaining
    };
  }

  getAllLocks(): Array<{ seatNumber: number; userId: string; timeRemaining: number }> {
    this.cleanupExpiredLocks();
    const locks = [];
    for (const [seatNumber, lock] of this.seatLocks.entries()) {
      const timeRemaining = this.LOCK_TIMEOUT - (Date.now() - lock.timestamp);
      locks.push({
        seatNumber,
        userId: lock.userId,
        timeRemaining
      });
    }
    return locks;
  }
}

export const seatManager = SeatManager.getInstance();
