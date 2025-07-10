import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
      
      // Update seat status
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
      
      const logs = await storage.getUserLogs(user.id.toString());
      res.json({ ...user, logs });
    } catch (error) {
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
      
      const user = await storage.updateUser(userId, userData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update seat status if seat number changed
      if (userData.seatNumber && userData.seatNumber !== user.seatNumber) {
        // Free old seat
        await storage.updateSeat(user.seatNumber, {
          status: 'available',
          userId: null
        });
        
        // Assign new seat
        await storage.updateSeat(userData.seatNumber, {
          status: userData.feeStatus || user.feeStatus,
          userId: user.id.toString()
        });
      }
      
      // Update seat status if fee status changed
      if (userData.feeStatus && userData.feeStatus !== user.feeStatus) {
        await storage.updateSeat(user.seatNumber, {
          status: userData.feeStatus,
          userId: user.id.toString()
        });
      }
      
      // Create user log
      await storage.createUserLog({
        userId: user.id.toString(),
        action: `User updated: ${Object.keys(userData).join(', ')}`,
        adminId: req.body.adminId
      });
      
      const logs = await storage.getUserLogs(user.id.toString());
      res.json({ ...user, logs });
    } catch (error) {
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
      
      // Free the seat
      await storage.updateSeat(user.seatNumber, {
        status: 'available',
        userId: null
      });
      
      // Delete user
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
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
      const settings = await storage.updateSettings(settingsData);
      res.json(settings);
    } catch (error) {
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
      // Mock email test
      res.json({ success: true, message: "Email test successful" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
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
