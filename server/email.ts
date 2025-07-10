import sgMail from '@sendgrid/mail';

interface EmailTemplateData {
  name: string;
  email: string;
  phone: string;
  address: string;
  seatNumber: number;
  slot: string;
  idType?: string;
  validTill?: string;
  dueDate?: string;
}

export class EmailService {
  private apiKey: string | null = null;
  private fromEmail: string = 'noreply@vidhyadham.com';

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    sgMail.setApiKey(apiKey);
  }

  private replaceTemplateVariables(template: string, data: EmailTemplateData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key as keyof EmailTemplateData]?.toString() || match;
    });
  }

  async sendWelcomeEmail(
    userEmail: string,
    templateData: EmailTemplateData,
    template: string
  ): Promise<boolean> {
    try {
      if (!this.apiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const emailContent = this.replaceTemplateVariables(template, templateData);

      const msg = {
        to: userEmail,
        from: this.fromEmail,
        subject: 'Welcome to VidhyaDham - Registration Confirmed',
        text: emailContent,
        html: emailContent.replace(/\n/g, '<br>'),
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  async sendDueDateReminder(
    userEmail: string,
    templateData: EmailTemplateData,
    template: string
  ): Promise<boolean> {
    try {
      if (!this.apiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const emailContent = this.replaceTemplateVariables(template, templateData);

      const msg = {
        to: userEmail,
        from: this.fromEmail,
        subject: 'VidhyaDham - Payment Due Reminder',
        text: emailContent,
        html: emailContent.replace(/\n/g, '<br>'),
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Failed to send due date reminder:', error);
      return false;
    }
  }

  async testEmail(testEmail: string): Promise<boolean> {
    try {
      if (!this.apiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const msg = {
        to: testEmail,
        from: this.fromEmail,
        subject: 'VidhyaDham - Email Test',
        text: 'This is a test email from VidhyaDham seat management system.',
        html: '<p>This is a test email from VidhyaDham seat management system.</p>',
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Email test failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();