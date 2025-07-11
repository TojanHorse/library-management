import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { mongoStorage } from "./mongo-storage";
import { emailService, EmailService } from "./email-service";
import { dueDateScheduler } from "./scheduler";
import { webhookScheduler } from "./webhook-scheduler";
import { cloudinaryService, upload } from "./cloudinary";
import { telegramService } from "./telegram-service";
import { feeCalculator } from "./fee-calculator";
import { requireAuth, optionalAuth, AuthenticatedRequest } from "./auth-middleware";
import { healthCheckService } from "./health-check";
import { serviceManager } from "./service-manager";
import { asyncHandler, ApiError } from "./middleware/error-handler";
import { z } from "zod";

// Utility function to sanitize settings data before sending to client
function sanitizeSettings(settings: any) {
  if (!settings) return null;
  
  // Remove sensitive fields that should never be sent to client
  const {
    emailPassword,
    cloudinaryApiSecret,
    cloudinaryApiKey,
    telegramBotToken,
    ...sanitizedSettings
  } = settings;
  
  // Add flags to indicate if sensitive data exists
  return {
    ...sanitizedSettings,
    hasEmailPassword: !!emailPassword,
    hasCloudinaryApiSecret: !!cloudinaryApiSecret,
    hasCloudinaryApiKey: !!cloudinaryApiKey,
    hasTelegramBotToken: !!telegramBotToken
  };
}

// Updated validation schemas for MongoDB
const insertUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number must be at least 6 characters"),
  address: z.string().min(1, "Address is required"),
  seatNumber: z.number().min(1).max(114),
  slot: z.enum(["Morning", "Afternoon", "Evening", "12Hour", "24Hour"]),
  feeStatus: z.enum(["paid", "due", "expired"]).default("due"),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  idUpload: z.string().optional()
});

const insertAdminSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).transform(val => val || undefined),
  role: z.enum(["admin", "super-admin"]).default("admin")
});

const insertSettingsSchema = z.object({
  slotPricing: z.object({
    Morning: z.number().min(0),
    Afternoon: z.number().min(0),
    Evening: z.number().min(0),
    '12Hour': z.number().min(0).optional(),
    '24Hour': z.number().min(0).optional()
  }),
  slotTimings: z.object({
    Morning: z.string(),
    Afternoon: z.string(),
    Evening: z.string(),
    '12Hour': z.string().optional(),
    '24Hour': z.string().optional()
  }),
  emailProvider: z.enum(["gmail", "outlook", "custom"]).default("gmail"),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpSecure: z.boolean().optional(),
  emailUser: z.string().email("Invalid email address"),
  emailPassword: z.string().min(1, "Email password is required"),
  telegramChatIds: z.array(z.string()).default([]),
  telegramBots: z.array(z.object({
    nickname: z.string(),
    botToken: z.string(),
    chatIds: z.array(z.string()).default([]),
    enabled: z.boolean().default(true),
    notifications: z.object({
      newUser: z.boolean().default(true),
      feeDue: z.boolean().default(true),
      feeOverdue: z.boolean().default(true),
      feePaid: z.boolean().default(true)
    }),
    settings: z.object({
      sendSilently: z.boolean().default(false),
      protectContent: z.boolean().default(false),
      threadId: z.string().nullable().default(null),
      serverUrl: z.string().default('https://api.telegram.org')
    })
  })).default([]),
  welcomeEmailTemplate: z.string().min(1, "Welcome email template is required"),
  dueDateEmailTemplate: z.string().min(1, "Due date email template is required"),
  paymentConfirmationEmailTemplate: z.string().min(1, "Payment confirmation email template is required"),
  cloudinaryCloudName: z.string().optional(),
  cloudinaryApiKey: z.string().optional(),
  cloudinaryApiSecret: z.string().optional()
});

// Update schemas for validation - pick only the fields that can be updated
const updateUserSchema = insertUserSchema.partial().omit({ feeStatus: true }).extend({
  logs: z.array(z.object({
    id: z.string(),
    action: z.string(),
    timestamp: z.string(),
    adminId: z.string().optional()
  })).optional(),
  _id: z.string().optional(),
  id: z.string().optional(),
  registrationDate: z.string().optional(),
  nextDueDate: z.string().optional(),
  lastPaymentDate: z.string().optional()
});

const updateSeatSchema = z.object({
  status: z.enum(["available", "occupied", "paid", "due", "expired"]).optional(),
  userId: z.string().optional()
});

const updateSettingsSchema = insertSettingsSchema.partial().extend({
  // Make email fields optional for updates
  emailUser: z.string().email("Invalid email address").optional(),
  emailPassword: z.string().optional(),
  gmail: z.string().email("Invalid email address").optional(),
  appPassword: z.string().optional(),
  emailProvider: z.enum(["gmail", "outlook", "custom"]).optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpSecure: z.boolean().optional(),
  telegramBotToken: z.string().optional(),
  telegramFriendlyName: z.string().optional(),
  telegramServerUrl: z.string().optional(),
  telegramThreadId: z.string().optional(),
  telegramSendSilently: z.boolean().optional(),
  telegramProtectContent: z.boolean().optional(),
  telegramCustomTemplate: z.boolean().optional(),
  telegramDefaultEnabled: z.boolean().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply authentication middleware to all API routes except login
  app.use('/api', (req, res, next) => {
    // Skip auth for login, register, test endpoints, webhook endpoints, and upload endpoints
    if (req.path === '/admin/login' || req.path === '/admin/register' || req.path === '/admin/me' || req.path.startsWith('/test/') || req.path.startsWith('/webhook/') || req.path === '/health' || req.path.startsWith('/upload/')) {
      return next();
    }
    return requireAuth(req as AuthenticatedRequest, res, next);
  });
  
  // Admin authentication routes
  // Admin registration route (for initial setup)
  app.post("/api/admin/register", async (req: Request, res: Response) => {
    try {
      const adminData = insertAdminSchema.parse(req.body);
      
      // Check if any admin already exists by trying to find one
      try {
        const { Admin } = await import('../shared/mongoose-schema');
        const existingAdmin = await Admin.findOne();
        if (existingAdmin) {
          return res.status(400).json({ message: "Admin already exists. Use login instead." });
        }
      } catch (dbError) {
        console.log('No existing admin found, proceeding with registration');
      }
      
      const admin = await mongoStorage.createAdmin(adminData);
      res.json({ 
        message: "Admin registered successfully",
        admin: { id: admin._id, username: admin.username }
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid admin data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/login", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const admin = await mongoStorage.loginAdmin(username, password);
      
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store in session
      req.session.adminId = admin._id?.toString();
      req.session.username = admin.username;
      
      res.json({ 
        success: true, 
        adminId: admin._id, 
        username: admin.username,
        message: "Login successful"
      });
    } catch (error) {
      console.error('Error in admin login:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/logout", async (req: AuthenticatedRequest, res: Response) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).json({ message: "Error logging out" });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Logged out successfully" });
      });
    } catch (error) {
      console.error('Error in admin logout:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/me", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.session.adminId || !req.session.username) {
        return res.status(401).json({ 
          isAuthenticated: false,
          message: "Not authenticated" 
        });
      }

      res.json({
        isAuthenticated: true,
        adminId: req.session.adminId,
        username: req.session.username
      });
    } catch (error) {
      console.error('Error checking authentication:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change admin password
  app.post("/api/admin/change-password", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.session.adminId) {
        return res.status(401).json({ 
          success: false, 
          message: "Not authenticated" 
        });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "Current password and new password are required" 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          success: false, 
          message: "New password must be at least 6 characters long" 
        });
      }

      // Get current admin
      const admin = await mongoStorage.getAdmin(req.session.adminId);
      if (!admin) {
        return res.status(404).json({ 
          success: false, 
          message: "Admin not found" 
        });
      }

      // Verify current password
      const bcrypt = await import('bcryptjs');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          success: false, 
          message: "Current password is incorrect" 
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password using direct MongoDB update since we don't have updateAdmin method
      const { Admin } = await import('../shared/mongoose-schema');
      await Admin.findByIdAndUpdate(req.session.adminId, {
        password: hashedNewPassword
      });

      // Log the password change
      await mongoStorage.createUserLog({
        userId: req.session.adminId,
        action: 'Admin password changed',
        adminId: req.session.adminId
      });

      res.json({ 
        success: true, 
        message: "Password changed successfully" 
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to change password: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });

  app.post("/api/admin", async (req: Request, res: Response) => {
    try {
      const adminData = insertAdminSchema.parse(req.body);
      
      // Check if admin already exists
      const existingAdmin = await mongoStorage.getAdminByUsername(adminData.username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Admin username already exists" });
      }
      
      // Handle email - provide default if not provided or empty
      const adminWithEmail = {
        ...adminData,
        email: adminData.email && adminData.email.trim() !== "" ? adminData.email : `${adminData.username}@vidhyadham.local`
      };
      
      const admin = await mongoStorage.createAdmin(adminWithEmail);
      res.json({ id: admin._id, username: admin.username });
    } catch (error) {
      console.error('Error creating admin:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid admin data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // User routes
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      let users;
      
      if (status === 'active') {
        users = await mongoStorage.getActiveUsers();
      } else if (status === 'left') {
        users = await mongoStorage.getLeftUsers();
      } else {
        users = await mongoStorage.getAllUsers();
      }
      
      // Include user logs for each user
      const usersWithLogs = await Promise.all(
        users.map(async (user) => {
          const logs = await mongoStorage.getUserLogs(user._id ? user._id.toString() : '');
          return { ...user, logs };
        })
      );
      
      res.json(usersWithLogs);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if seat is available
      const seat = await mongoStorage.getSeat(userData.seatNumber);
      if (!seat || seat.status !== 'available') {
        return res.status(400).json({ message: "Seat is not available" });
      }
      
      // Check if email already exists
      const existingUser = await mongoStorage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Create user
      const user = await mongoStorage.createUser(userData);
      
      // Update seat status - real-time connection between user and seat
      await mongoStorage.updateSeat(userData.seatNumber, {
        status: userData.feeStatus,
        userId: user._id ? user._id.toString() : ''
      });
      
      // Create user log
      await mongoStorage.createUserLog({
        userId: user._id ? user._id.toString() : '',
        action: "User registered",
        adminId: undefined
      });
      
      // Send welcome email
      try {
        const settings = await mongoStorage.getSettings();
        console.log('User registration - checking email settings:', {
          hasEmailUser: !!settings?.emailUser,
          hasEmailPassword: !!settings?.emailPassword,
          hasWelcomeTemplate: !!settings?.welcomeEmailTemplate,
          emailUser: settings?.emailUser
        });
        
        if (settings?.emailUser && settings?.emailPassword && settings?.welcomeEmailTemplate) {
          // Configure email service based on provider
          let smtpConfig;
          if (settings.emailProvider === 'gmail') {
            smtpConfig = EmailService.createGmailConfig(settings.emailUser, settings.emailPassword);
          } else if (settings.emailProvider === 'outlook') {
            smtpConfig = EmailService.createOutlookConfig(settings.emailUser, settings.emailPassword);
          } else if (settings.emailProvider === 'custom' && settings.smtpHost && typeof settings.smtpPort === 'number' && typeof settings.smtpSecure === 'boolean') {
            smtpConfig = {
              host: settings.smtpHost,
              port: settings.smtpPort,
              secure: settings.smtpSecure,
              auth: {
                user: settings.emailUser,
                pass: settings.emailPassword
              }
            };
          }

          if (smtpConfig) {
            emailService.configure(smtpConfig, settings.emailUser);
          
            const validTill = new Date();
            validTill.setDate(validTill.getDate() + 30);
            
            const emailData = {
              name: user.name,
              email: user.email,
              phone: user.phone,
              address: user.address,
              seatNumber: user.seatNumber,
              slot: user.slot,
              idType: user.idType || 'Not provided',
              validTill: validTill.toLocaleDateString('en-IN')
            };
            
            const emailResult = await emailService.sendWelcomeEmail(
              user.email,
              emailData,
              settings.welcomeEmailTemplate
            );
            
            // Log email sent
            await mongoStorage.createUserLog({
              userId: user._id ? user._id.toString() : '',
              action: emailResult.success ? "Welcome email sent" : `Welcome email failed: ${emailResult.error}`,
              adminId: undefined
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }
      
      // Send Telegram notification for new user
      try {
        await telegramService.sendNewUserNotification({
          name: user.name,
          email: user.email,
          phone: user.phone,
          seatNumber: user.seatNumber,
          slot: user.slot
        });
        
        await mongoStorage.createUserLog({
          userId: user._id ? user._id.toString() : '',
          action: "Telegram notification sent for new user",
          adminId: undefined
        });
      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
        // Don't fail registration if Telegram fails
      }
      
      const logs = await mongoStorage.getUserLogs(user._id ? user._id.toString() : '');
      res.json({ ...user, logs });
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid user data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      
      // Validate input data
      try {
        var validatedData = updateUserSchema.parse(req.body);
      } catch (validationError) {
        console.error('Validation error:', validationError);
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: validationError instanceof Error ? validationError.message : 'Validation failed' 
        });
      }
      
      // Additional security: prevent elevation of privileges
      if ('role' in req.body || 'feeStatus' in req.body) {
        return res.status(403).json({ message: "Cannot modify restricted fields" });
      }
      
      // Get original user data first
      const originalUser = await mongoStorage.getUser(userId);
      if (!originalUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = await mongoStorage.updateUser(userId, validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Real-time seat updates - if seat number changed
      if (validatedData.seatNumber && validatedData.seatNumber !== originalUser.seatNumber) {
        try {
          // Check if new seat is available
          const newSeat = await mongoStorage.getSeat(validatedData.seatNumber);
          if (!newSeat || (newSeat.status !== 'available' && newSeat.userId !== (user._id ? user._id.toString() : ''))) {
            throw new Error("New seat is not available");
          }
          
          // Free old seat
          await mongoStorage.updateSeat(originalUser.seatNumber, {
            status: 'available',
            userId: null
          });
          
          // Assign new seat
          await mongoStorage.updateSeat(validatedData.seatNumber, {
            status: user.feeStatus,
            userId: user._id ? user._id.toString() : ''
          });
          
          // Log seat change
          await mongoStorage.createUserLog({
            userId: user._id ? user._id.toString() : '',
            action: `Seat changed from ${originalUser.seatNumber} to ${validatedData.seatNumber}`,
            adminId: req.body.adminId
          });
        } catch (seatError) {
          console.error('Seat update error:', seatError);
          return res.status(400).json({ message: "Failed to update seat assignment" });
        }
      }
      
      // Real-time fee status updates
      if (validatedData.feeStatus && validatedData.feeStatus !== originalUser.feeStatus) {
        try {
          await mongoStorage.updateSeat(user.seatNumber, {
            status: validatedData.feeStatus,
            userId: user._id ? user._id.toString() : ''
          });
          
          // Log fee status change
          await mongoStorage.createUserLog({
            userId: user._id ? user._id.toString() : '',
            action: `Fee status changed from ${originalUser.feeStatus} to ${validatedData.feeStatus}`,
            adminId: req.body.adminId
          });
        } catch (feeError) {
          console.error('Fee status update error:', feeError);
        }
      }
      
      // Create general user log
      const changedFields = Object.keys(validatedData).filter(key => 
        validatedData[key] !== originalUser[key as keyof typeof originalUser]
      );
      
      if (changedFields.length > 0) {
        await mongoStorage.createUserLog({
          userId: user._id ? user._id.toString() : '',
          action: `User updated: ${changedFields.join(', ')}`,
          adminId: req.body.adminId
        });
        
        // Send Telegram notification for user update
        try {
          await telegramService.sendUserUpdatedNotification({
            name: user.name,
            email: user.email,
            seatNumber: user.seatNumber,
            slot: user.slot
          });
        } catch (telegramError) {
          console.error('Failed to send Telegram notification for user update:', telegramError);
        }
      }
      
      const logs = await mongoStorage.getUserLogs(user._id ? user._id.toString() : '');
      res.json({ ...user, logs });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark user as left
  app.put("/api/users/:id/left", async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      
      // Get original user data first
      const originalUser = await mongoStorage.getUser(userId);
      if (!originalUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (originalUser.status === 'left') {
        return res.status(400).json({ message: "User is already marked as left" });
      }
      
      // Mark user as left
      const user = await mongoStorage.markUserAsLeft(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Free up the seat
      await mongoStorage.updateSeat(originalUser.seatNumber, {
        status: 'available',
        userId: null
      });
      
      // Log the action
      await mongoStorage.createUserLog({
        userId: user._id ? user._id.toString() : '',
        action: `User marked as left, seat ${originalUser.seatNumber} freed`,
        adminId: req.body.adminId
      });
      
      // Send Telegram notification
      try {
        await telegramService.sendNotification(
          `📤 User Left\n\nName: ${user.name}\nSeat: ${originalUser.seatNumber}\nSlot: ${user.slot}\nLeft on: ${new Date().toLocaleDateString()}`,
          'newUser'
        );
      } catch (telegramError) {
        console.error('Failed to send Telegram notification for user left:', telegramError);
      }
      
      const logs = await mongoStorage.getUserLogs(user._id ? user._id.toString() : '');
      res.json({ ...user, logs });
    } catch (error) {
      console.error('Error marking user as left:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reactivate user who has left
  app.put("/api/users/:id/reactivate", async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const { seatNumber } = req.body;
      
      if (!seatNumber) {
        return res.status(400).json({ message: "Seat number is required for reactivation" });
      }
      
      // Get original user data first
      const originalUser = await mongoStorage.getUser(userId);
      if (!originalUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (originalUser.status === 'active') {
        return res.status(400).json({ message: "User is already active" });
      }
      
      // Check if the requested seat is available
      const requestedSeat = await mongoStorage.getSeat(seatNumber);
      if (!requestedSeat) {
        return res.status(404).json({ message: "Seat not found" });
      }
      
      if (requestedSeat.status !== 'available') {
        return res.status(400).json({ message: "Seat is not available" });
      }
      
      // Reactivate the user
      const user = await mongoStorage.reactivateUser(userId, seatNumber);
      if (!user) {
        return res.status(404).json({ message: "Failed to reactivate user" });
      }
      
      // Assign the seat to the user
      await mongoStorage.updateSeat(seatNumber, {
        status: 'due',
        userId: user._id ? user._id.toString() : ''
      });
      
      // Log the reactivation
      await mongoStorage.createUserLog({
        userId: user._id ? user._id.toString() : '',
        action: `User reactivated and assigned seat ${seatNumber}. Registration date reset to ${new Date().toLocaleDateString()}`,
        adminId: req.body.adminId
      });
      
      // Send Telegram notification
      try {
        await telegramService.sendNotification(
          `🔄 User Reactivated\n\nName: ${user.name}\nEmail: ${user.email}\nNew Seat: ${seatNumber}\nSlot: ${user.slot}\nReactivated on: ${new Date().toLocaleDateString()}\n\nFee Status: Due (30 days from today)`,
          'newUser'
        );
      } catch (telegramError) {
        console.error('Failed to send Telegram notification for user reactivation:', telegramError);
      }
      
      // Send welcome back email
      try {
        const settings = await mongoStorage.getSettings();
        if (settings?.emailUser && settings?.emailPassword) {
          const welcomeBackTemplate = `Dear ${user.name},

Welcome back to VidhyaDham! We're delighted to have you rejoin our learning community.

Your Membership Details:
- Name: ${user.name}
- Email: ${user.email}
- Phone: ${user.phone}
- New Seat Number: ${seatNumber}
- Time Slot: ${user.slot}
- Reactivation Date: ${new Date().toLocaleDateString()}
- Fee Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()} (30 days from today)

Your previous membership has been reactivated and your fee cycle has been reset from today's date.

Thank you for choosing VidhyaDham again for your studies.

Best regards,
Team VidhyaDham`;

          await serviceManager.sendEmailWithFallback(
            user.email,
            'Welcome Back to VidhyaDham! 🎉',
            welcomeBackTemplate
          );
        }
      } catch (emailError) {
        console.error('Failed to send welcome back email:', emailError);
      }
      
      const logs = await mongoStorage.getUserLogs(user._id ? user._id.toString() : '');
      res.json({ ...user, logs });
    } catch (error) {
      console.error('Error reactivating user:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      
      const user = await mongoStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Real-time seat release
      try {
        await mongoStorage.updateSeat(user.seatNumber, {
          status: 'available',
          userId: null
        });
      } catch (seatError) {
        console.error('Error freeing seat:', seatError);
      }
      
      // Log user deletion
      try {
        await mongoStorage.createUserLog({
          userId: user._id ? user._id.toString() : '',
          action: `User deleted by admin - Seat ${user.seatNumber} freed`,
          adminId: req.body.adminId
        });
      } catch (logError) {
        console.error('Error logging deletion:', logError);
      }
      
      // Send Telegram notification for user deletion
      try {
        await telegramService.sendUserDeletedNotification({
          name: user.name,
          email: user.email,
          seatNumber: user.seatNumber,
          slot: user.slot
        });
      } catch (telegramError) {
        console.error('Failed to send Telegram notification for user deletion:', telegramError);
      }
      
      // Delete user
      const deleted = await mongoStorage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Seat routes
  app.get("/api/seats", asyncHandler(async (req: Request, res: Response) => {
    const seats = await mongoStorage.getAllSeats();
    if (!seats) {
      throw new ApiError("Failed to retrieve seats", 500);
    }
    res.json(seats);
  }));
  
  app.put("/api/seats/:number", asyncHandler(async (req: Request, res: Response) => {
    const seatNumber = parseInt(req.params.number);
    
    if (isNaN(seatNumber) || seatNumber < 1 || seatNumber > 114) {
      throw new ApiError("Invalid seat number", 400);
    }
    
    // Validate input data
    const validatedData = updateSeatSchema.parse(req.body);
    
    const seat = await mongoStorage.updateSeat(seatNumber, validatedData);
    
    if (!seat) {
      throw new ApiError("Seat not found", 404);
    }
    
    res.json(seat);
  }));
  
  // Settings routes
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await mongoStorage.getSettings();
      // Sanitize sensitive data before sending to client
      const sanitizedSettings = sanitizeSettings(settings);
      res.json(sanitizedSettings);
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/settings", async (req: Request, res: Response) => {
    try {
      const settingsData = updateSettingsSchema.parse(req.body);
      
      // Map client field names to server field names
      const mappedSettings = { ...settingsData };
      
      // Handle email configuration mapping
      if (settingsData.gmail) {
        mappedSettings.emailUser = settingsData.gmail;
        if (!mappedSettings.emailProvider) {
          mappedSettings.emailProvider = 'gmail';
        }
      }
      if (settingsData.appPassword) {
        mappedSettings.emailPassword = settingsData.appPassword;
      }
      
      console.log('Updating settings with email config:', {
        emailProvider: mappedSettings.emailProvider,
        emailUser: mappedSettings.emailUser,
        hasEmailPassword: !!mappedSettings.emailPassword
      });
      
      const settings = await mongoStorage.updateSettings(mappedSettings);
      
      // Configure email service immediately after settings update
      if (settings.emailUser && settings.emailPassword) {
        let smtpConfig;
        if (settings.emailProvider === 'gmail') {
          smtpConfig = EmailService.createGmailConfig(settings.emailUser, settings.emailPassword);
        } else if (settings.emailProvider === 'outlook') {
          smtpConfig = EmailService.createOutlookConfig(settings.emailUser, settings.emailPassword);
        } else if (settings.emailProvider === 'custom' && settings.smtpHost && typeof settings.smtpPort === 'number' && typeof settings.smtpSecure === 'boolean') {
          smtpConfig = {
            host: settings.smtpHost,
            port: settings.smtpPort,
            secure: settings.smtpSecure,
            auth: {
              user: settings.emailUser,
              pass: settings.emailPassword
            }
          };
        }

        if (smtpConfig) {
          emailService.configure(smtpConfig, settings.emailUser);
          console.log('Email service reconfigured with new settings');
        }
      }

      // Legacy telegram chat IDs are now handled by the new bot management system
      if (settings.telegramChatIds && settings.telegramChatIds.length > 0) {
        console.log('Legacy telegram chat IDs found:', settings.telegramChatIds);
      }
      
      // Sanitize sensitive data before sending to client
      const sanitizedSettings = sanitizeSettings(settings);
      res.json(sanitizedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid settings data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Export routes
  app.get("/api/export/csv", asyncHandler(async (req: Request, res: Response) => {
    const users = await mongoStorage.getAllUsers();
    
    if (!users || users.length === 0) {
      throw new ApiError("No users found to export", 404);
    }
    
    // Create CSV content with proper escaping
    const csvHeader = "Name,Email,Phone,Seat Number,Slot,Fee Status,Registration Date\n";
    const csvRows = users.map(user => {
      const formatDate = (date: any) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString();
      };
      
      return `"${user.name?.replace(/"/g, '""') || ''}","${user.email?.replace(/"/g, '""') || ''}","${user.phone?.replace(/"/g, '""') || ''}",${user.seatNumber || ''},"${user.slot?.replace(/"/g, '""') || ''}","${user.feeStatus?.replace(/"/g, '""') || ''}","${formatDate(user.registrationDate)}"`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csvContent);
  }));
  
  app.get("/api/export/pdf", asyncHandler(async (req: Request, res: Response) => {
    // PDF functionality not implemented - return meaningful error
    throw new ApiError("PDF export feature is not yet implemented. Please use CSV export instead.", 501);
  }));
  
  // Email service status route
  app.get("/api/email/status", async (req: Request, res: Response) => {
    try {
      const settings = await mongoStorage.getSettings();
      const emailConfig = emailService.getConfiguration();
      
      res.json({
        configured: emailConfig.hasTransporter,
        fromEmail: emailConfig.fromEmail,
        hasEmailUser: !!(settings?.emailUser),
        hasEmailPassword: !!(settings?.emailPassword),
        settingsConfigured: !!(settings?.emailUser && settings?.emailPassword && settings?.welcomeEmailTemplate && settings?.dueDateEmailTemplate),
        emailProvider: settings?.emailProvider || 'gmail'
      });
    } catch (error) {
      console.error('Email status error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Test routes
  app.post("/api/test/email", async (req: Request, res: Response) => {
    try {
      const { testEmail } = req.body;
      
      if (!testEmail) {
        return res.status(400).json({ 
          success: false, 
          message: "Test email address is required" 
        });
      }

      const settings = await mongoStorage.getSettings();
      console.log('Email test - Settings check:', {
        hasSettings: !!settings,
        hasEmailUser: !!(settings?.emailUser),
        hasEmailPassword: !!(settings?.emailPassword),
        emailProvider: settings?.emailProvider
      });
      
      if (!settings?.emailUser || !settings?.emailPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "Email configuration not complete. Please configure email settings in the Settings page." 
        });
      }
      
      // Configure email service based on provider
      let smtpConfig;
      if (settings.emailProvider === 'gmail') {
        smtpConfig = EmailService.createGmailConfig(settings.emailUser, settings.emailPassword);
      } else if (settings.emailProvider === 'outlook') {
        smtpConfig = EmailService.createOutlookConfig(settings.emailUser, settings.emailPassword);
      } else if (settings.emailProvider === 'custom' && settings.smtpHost && typeof settings.smtpPort === 'number' && typeof settings.smtpSecure === 'boolean') {
        smtpConfig = {
          host: settings.smtpHost,
          port: settings.smtpPort,
          secure: settings.smtpSecure,
          auth: {
            user: settings.emailUser,
            pass: settings.emailPassword
          }
        };
      }

      if (!smtpConfig) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid email provider configuration" 
        });
      }

      emailService.configure(smtpConfig, settings.emailUser);
      console.log('Sending test email to:', testEmail);
      
      const result = await emailService.testEmail(testEmail);
      console.log('Email test result:', result);
      
      res.json({ 
        success: result.success, 
        message: result.success ? "Email test successful" : `Email test failed: ${result.error}` 
      });
    } catch (error) {
      console.error('Email test error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Email test failed: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });
  
  // Multi-bot management endpoints
  app.post("/api/telegram/bots", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { nickname, botToken, chatIds, notifications, settings } = req.body;
      
      if (!nickname || !botToken) {
        return res.status(400).json({ 
          success: false, 
          message: "Nickname and bot token are required" 
        });
      }
      
      const currentSettings = await mongoStorage.getSettings();
      if (!currentSettings) {
        return res.status(500).json({ success: false, message: "Settings not found" });
      }
      
      const newBot = {
        nickname,
        botToken,
        chatIds: chatIds || [],
        enabled: true,
        notifications: {
          newUser: notifications?.newUser ?? true,
          feeDue: notifications?.feeDue ?? true,
          feeOverdue: notifications?.feeOverdue ?? true,
          feePaid: notifications?.feePaid ?? true
        },
        settings: {
          sendSilently: settings?.sendSilently ?? false,
          protectContent: settings?.protectContent ?? false,
          threadId: settings?.threadId ?? null,
          serverUrl: settings?.serverUrl ?? 'https://api.telegram.org'
        }
      };
      
      const telegramBots = currentSettings.telegramBots || [];
      telegramBots.push(newBot);
      
      await mongoStorage.updateSettings({ telegramBots });
      
      return res.json({
        success: true,
        message: `Bot "${nickname}" added successfully`,
        bot: newBot
      });
      
    } catch (error) {
      console.error('Error adding bot:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  app.put("/api/telegram/bots/:index", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const botIndex = parseInt(req.params.index);
      const updates = req.body;
      
      const currentSettings = await mongoStorage.getSettings();
      if (!currentSettings) {
        return res.status(500).json({ success: false, message: "Settings not found" });
      }
      
      const telegramBots = currentSettings.telegramBots || [];
      
      if (botIndex < 0 || botIndex >= telegramBots.length) {
        return res.status(400).json({ success: false, message: "Invalid bot index" });
      }
      
      // Update the bot
      telegramBots[botIndex] = { ...telegramBots[botIndex], ...updates };
      
      await mongoStorage.updateSettings({ telegramBots });
      
      return res.json({
        success: true,
        message: `Bot "${telegramBots[botIndex].nickname}" updated successfully`,
        bot: telegramBots[botIndex]
      });
      
    } catch (error) {
      console.error('Error updating bot:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  app.delete("/api/telegram/bots/:index", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const botIndex = parseInt(req.params.index);
      
      const currentSettings = await mongoStorage.getSettings();
      if (!currentSettings) {
        return res.status(500).json({ success: false, message: "Settings not found" });
      }
      
      const telegramBots = currentSettings.telegramBots || [];
      
      if (botIndex < 0 || botIndex >= telegramBots.length) {
        return res.status(400).json({ success: false, message: "Invalid bot index" });
      }
      
      const deletedBot = telegramBots.splice(botIndex, 1)[0];
      
      await mongoStorage.updateSettings({ telegramBots });
      
      return res.json({
        success: true,
        message: `Bot "${deletedBot.nickname}" deleted successfully`
      });
      
    } catch (error) {
      console.error('Error deleting bot:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get chat IDs from Telegram updates
  app.post("/api/telegram/get-chat-ids", async (req: Request, res: Response) => {
    try {
      const { botToken, serverUrl = 'https://api.telegram.org' } = req.body;
      
      if (!botToken) {
        return res.status(400).json({ 
          success: false, 
          message: "Bot token is required" 
        });
      }
      
      // Get updates from Telegram
      const response = await fetch(`${serverUrl}/bot${botToken}/getUpdates`);
      const data = await response.json();
      
      if (!data.ok) {
        return res.status(400).json({
          success: false,
          message: `Telegram API error: ${data.description || 'Unknown error'}`
        });
      }
      
      // Extract unique chat IDs from updates
      const chatIds = new Set<string>();
      const chatDetails: Array<{
        id: string;
        type: string;
        title?: string;
        username?: string;
        firstName?: string;
        lastName?: string;
        lastMessage?: string;
        messageCount: number;
      }> = [];
      
      const chatMessageCounts = new Map<string, number>();
      
      data.result.forEach((update: any) => {
        if (update.message && update.message.chat) {
          const chat = update.message.chat;
          const chatId = chat.id.toString();
          
          chatIds.add(chatId);
          chatMessageCounts.set(chatId, (chatMessageCounts.get(chatId) || 0) + 1);
          
          // Check if we already have this chat in details
          const existingChat = chatDetails.find(c => c.id === chatId);
          if (!existingChat) {
            chatDetails.push({
              id: chatId,
              type: chat.type,
              title: chat.title,
              username: chat.username,
              firstName: chat.first_name,
              lastName: chat.last_name,
              lastMessage: update.message.text || update.message.caption || '[Media]',
              messageCount: 1
            });
          } else {
            // Update last message and count
            existingChat.lastMessage = update.message.text || update.message.caption || '[Media]';
            existingChat.messageCount = chatMessageCounts.get(chatId) || 1;
          }
        }
      });
      
      // Sort by message count (most active first)
      chatDetails.sort((a, b) => b.messageCount - a.messageCount);
      
      return res.json({
        success: true,
        chatIds: Array.from(chatIds),
        chatDetails,
        totalUpdates: data.result.length,
        message: chatDetails.length > 0 
          ? `Found ${chatDetails.length} chat(s) from recent messages`
          : "No recent messages found. Send a message to your bot first!"
      });
      
    } catch (error) {
      console.error('Error fetching chat IDs:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Test Telegram bot functionality with dynamic settings
  app.post("/api/test/telegram", async (req: Request, res: Response) => {
    try {
      const settings = await mongoStorage.getSettings();
      
      // Use provided values or fall back to dynamic settings
      const { 
        botToken = settings?.telegramBotToken, 
        chatId = settings?.telegramChatIds?.[0], 
        silent = settings?.telegramSendSilently || false, 
        protectContent = settings?.telegramProtectContent || false, 
        threadId = settings?.telegramThreadId, 
        serverUrl = settings?.telegramServerUrl || 'https://api.telegram.org' 
      } = req.body;
      
      if (!botToken) {
        return res.status(400).json({ 
          success: false, 
          message: "Bot token is required. Please configure it in settings or provide it in the request." 
        });
      }

      if (!chatId) {
        return res.status(400).json({ 
          success: false, 
          message: "Chat ID is required. Please configure it in settings or provide it in the request." 
        });
      }

      console.log(`🧪 Testing Telegram with dynamic config: Bot ending with ...${botToken.slice(-10)}, Chat ID: ${chatId}`);

      // Test the bot with the configured or provided token and chat ID
      const options = {
        silent,
        protectContent,
        threadId,
        serverUrl
      };

      const success = await telegramService.testBot(botToken, chatId, options);

      if (success) {
        res.json({ 
          success: true, 
          message: "Telegram test notification sent successfully! Check your Telegram for the message.",
          usedDynamicConfig: !req.body.botToken || !req.body.chatId
        });
      } else {
        res.json({ 
          success: false, 
          message: "Failed to send Telegram test message. Please check your bot token, chat ID, and configuration." 
        });
      }

    } catch (error) {
      console.error('Telegram test error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Telegram test failed: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });

  // Debug Telegram configuration
  app.get("/api/telegram/debug", async (req: Request, res: Response) => {
    try {
      const settings = await mongoStorage.getSettings();
      const bots = await telegramService.getAllBots();
      
      res.json({
        success: true,
        debug: {
          settingsExist: !!settings,
          telegramBots: settings?.telegramBots || [],
          telegramBotToken: settings?.telegramBotToken ? `...${settings.telegramBotToken.slice(-10)}` : null,
          telegramChatIds: settings?.telegramChatIds || [],
          telegramDefaultEnabled: settings?.telegramDefaultEnabled,
          enabledBotsCount: bots.length,
          enabledBots: bots.map(bot => ({
            nickname: bot.nickname,
            enabled: bot.enabled,
            chatIdCount: bot.chatIds.length,
            notifications: bot.notifications
          }))
        }
      });
    } catch (error) {
      console.error('Telegram debug error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get Telegram debug info: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });

  // Get Telegram bot configuration
  app.get("/api/telegram/bots", async (req: Request, res: Response) => {
    try {
      const bots = telegramService.getBots();
      res.json(bots);
    } catch (error) {
      console.error('Get Telegram bots error:', error);
      res.status(500).json({ message: "Failed to get Telegram bots" });
    }
  });

  // Health check and scheduler status
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      const settings = await mongoStorage.getSettings();
      const users = await mongoStorage.getAllUsers();
      
      const healthStatus = {
        server: "running",
        database: "connected",
        timestamp: new Date().toISOString(),
        scheduler: dueDateScheduler.getStatus(),
        services: {
          email: settings?.emailUser ? "configured" : "not configured",
          telegram: settings?.telegramBots?.length > 0 ? `${settings.telegramBots.length} bot(s) configured` : "no bots configured",
          notifications: "active"
        },
        stats: {
          totalUsers: users.length,
          paidUsers: users.filter(u => u.feeStatus === 'paid').length,
          dueUsers: users.filter(u => u.feeStatus === 'due').length,
          expiredUsers: users.filter(u => u.feeStatus === 'expired').length
        }
      };
      
      res.json(healthStatus);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        server: "error",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Service status endpoint for frontend
  app.get("/api/services/status", asyncHandler(async (req: Request, res: Response) => {
    const serviceStatus = await serviceManager.checkServiceAvailability();
    res.json({
      services: serviceStatus,
      timestamp: new Date().toISOString(),
      message: "Service availability status"
    });
  }));

  // Webhook-based scheduler endpoints (for free hosting)
  app.post("/api/webhook/scheduler", async (req: Request, res: Response) => {
    try {
      console.log('🔗 Webhook scheduler triggered');
      const result = await webhookScheduler.executeScheduledTasks();
      
      res.json({
        success: result.success,
        message: result.success ? 'Scheduled tasks completed successfully' : 'Some tasks failed',
        results: result.results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Webhook scheduler error:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook scheduler failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/api/webhook/status", async (req: Request, res: Response) => {
    try {
      const status = await webhookScheduler.getWebhookStatus();
      res.json(status);
    } catch (error) {
      console.error('Webhook status error:', error);
      res.status(500).json({
        ready: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Manual due date reminder trigger
  app.post("/api/test/due-date-reminders", async (req: Request, res: Response) => {
    try {
      await dueDateScheduler.triggerDueDateCheck();
      res.json({ 
        success: true, 
        message: "Due date reminder check completed" 
      });
    } catch (error) {
      console.error('Due date reminder test error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Due date reminder test failed: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });

  // Send manual due date reminder to specific user
  app.post("/api/send-due-reminder/:userId", async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const user = await mongoStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const settings = await mongoStorage.getSettings();
      if (!settings?.emailUser || !settings?.emailPassword || !settings?.dueDateEmailTemplate) {
        return res.status(400).json({ 
          success: false, 
          message: "Email service not configured" 
        });
      }

      // Configure email service
      let smtpConfig;
      if (settings.emailProvider === 'gmail') {
        smtpConfig = EmailService.createGmailConfig(settings.emailUser, settings.emailPassword);
      } else if (settings.emailProvider === 'outlook') {
        smtpConfig = EmailService.createOutlookConfig(settings.emailUser, settings.emailPassword);
      } else if (settings.emailProvider === 'custom' && settings.smtpHost && typeof settings.smtpPort === 'number' && typeof settings.smtpSecure === 'boolean') {
        smtpConfig = {
          host: settings.smtpHost,
          port: settings.smtpPort,
          secure: settings.smtpSecure,
          auth: {
            user: settings.emailUser,
            pass: settings.emailPassword
          }
        };
      }

      if (!smtpConfig) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid email provider configuration" 
        });
      }

      emailService.configure(smtpConfig, settings.emailUser);

      const registrationDate = new Date(user.registrationDate);
      const dueDate = new Date(registrationDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const emailData = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        seatNumber: user.seatNumber,
        slot: user.slot,
        dueDate: dueDate.toLocaleDateString('en-IN')
      };

      const result = await emailService.sendDueDateReminder(
        user.email,
        emailData,
        settings.dueDateEmailTemplate
      );

      if (result.success) {
        await mongoStorage.createUserLog({
          userId: user._id ? user._id.toString() : '',
          action: 'Manual due date reminder sent',
          adminId: req.body.adminId || 'admin'
        });
      }

      res.json({ 
        success: result.success, 
        message: result.success ? "Due date reminder sent successfully" : `Failed to send reminder: ${result.error}` 
      });
    } catch (error) {
      console.error('Manual due reminder error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send due reminder: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });

  // File upload routes for Cloudinary
  app.post("/api/upload/file", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: "No file uploaded" 
        });
      }

      if (!cloudinaryService.isReady()) {
        return res.status(500).json({ 
          success: false, 
          message: "Cloudinary is not configured" 
        });
      }

      const result = await cloudinaryService.uploadFile(req.file, 'vidhyadham/documents');
      
      if (result.success) {
        res.json({ 
          success: true, 
          url: result.url,
          public_id: result.public_id,
          message: "File uploaded successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: result.error 
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ 
        success: false, 
        message: "File upload failed: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });

  // Upload multiple files
  app.post("/api/upload/files", upload.array('files', 5), async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No files uploaded" 
        });
      }

      if (!cloudinaryService.isReady()) {
        return res.status(500).json({ 
          success: false, 
          message: "Cloudinary is not configured" 
        });
      }

      const uploadPromises = req.files.map(file => 
        cloudinaryService.uploadFile(file, 'vidhyadham/documents')
      );
      
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result.success);
      const failedUploads = results.filter(result => !result.success);

      res.json({
        success: successfulUploads.length > 0,
        totalFiles: req.files.length,
        successfulUploads: successfulUploads.length,
        failedUploads: failedUploads.length,
        files: successfulUploads.map(result => ({
          url: result.url,
          public_id: result.public_id
        })),
        errors: failedUploads.map(result => result.error)
      });
    } catch (error) {
      console.error('Multiple file upload error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Multiple file upload failed: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });

  // Delete file from Cloudinary
  app.delete("/api/upload/file/:publicId", async (req: Request, res: Response) => {
    try {
      const publicId = req.params.publicId;
      
      if (!publicId) {
        return res.status(400).json({ 
          success: false, 
          message: "Public ID is required" 
        });
      }

      if (!cloudinaryService.isReady()) {
        return res.status(500).json({ 
          success: false, 
          message: "Cloudinary is not configured" 
        });
      }

      const result = await cloudinaryService.deleteFile(publicId);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: "File deleted successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: result.error 
        });
      }
    } catch (error) {
      console.error('File deletion error:', error);
      res.status(500).json({ 
        success: false, 
        message: "File deletion failed: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });

  // Mark payment as paid with new fee calculation logic
  app.post("/api/users/:id/mark-paid", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.id;
      const user = await mongoStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const settings = await mongoStorage.getSettings();
      if (!settings) {
        return res.status(500).json({ message: "Settings not configured" });
      }

      // Calculate next due date using the new fee calculator
      const calculation = feeCalculator.calculateNextDueDate(
        new Date(), // Payment date is today
        new Date(user.registrationDate),
        settings.slotPricing || {},
        user.slot
      );

      // Update user with new fee status and next due date
      const updatedUser = await mongoStorage.updateUser(userId, {
        feeStatus: 'paid',
        nextDueDate: calculation.nextDueDate,
        lastPaymentDate: new Date()
      });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      // Log the payment
      await mongoStorage.createUserLog({
        userId,
        action: `Payment marked as paid - Next due: ${calculation.nextDueDate.toLocaleDateString()}`,
        adminId: req.session.adminId || 'admin'
      });

      // Send payment confirmation email
      console.log('Checking email conditions:', {
        hasEmailUser: !!settings.emailUser,
        hasEmailPassword: !!settings.emailPassword,
        hasPaymentTemplate: !!settings.paymentConfirmationEmailTemplate
      });
      
      if (settings.emailUser && settings.emailPassword && settings.paymentConfirmationEmailTemplate) {
        const emailData = {
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          seatNumber: user.seatNumber,
          slot: user.slot,
          paidDate: new Date().toLocaleDateString(),
          nextDueDate: calculation.nextDueDate.toLocaleDateString(),
          amount: `₹${calculation.amount}`
        };

        console.log('Sending payment confirmation email to:', user.email);
        try {
          await emailService.sendPaymentConfirmation(
            user.email,
            emailData,
            settings.paymentConfirmationEmailTemplate
          );
          console.log('Payment confirmation email sent successfully');
        } catch (error) {
          console.error('Error sending payment confirmation email:', error);
        }
      } else {
        console.log('Payment confirmation email not sent - missing required settings');
      }

      // Send Telegram notification
      await telegramService.sendPaymentReceivedNotification({
        ...user,
        amount: calculation.amount,
        nextDueDate: calculation.nextDueDate
      });

      res.json({ 
        success: true, 
        user: updatedUser, 
        calculation,
        message: "Payment marked successfully" 
      });

    } catch (error) {
      console.error('Error marking payment:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Failed to mark payment" 
      });
    }
  });

  // Upload ID document to Cloudinary
  app.post("/api/upload/id-document", upload.single('idDocument'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      // Check if Cloudinary is configured
      const cloudinaryStatus = cloudinaryService.getStatus();
      if (!cloudinaryStatus.configured) {
        return res.status(500).json({
          success: false,
          message: "File storage not configured"
        });
      }

      // Upload to Cloudinary
      const result = await cloudinaryService.uploadImage(req.file.buffer, {
        folder: 'vidhyadham/id-documents',
        transformation: [
          { width: 1000, height: 1000, crop: "limit" },
          { quality: "auto:good" }
        ]
      });

      console.log('ID document uploaded successfully:', result.secure_url);

      res.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        message: "ID document uploaded successfully"
      });

    } catch (error) {
      console.error('ID document upload error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Upload failed"
      });
    }
  });

  // Cloudinary status
  app.get("/api/cloudinary/status", async (req: Request, res: Response) => {
    try {
      const status = cloudinaryService.getStatus();
      const envVars = {
        hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
      };
      
      res.json({
        ...status,
        environment: envVars,
        message: status.configured ? 'Cloudinary is ready for uploads' : 'Cloudinary not configured - check environment variables'
      });
    } catch (error) {
      console.error('Cloudinary status error:', error);
      res.status(500).json({ 
        configured: false,
        error: "Failed to get Cloudinary status",
        environment: {
          hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
          hasApiKey: !!process.env.CLOUDINARY_API_KEY,
          hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
        }
      });
    }
  });

  // Manual trigger for testing scheduler (for development/testing only)
  app.post("/api/test/scheduler", async (req: Request, res: Response) => {
    try {
      console.log('🔧 [TEST] Manual scheduler trigger requested');
      await dueDateScheduler.triggerDueDateCheck();
      
      res.json({
        success: true,
        message: "Due date check triggered manually. Check console logs for details.",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [TEST] Manual scheduler trigger failed:', error);
      res.status(500).json({
        success: false,
        message: "Failed to trigger scheduler",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
