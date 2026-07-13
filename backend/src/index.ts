import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Load Env variables
dotenv.config();

// Router Imports
import authRouter from './routes/auth.routes';
import customersRouter from './routes/customers.routes';
import loansRouter from './routes/loans.routes';
import chitsRouter from './routes/chits.routes';
import licRouter from './routes/lic.routes';
import aiRouter from './routes/ai.routes';
import reportsRouter from './routes/reports.routes';
import settingsRouter from './routes/settings.routes';

// Middleware Imports
import { auditLogger } from './middleware/logger.middleware';

const app = express();
const PORT = process.env.PORT || 5000;

// --- Security Middleware Pipeline ---

// Helmet configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
let frontendOrigin = process.env.FRONTEND_ORIGIN || '';
if (frontendOrigin && !frontendOrigin.startsWith('http')) {
  frontendOrigin = `https://${frontendOrigin}.onrender.com`;
}

const allowedOrigins = [
  'http://localhost:5173', // standard Vite frontend
  'http://127.0.0.1:5173',
  frontendOrigin
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy. Rejected Origin: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Express limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Simple Custom Cookie Parser (zero dependency solution)
app.use((req: any, res: Response, next: NextFunction) => {
  const cookieHeader = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach((item: string) => {
      const parts = item.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      cookies[key] = decodeURIComponent(val);
    });
  }
  req.cookies = cookies;
  next();
});

// Rate limiting (except for report streams or large backup operations)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

// Global audit request logging
app.use(auditLogger);

// --- Endpoint Routing Hookups ---
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/loans', loansRouter);
app.use('/api/chits', chitsRouter);
app.use('/api/lic', licRouter);
app.use('/api/ai', aiRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

// API Documentation / Swagger Simulation Endpoint
app.get('/api/docs', (req: Request, res: Response) => {
  res.json({
    appName: 'Swaraj Pvt. Limited - FinancePro AI Platform API',
    version: '1.0.0',
    endpoints: {
      auth: [
        'POST /api/auth/register - Register user accounts',
        'POST /api/auth/login - Email authentication and session initiation',
        'POST /api/auth/google-signin - Google auth integration',
        'POST /api/auth/refresh - Refresh token renewal',
        'POST /api/auth/forgot-password - Dispatches reset token',
        'POST /api/auth/reset-password - Accepts reset token and updates password',
        'POST /api/auth/logout - Deletes session cookie'
      ],
      customers: [
        'GET /api/customers - List & search customers',
        'GET /api/customers/:id - Retrieve profile details',
        'GET /api/customers/:id/timeline - Chronological events logs',
        'PUT /api/customers/:id - Update profile information',
        'POST /api/customers/:id/verify-kyc - Resolve KYC status'
      ],
      loans: [
        'GET /api/loans - List all credit files',
        'POST /api/loans/apply - Create loan application',
        'POST /api/loans/:id/approve - Credit underwriting resolution',
        'POST /api/loans/:id/disburse - Disburse funds and generate EMIs',
        'POST /api/loans/:id/emi/:installmentId/pay - Reconcile EMI payments',
        'POST /api/loans/:id/part-payment - Principal payment reduction'
      ],
      chits: [
        'GET /api/chits - List groups, auctions and logs',
        'POST /api/chits - Create chit fund group',
        'POST /api/chits/:id/join - Join group subscriber slot',
        'POST /api/chits/:id/auction - Conduct monthly auction bidding',
        'POST /api/chits/:id/installment/:installmentId/pay - Pay monthly contributions'
      ],
      lic: [
        'GET /api/lic - List registered insurance policies',
        'GET /api/lic/alerts - Check active policies expiring in 30 days',
        'POST /api/lic - Register new policy coverage',
        'POST /api/lic/:id/pay-premium - Process premium installment'
      ],
      ai: [
        'POST /api/ai/predict-approval - Loan Approval scoring assessment',
        'POST /api/ai/predict-default - Loan default probability risk',
        'GET /api/ai/customer-score/:id - Retrieve aggregate credit score rating',
        'GET /api/ai/history - Historical prediction runs logs'
      ],
      reports: [
        'GET /api/reports/customers - Export customer directory (pdf, excel, csv)',
        'GET /api/reports/loans - Export loans portfolio',
        'GET /api/reports/chits - Export chit funds status',
        'GET /api/reports/lic - Export insurance metrics',
        'GET /api/reports/defaulters - Export collection warnings',
        'GET /api/reports/cash-flow - Export general ledger statements'
      ],
      settings: [
        'GET /api/settings - Retrieve configurations',
        'PUT /api/settings - Edit configurations',
        'GET /api/settings/logs - Retrieve audit/notification histories',
        'GET /api/settings/backup/export - Export database JSON backup container',
        'POST /api/settings/backup/restore - Restore system tables'
      ]
    }
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Middleware Handler Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Swaraj FinancePro AI Web Server running on Port ${PORT}`);
  console.log(`  API Documentation endpoint: http://localhost:${PORT}/api/docs`);
  console.log(`==================================================`);
});

export default app;
