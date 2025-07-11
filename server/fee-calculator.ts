export interface FeeCalculation {
  nextDueDate: Date;
  daysValidFor: number;
  amount: number;
  cycle: 'monthly' | 'partial';
  description: string;
}

export class FeeCalculator {
  private readonly MONTHLY_CYCLE_DAYS = 30;

  /**
   * Calculate next due date based on the complex fee logic:
   * - If paid on day 1, valid till day 30
   * - If paid on day 9 next month, valid for 21 more days (maintaining original cycle)
   */
  calculateNextDueDate(
    lastPaymentDate: Date,
    registrationDate: Date,
    slotPricing: { [key: string]: number },
    slot: string
  ): FeeCalculation {
    const paymentDate = new Date(lastPaymentDate);
    const regDate = new Date(registrationDate);
    
    // Calculate the original cycle start date (registration date)
    const cycleStartDay = regDate.getDate();
    
    // Get the current payment date
    const paymentDay = paymentDate.getDate();
    const paymentMonth = paymentDate.getMonth();
    const paymentYear = paymentDate.getFullYear();
    
    // Calculate days from cycle start
    const daysSinceCycleStart = this.calculateDaysSinceCycleStart(regDate, paymentDate);
    
    // Determine the next due date based on the cycle
    let nextDueDate: Date;
    let daysValidFor: number;
    let cycle: 'monthly' | 'partial';
    let description: string;
    
    if (daysSinceCycleStart % this.MONTHLY_CYCLE_DAYS === 0) {
      // Perfect cycle payment (e.g., paid on day 1 of cycle)
      nextDueDate = new Date(paymentDate);
      nextDueDate.setDate(paymentDate.getDate() + this.MONTHLY_CYCLE_DAYS);
      daysValidFor = this.MONTHLY_CYCLE_DAYS;
      cycle = 'monthly';
      description = 'Full monthly cycle';
    } else {
      // Partial cycle payment
      const daysInCurrentCycle = daysSinceCycleStart % this.MONTHLY_CYCLE_DAYS;
      const remainingDaysInCycle = this.MONTHLY_CYCLE_DAYS - daysInCurrentCycle;
      
      nextDueDate = new Date(paymentDate);
      nextDueDate.setDate(paymentDate.getDate() + remainingDaysInCycle);
      daysValidFor = remainingDaysInCycle;
      cycle = 'partial';
      description = `Partial cycle - ${remainingDaysInCycle} days to complete current cycle`;
    }
    
    const amount = slotPricing[slot] || 0;
    
    return {
      nextDueDate,
      daysValidFor,
      amount,
      cycle,
      description
    };
  }

  /**
   * Calculate days since the original cycle start (registration date)
   */
  private calculateDaysSinceCycleStart(registrationDate: Date, currentDate: Date): number {
    const timeDiff = currentDate.getTime() - registrationDate.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate pro-rated amount for partial payments
   */
  calculateProRatedAmount(
    fullAmount: number,
    daysValidFor: number,
    fullCycleDays: number = this.MONTHLY_CYCLE_DAYS
  ): number {
    return Math.round((fullAmount * daysValidFor) / fullCycleDays);
  }

  /**
   * Determine fee status based on dates
   */
  determineFeeStatus(nextDueDate: Date, currentDate: Date = new Date()): 'paid' | 'due' | 'expired' {
    const now = new Date(currentDate);
    const due = new Date(nextDueDate);
    
    // Reset time to compare only dates
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    if (now < due) {
      return 'paid';
    } else if (now.getTime() === due.getTime()) {
      return 'due';
    } else {
      return 'expired';
    }
  }

  /**
   * Calculate days until due date
   */
  calculateDaysUntilDue(nextDueDate: Date, currentDate: Date = new Date()): number {
    const now = new Date(currentDate);
    const due = new Date(nextDueDate);
    
    // Reset time to compare only dates
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    const timeDiff = due.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate fee history for a user
   */
  generateFeeHistory(
    registrationDate: Date,
    payments: Array<{ date: Date; amount: number }>,
    slotPricing: { [key: string]: number },
    slot: string
  ): Array<{
    period: string;
    amount: number;
    paidDate: Date | null;
    dueDate: Date;
    status: 'paid' | 'due' | 'expired';
    daysValidFor: number;
  }> {
    const history = [];
    let currentDate = new Date(registrationDate);
    let paymentIndex = 0;
    
    for (let i = 0; i < 12; i++) { // Generate 12 months of history
      const calculation = this.calculateNextDueDate(
        currentDate,
        registrationDate,
        slotPricing,
        slot
      );
      
      const payment = payments[paymentIndex];
      const paidDate = payment && payment.date <= calculation.nextDueDate ? payment.date : null;
      
      history.push({
        period: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`,
        amount: calculation.amount,
        paidDate,
        dueDate: calculation.nextDueDate,
        status: paidDate ? 'paid' : this.determineFeeStatus(calculation.nextDueDate),
        daysValidFor: calculation.daysValidFor
      });
      
      if (paidDate) {
        paymentIndex++;
      }
      
      currentDate = new Date(calculation.nextDueDate);
    }
    
    return history;
  }

  /**
   * Calculate total outstanding amount
   */
  calculateOutstandingAmount(
    nextDueDate: Date,
    amount: number,
    currentDate: Date = new Date()
  ): number {
    const status = this.determineFeeStatus(nextDueDate, currentDate);
    return status === 'expired' ? amount : 0;
  }

  /**
   * Get fee calculation summary for display
   */
  getFeeSummary(
    user: any,
    slotPricing: { [key: string]: number }
  ): {
    currentStatus: 'paid' | 'due' | 'expired';
    nextDueDate: Date;
    daysUntilDue: number;
    currentAmount: number;
    outstandingAmount: number;
    description: string;
  } {
    const nextDueDate = new Date(user.nextDueDate || user.registrationDate);
    const currentStatus = this.determineFeeStatus(nextDueDate);
    const daysUntilDue = this.calculateDaysUntilDue(nextDueDate);
    const currentAmount = slotPricing[user.slot] || 0;
    const outstandingAmount = this.calculateOutstandingAmount(nextDueDate, currentAmount);
    
    let description = '';
    if (currentStatus === 'paid') {
      description = `Payment up to date. Next due in ${daysUntilDue} days.`;
    } else if (currentStatus === 'due') {
      description = 'Payment due today.';
    } else {
      description = `Payment overdue by ${Math.abs(daysUntilDue)} days.`;
    }
    
    return {
      currentStatus,
      nextDueDate,
      daysUntilDue,
      currentAmount,
      outstandingAmount,
      description
    };
  }
}

export const feeCalculator = new FeeCalculator();
