import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { MailService } from '../services/mail.service';
import { UserRole } from '../../../shared/src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'swaraj-super-secret-key-12345';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'swaraj-super-refresh-key-67890';

export class AuthController {
  /**
   * Register a backoffice staff/agent or a direct customer
   */
  public static async register(req: Request, res: Response) {
    const { email, password, fullName, phone, role } = req.body;

    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ error: 'Missing required registration parameters.' });
    }

    try {
      // Check existing email
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User with this email or phone number already exists.' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Determine Role
      const userRole = (role && Object.values(UserRole).includes(role)) ? role : UserRole.CUSTOMER;

      // Create User
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          role: userRole as any
        }
      });

      // If user is a customer, automatically create an empty CustomerProfile
      if (userRole === UserRole.CUSTOMER) {
        await prisma.customerProfile.create({
          data: {
            userId: user.id,
            aadhaar: `PENDING_${user.id.substring(0, 8)}`,
            pan: `PENDING_${user.id.substring(0, 8)}`,
            address: 'Not Configured',
            nomineeName: 'Not Provided',
            nomineeRelation: 'Not Provided',
            nomineePhone: 'Not Provided',
            employmentStatus: 'UNEMPLOYED',
            monthlyIncome: 0,
            kycStatus: 'PENDING',
            status: 'ACTIVE'
          }
        });
        // Dispatch Welcome Email
        await MailService.sendWelcomeEmail(user.id, email, fullName);
      }

      // Generate Access Token
      const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

      // Save refresh token cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.status(210).json({
        message: 'Registration successful.',
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (err: any) {
      console.error('[Register Error]', err);
      return res.status(500).json({ error: 'Server error during registration.' });
    }
  }

  /**
   * Log in user using email and password
   */
  public static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // If customer, fetch profile ID
      let customerProfileId: string | undefined = undefined;
      if (user.role === UserRole.CUSTOMER) {
        const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
        customerProfileId = profile?.id;
      }

      // Generate Tokens
      const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          customerProfileId
        }
      });
    } catch (err: any) {
      console.error('[Login Error]', err);
      return res.status(500).json({ error: 'Server error during login.' });
    }
  }

  /**
   * Authenticate / Synchronize customer profile from Google login payload
   */
  public static async googleSignIn(req: Request, res: Response) {
    const { email, fullName, photoUrl, googleUid } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ error: 'Google details missing.' });
    }

    try {
      // Find or create User
      let user = await prisma.user.findUnique({ where: { email } });
      let isNew = false;

      if (!user) {
        isNew = true;
        const phone = `G_${googleUid?.substring(0, 10) || Math.random().toString().substring(2, 12)}`;
        // Create user with dummy/secured password hash for Google sign-in
        const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
        
        user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            fullName,
            phone,
            role: UserRole.CUSTOMER
          }
        });

        // Automatically create a profile
        await prisma.customerProfile.create({
          data: {
            userId: user.id,
            aadhaar: `GOOGLE_${user.id.substring(0, 8)}`,
            pan: `GOOGLE_${user.id.substring(0, 8)}`,
            photoUrl,
            address: 'Not Configured',
            nomineeName: 'Not Provided',
            nomineeRelation: 'Not Provided',
            nomineePhone: 'Not Provided',
            employmentStatus: 'UNEMPLOYED',
            monthlyIncome: 0,
            kycStatus: 'PENDING',
            status: 'ACTIVE'
          }
        });

        await MailService.sendWelcomeEmail(user.id, email, fullName);
      }

      const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });

      const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          customerProfileId: profile?.id
        }
      });
    } catch (err: any) {
      console.error('[Google Sign In Error]', err);
      return res.status(500).json({ error: 'Server error during Google Sign-in.' });
    }
  }

  /**
   * Refresh the user's access token
   */
  public static async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found.' });
    }

    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user) {
        return res.status(403).json({ error: 'User does not exist.' });
      }

      let customerProfileId: string | undefined = undefined;
      if (user.role === UserRole.CUSTOMER) {
        const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
        customerProfileId = profile?.id;
      }

      const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
      return res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          customerProfileId
        }
      });
    } catch (err) {
      return res.status(403).json({ error: 'Invalid refresh token.' });
    }
  }

  /**
   * Request password recovery link simulation
   */
  public static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.json({ message: 'If the email exists, a reset link will be sent.' });
      }

      const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
      const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

      // Dispatch reset email
      const body = `
        <h2>Password Recovery Request</h2>
        <p>Dear ${user.fullName},</p>
        <p>We received a request to reset your password for your Swaraj FinancePro account.</p>
        <p>Please click the button below to specify a new password. This recovery link is valid for 15 minutes.</p>
        <a href="${resetLink}" class="button">Reset Password</a>
        <p>If you did not request this change, please ignore this email or contact support immediately.</p>
      `;

      await MailService.sendEmail(
        user.id,
        user.email,
        'Reset Password - Swaraj Pvt. Limited',
        'Password Recovery',
        body,
        'PASSWORD_RESET'
      );

      return res.json({ message: 'Password recovery email dispatched successfully.' });
    } catch (err: any) {
      console.error('[Forgot Password Error]', err);
      return res.status(500).json({ error: 'Server error processing request.' });
    }
  }

  /**
   * Reset the password using token validation
   */
  public static async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: decoded.userId },
        data: { passwordHash }
      });

      return res.json({ message: 'Password reset completed successfully. You can now log in.' });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }
  }

  /**
   * Log out and delete refresh token cookie
   */
  public static async logout(req: Request, res: Response) {
    res.clearCookie('refreshToken');
    return res.json({ message: 'Logged out successfully.' });
  }
}
