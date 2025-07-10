import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string = '';
  private config: SMTPConfig | null = null;

  configure(smtpConfig: SMTPConfig, fromEmail: string) {
    console.log('Configuring email service with SMTP:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.auth.user,
      fromEmail
    });

    this.config = smtpConfig;
    this.fromEmail = fromEmail;

    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.auth.user,
        pass: smtpConfig.auth.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  isConfigured(): boolean {
    const configured = this.transporter !== null && this.fromEmail !== '';
    console.log('Email service configured:', configured);
    return configured;
  }

  getConfiguration(): { hasTransporter: boolean; fromEmail: string; host?: string } {
    return {
      hasTransporter: this.transporter !== null,
      fromEmail: this.fromEmail,
      host: this.config?.host
    };
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
  ): Promise<{success: boolean; error?: string}> {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      const emailContent = this.replaceTemplateVariables(template, templateData);

      const mailOptions = {
        from: this.fromEmail,
        to: userEmail,
        subject: 'Welcome to VidhyaDham - Registration Confirmed',
        text: emailContent,
        html: emailContent.replace(/\n/g, '<br>'),
      };

      console.log('Sending welcome email to:', userEmail);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', info.messageId);
      
      return {success: true};
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendDueDateReminder(
    userEmail: string,
    templateData: EmailTemplateData,
    template: string
  ): Promise<{success: boolean; error?: string}> {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      const emailContent = this.replaceTemplateVariables(template, templateData);

      const mailOptions = {
        from: this.fromEmail,
        to: userEmail,
        subject: 'VidhyaDham - Payment Due Reminder',
        text: emailContent,
        html: emailContent.replace(/\n/g, '<br>'),
      };

      console.log('Sending due date reminder to:', userEmail);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Due date reminder sent:', info.messageId);
      
      return {success: true};
    } catch (error) {
      console.error('Failed to send due date reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testEmail(testEmail: string): Promise<{success: boolean; error?: string}> {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: this.fromEmail,
        to: testEmail,
        subject: 'VidhyaDham - Email Test',
        text: 'This is a test email from VidhyaDham seat management system. If you received this, email configuration is working correctly!',
        html: '<p>This is a test email from VidhyaDham seat management system.</p><p><strong>If you received this, email configuration is working correctly!</strong></p>',
      };

      console.log('Sending test email to:', testEmail);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Test email sent successfully:', info.messageId);
      
      return {success: true};
    } catch (error) {
      console.error('Email test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Verify SMTP configuration
  async verifyConnection(): Promise<{success: boolean; error?: string}> {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      console.log('Verifying SMTP connection...');
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
      
      return {success: true};
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper method to create Gmail configuration with app password
  static createGmailConfig(email: string, appPassword: string): SMTPConfig {
    return {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: email,
        pass: appPassword  // This should be Gmail App Password, not regular password
      }
    };
  }

  // Helper method to create Outlook/Hotmail configuration
  static createOutlookConfig(email: string, password: string): SMTPConfig {
    return {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: email,
        pass: password
      }
    };
  }

  // Helper method to create custom SMTP configuration
  static createCustomConfig(
    host: string, 
    port: number, 
    secure: boolean, 
    email: string, 
    password: string
  ): SMTPConfig {
    return {
      host,
      port,
      secure,
      auth: {
        user: email,
        pass: password
      }
    };
  }
}

export const emailService = new EmailService();
