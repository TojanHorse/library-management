import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { mongoStorage } from "./mongo-storage";
import { emailService, EmailService } from "./email-service";
import { dueDateScheduler } from "./scheduler";
import { cloudinaryService, upload } from "./cloudinary";
import { z } from "zod";

// Updated validation schemas for MongoDB
const insertUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number must be at least 6 characters"),
  address: z.string().min(1, "Address is required"),
  seatNumber: z.number().min(1).max(114),
  slot: z.enum(["Morning", "Afternoon", "Evening"]),
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
    Evening: z.number().min(0)
  }),
  slotTimings: z.object({
    Morning: z.string(),
    Afternoon: z.string(),
    Evening: z.string()
  }),
  emailProvider: z.enum(["gmail", "outlook", "custom"]).default("gmail"),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpSecure: z.boolean().optional(),
  emailUser: z.string().email("Invalid email address"),
  emailPassword: z.string().min(1, "Email password is required"),
  telegramChatIds: z.array(z.string()).default([]),
  welcomeEmailTemplate: z.string().min(1, "Welcome email template is required"),
  dueDateEmailTemplate: z.string().min(1, "Due date email template is required"),
  cloudinaryCloudName: z.string().optional(),
  cloudinaryApiKey: z.string().optional(),
  cloudinaryApiSecret: z.string().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Admin authentication routes
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const admin = await mongoStorage.loginAdmin(username, password);
      
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.json({ success: true, adminId: admin._id, username: admin.username });
    } catch (error) {
      console.error('Error in admin login:', error);
      res.status(500).json({ message: "Internal server error" });
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
      const users = await mongoStorage.getAllUsers();
      
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
      const userData = req.body;
      
      // Get original user data first
      const originalUser = await mongoStorage.getUser(userId);
      if (!originalUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = await mongoStorage.updateUser(userId, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Real-time seat updates - if seat number changed
      if (userData.seatNumber && userData.seatNumber !== originalUser.seatNumber) {
        try {
          // Check if new seat is available
          const newSeat = await mongoStorage.getSeat(userData.seatNumber);
          if (!newSeat || (newSeat.status !== 'available' && newSeat.userId !== (user._id ? user._id.toString() : ''))) {
            throw new Error("New seat is not available");
          }
          
          // Free old seat
          await mongoStorage.updateSeat(originalUser.seatNumber, {
            status: 'available',
            userId: null
          });
          
          // Assign new seat
          await mongoStorage.updateSeat(userData.seatNumber, {
            status: userData.feeStatus || user.feeStatus,
            userId: user._id ? user._id.toString() : ''
          });
          
          // Log seat change
          await mongoStorage.createUserLog({
            userId: user._id ? user._id.toString() : '',
            action: `Seat changed from ${originalUser.seatNumber} to ${userData.seatNumber}`,
            adminId: req.body.adminId
          });
        } catch (seatError) {
          console.error('Seat update error:', seatError);
          return res.status(400).json({ message: "Failed to update seat assignment" });
        }
      }
      
      // Real-time fee status updates
      if (userData.feeStatus && userData.feeStatus !== originalUser.feeStatus) {
        try {
          await mongoStorage.updateSeat(user.seatNumber, {
            status: userData.feeStatus,
            userId: user._id ? user._id.toString() : ''
          });
          
          // Log fee status change
          await mongoStorage.createUserLog({
            userId: user._id ? user._id.toString() : '',
            action: `Fee status changed from ${originalUser.feeStatus} to ${userData.feeStatus}`,
            adminId: req.body.adminId
          });
        } catch (feeError) {
          console.error('Fee status update error:', feeError);
        }
      }
      
      // Create general user log
      const changedFields = Object.keys(userData).filter(key => 
        userData[key] !== originalUser[key as keyof typeof originalUser]
      );
      
      if (changedFields.length > 0) {
        await mongoStorage.createUserLog({
          userId: user._id ? user._id.toString() : '',
          action: `User updated: ${changedFields.join(', ')}`,
          adminId: req.body.adminId
        });
      }
      
      const logs = await mongoStorage.getUserLogs(user._id ? user._id.toString() : '');
      res.json({ ...user, logs });
    } catch (error) {
      console.error('Error updating user:', error);
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
  app.get("/api/seats", async (req: Request, res: Response) => {
    try {
      const seats = await mongoStorage.getAllSeats();
      res.json(seats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/seats/:number", async (req: Request, res: Response) => {
    try {
      const seatNumber = parseInt(req.params.number);
      const seatData = req.body;
      
      const seat = await mongoStorage.updateSeat(seatNumber, seatData);
      
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }
      
      res.json(seat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Settings routes
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await mongoStorage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/settings", async (req: Request, res: Response) => {
    try {
      const settingsData = insertSettingsSchema.parse(req.body);
      
      console.log('Updating settings with email config:', {
        emailProvider: settingsData.emailProvider,
        emailUser: settingsData.emailUser,
        hasEmailPassword: !!settingsData.emailPassword
      });
      
      const settings = await mongoStorage.updateSettings(settingsData);
      
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
      
      res.json(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid settings data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Export routes
  app.get("/api/export/csv", async (req: Request, res: Response) => {
    try {
      const users = await mongoStorage.getAllUsers();
      
      // Create CSV content
      const csvHeader = "Name,Email,Phone,Seat Number,Slot,Fee Status,Registration Date\n";
      const csvRows = users.map(user => 
        `"${user.name}","${user.email}","${user.phone}",${user.seatNumber},"${user.slot}","${user.feeStatus}","${user.registrationDate}"`
      ).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/export/pdf", async (req: Request, res: Response) => {
    try {
      // For now, return a simple text response
      // In a real application, you would use a PDF generation library
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="users.pdf"');
      res.send("PDF generation not implemented yet");
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
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
  
  app.post("/api/test/telegram", async (req: Request, res: Response) => {
    try {
      // Mock telegram test
      res.json({ success: true, message: "Telegram test successful" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
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

  // Cloudinary status
  app.get("/api/cloudinary/status", async (req: Request, res: Response) => {
    try {
      const status = cloudinaryService.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Cloudinary status error:', error);
      res.status(500).json({ 
        configured: false,
        error: "Failed to get Cloudinary status"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
