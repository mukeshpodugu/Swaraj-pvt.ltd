import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthRequest } from './auth.middleware';

export function auditLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

  // We log after request completes using response event listener
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const authReq = req as AuthRequest;
    
    // Construct description details
    const logDetails = `Method: ${req.method} | URL: ${req.originalUrl} | Status: ${statusCode} | Duration: ${duration}ms`;

    // Print to console
    console.log(`[Audit] ${new Date().toISOString()} | IP: ${ipAddress} | ${logDetails}`);

    // If it's a modifying request (POST, PUT, DELETE) and status code is successful, save to AuditLog table
    const isWrite = ['POST', 'PUT', 'DELETE'].includes(req.method);
    const isSuccess = statusCode >= 200 && statusCode < 400;

    if (isWrite && isSuccess) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: authReq.user?.id || null,
            action: `${req.method} ${req.baseUrl || req.path}`,
            ipAddress: ipAddress || 'unknown',
            details: logDetails.substring(0, 500)
          }
        });
      } catch (err) {
        console.error('Failed to write audit log in DB:', err);
      }
    }
  });

  next();
}
