import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { dueDateScheduler } from "./scheduler";
import { emailService, EmailService } from "./email-service";
import { database } from "./database";
import { cloudinaryService } from "./cloudinary";
import { healthCheckService } from "./health-check";
import { serviceManager } from "./service-manager";
import { errorHandler, notFound } from "./middleware/error-handler";

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // In production, you might want to log this to a service and potentially restart
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, you should log this and then gracefully shut down
  process.exit(1);
});

const app = express();

// Request timeout middleware
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'vidhya-dham-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/vidhya-dham',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // CSRF protection
  }
}));

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    adminId?: string;
    username?: string;
  }
}

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

    // Log error for debugging
    console.error('Global error handler:', err);
    
    // Send error response if not already sent
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    
    // Don't re-throw the error - this was causing process crashes
  });

  // Error handling middleware (must be after all routes)
  app.use(notFound);
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use environment port or default to 5000
  // Render provides PORT environment variable
  const port = process.env.PORT || 5000;
  server.listen(port, async () => {
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
    
    // Start health check monitoring
    healthCheckService.startHealthCheckInterval(60000); // Every minute
    
    // Initialize service manager for graceful degradation
    try {
      await serviceManager.initialize();
      log('✅ Service manager initialized successfully');
    } catch (error) {
      log('⚠️ Service manager initialization warning:', error);
    }
    
    // Render.com keepalive - prevent service from sleeping
    if (process.env.NODE_ENV === 'production') {
      const KEEPALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes
      setInterval(async () => {
        try {
          // Self ping to keep the service alive
          const response = await fetch(`http://localhost:${port}/api/health`);
          if (response.ok) {
            log('Keepalive ping successful');
          }
        } catch (error) {
          log('Keepalive ping failed:', error);
        }
      }, KEEPALIVE_INTERVAL);
      log('Render keepalive mechanism started (14-minute intervals)');
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    dueDateScheduler.stop();
    healthCheckService.stopHealthCheckInterval();
    await database.disconnect();
    server.close();
  });

  process.on('SIGINT', async () => {
    dueDateScheduler.stop();
    healthCheckService.stopHealthCheckInterval();
    await database.disconnect();
    server.close();
  });
})();
