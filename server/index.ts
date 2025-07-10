import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { dueDateScheduler } from "./scheduler";
import { emailService, EmailService } from "./email-service";
import { database } from "./database";
import { cloudinaryService } from "./cloudinary";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Connect to MongoDB
  try {
    await database.connect();
    log('Database connected successfully');
  } catch (error) {
    log('Database connection failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Initialize Cloudinary
  if (cloudinaryService.isReady()) {
    log('Cloudinary configured and ready');
  } else {
    log('Warning: Cloudinary not configured. File uploads will not work.');
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
    
    // Initialize email service with environment variables
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_PASSWORD;
    
    if (gmailUser && gmailPassword) {
      const smtpConfig = EmailService.createGmailConfig(gmailUser, gmailPassword);
      emailService.configure(smtpConfig, gmailUser);
      log(`Email service configured for: ${gmailUser}`);
    } else {
      log('Warning: Gmail credentials not found in environment variables');
      log('Please set GMAIL_USER and GMAIL_PASSWORD in .env file');
    }
    
    // Start the due date reminder scheduler
    dueDateScheduler.start();
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    dueDateScheduler.stop();
    await database.disconnect();
    server.close();
  });

  process.on('SIGINT', async () => {
    dueDateScheduler.stop();
    await database.disconnect();
    server.close();
  });
})();
