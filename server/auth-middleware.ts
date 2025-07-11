import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  session: Request['session'] & {
    adminId?: string;
    username?: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Skip auth for login endpoint
  if (req.path === '/api/admin/login' || req.path === '/api/admin/register') {
    return next();
  }

  // Check if admin is logged in
  if (!req.session.adminId || !req.session.username) {
    return res.status(401).json({ 
      message: 'Authentication required',
      requireLogin: true 
    });
  }

  next();
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // This middleware just passes through but makes session data available
  next();
}

// Middleware to check if user is already logged in
export function redirectIfAuthenticated(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.session.adminId && req.session.username) {
    return res.json({ 
      message: 'Already authenticated',
      isAuthenticated: true,
      username: req.session.username 
    });
  }
  next();
}
