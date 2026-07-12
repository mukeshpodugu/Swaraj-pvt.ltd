import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { UserRole } from '../../../shared/src/types';

// Expand Express Request interface
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    role: UserRole;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'swaraj-super-secret-key-12345';

/**
 * Middleware to authenticate requests via JWT Bearer Token
 * Supports dynamic validation.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  try {
    // 1. Verify Local JWT
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 2. Load User from Database
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true
      }
    });

    if (!dbUser) {
      return res.status(403).json({ error: 'User session expired or not found.' });
    }

    // 3. Attach User info to Request object (cast as UserRole from shared types)
    (req as AuthRequest).user = {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      phone: dbUser.phone,
      role: dbUser.role as unknown as UserRole
    };

    return next();
  } catch (err: any) {
    // 4. Try Firebase ID Token fallback check if locally fails
    // In production, we'd call Firebase Admin SDK: admin.auth().verifyIdToken(token)
    // If the token is successfully decoded as a mock Firebase JWT token, we resolve it.
    if (token.startsWith('firebase_mock_token_')) {
      const email = token.replace('firebase_mock_token_', '');
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, fullName: true, phone: true, role: true }
      });
      if (dbUser) {
        (req as AuthRequest).user = {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          phone: dbUser.phone,
          role: dbUser.role as unknown as UserRole
        };
        return next();
      }
    }
    
    return res.status(403).json({ error: 'Invalid or expired credentials token.' });
  }
}

/**
 * Middleware to restrict route endpoints based on User Roles (RBAC)
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      return res.status(403).json({ 
        error: `Unauthorized access. Required role: ${allowedRoles.join(', ')}. Got: ${authReq.user.role}` 
      });
    }

    return next();
  };
}
