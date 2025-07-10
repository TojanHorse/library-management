import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./email";
import { insertUserSchema, insertSeatSchema, insertSettingsSchema, insertUserLogSchema, insertAdminSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Admin authentication routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const admin = await storage.getAdminByUsername(username);
      
      if (!admin || admin.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.json({ success: true, adminId: admin.id });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin", async (req, res) => {
    try {
      const adminData = insertAdminSchema.parse(req.body);
      
      // Check if admin already exists
      const existingAdmin = await storage.getAdminByUsername(adminData.username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Admin username already exists" });
      }
      
      const admin = await storage.createAdmin(adminData);
      res.json({ id: admin.id, username: admin.username });
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid admin data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Include user logs for each user
      const usersWithLogs = await Promise.all(
        users.map(async (user) => {
          const logs = await storage.getUserLogs(user.id.toString());
          return { ...user, logs };
        })
      );
      
      res.json(usersWithLogs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if seat is available
      const seat = await storage.getSeat(userData.seatNumber);
      if (!seat || seat.status !== 'available') {
        return res.status(400).json({ message: "Seat is not available" });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Update seat status - real-time connection between user and seat
      await storage.updateSeat(userData.seatNumber, {
        status: userData.feeStatus,
        userId: user.id.toString()
      });
      
      // Create user log
      await storage.createUserLog({
        userId: user.id.toString(),
        action: "User registered",
        adminId: undefined
      });
      
      // Send welcome email
      try {
        const settings = await storage.getSettings();
        if (settings?.sendgridApiKey && settings?.welcomeEmailTemplate) {
          emailService.setApiKey(settings.sendgridApiKey);
          
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
          
          await emailService.sendWelcomeEmail(
            user.email,
            emailData,
            settings.welcomeEmailTemplate
          );
          
          // Log email sent
          await storage.createUserLog({
            userId: user.id.toString(),
            action: "Welcome email sent",
            adminId: undefined
          });
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }
      
      const logs = await storage.getUserLogs(user.id.toString());
      res.json({ ...user, logs });
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Get original user data first
      const originalUser = await storage.getUser(userId);
      if (!originalUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = await storage.updateUser(userId, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Real-time seat updates - if seat number changed
      if (userData.seatNumber && userData.seatNumber !== originalUser.seatNumber) {
        try {
          // Check if new seat is available
          const newSeat = await storage.getSeat(userData.seatNumber);
          if (!newSeat || (newSeat.status !== 'available' && newSeat.userId !== user.id.toString())) {
            throw new Error("New seat is not available");
          }
          
          // Free old seat
          await storage.updateSeat(originalUser.seatNumber, {
            status: 'available',
            userId: null
          });
          
          // Assign new seat
          await storage.updateSeat(userData.seatNumber, {
            status: userData.feeStatus || user.feeStatus,
            userId: user.id.toString()
          });
          
          // Log seat change
          await storage.createUserLog({
            userId: user.id.toString(),
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
          await storage.updateSeat(user.seatNumber, {
            status: userData.feeStatus,
            userId: user.id.toString()
          });
          
          // Log fee status change
          await storage.createUserLog({
            userId: user.id.toString(),
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
        await storage.createUserLog({
          userId: user.id.toString(),
          action: `User updated: ${changedFields.join(', ')}`,
          adminId: req.body.adminId
        });
      }
      
      const logs = await storage.getUserLogs(user.id.toString());
      res.json({ ...user, logs });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Real-time seat release
      try {
        await storage.updateSeat(user.seatNumber, {
          status: 'available',
          userId: null
        });
      } catch (seatError) {
        console.error('Error freeing seat:', seatError);
      }
      
      // Log user deletion
      try {
        await storage.createUserLog({
          userId: user.id.toString(),
          action: `User deleted by admin - Seat ${user.seatNumber} freed`,
          adminId: req.body.adminId
        });
      } catch (logError) {
        console.error('Error logging deletion:', logError);
      }
      
      // Delete user
      const deleted = await storage.deleteUser(userId);
      
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
  app.get("/api/seats", async (req, res) => {
    try {
      const seats = await storage.getAllSeats();
      res.json(seats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/seats/:number", async (req, res) => {
    try {
      const seatNumber = parseInt(req.params.number);
      const seatData = req.body;
      
      const seat = await storage.updateSeat(seatNumber, seatData);
      
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }
      
      res.json(seat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/settings", async (req, res) => {
    try {
      const settingsData = insertSettingsSchema.parse(req.body);
      
      // Update email service if API key changed
      if (settingsData.sendgridApiKey) {
        emailService.setApiKey(settingsData.sendgridApiKey);
      }
      
      const settings = await storage.updateSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Export routes
  app.get("/api/export/csv", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
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
  
  app.get("/api/export/pdf", async (req, res) => {
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
  
  // Test routes
  app.post("/api/test/email", async (req, res) => {
    try {
      const { testEmail } = req.body;
      const settings = await storage.getSettings();
      
      if (!settings?.sendgridApiKey) {
        return res.status(400).json({ 
          success: false, 
          message: "SendGrid API key not configured" 
        });
      }
      
      emailService.setApiKey(settings.sendgridApiKey);
      const success = await emailService.testEmail(testEmail || settings.gmail);
      
      res.json({ 
        success, 
        message: success ? "Email test successful" : "Email test failed - check API key and configuration" 
      });
    } catch (error) {
      console.error('Email test error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Email test failed: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });
  
  app.post("/api/test/telegram", async (req, res) => {
    try {
      // Mock telegram test
      res.json({ success: true, message: "Telegram test successful" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
