import { Request, Response } from 'express';
import prisma from '../config/db';

export class SettingsController {
  /**
   * Fetch company settings (creates default settings row if none exists)
   */
  public static async getSettings(req: Request, res: Response) {
    try {
      let settings = await prisma.companySetting.findFirst();
      if (!settings) {
        settings = await prisma.companySetting.create({
          data: {
            companyName: 'Swaraj Pvt. Limited',
            address: '123 Swaraj Chowk, Finance District, New Delhi',
            baseInterestRate: 12.0,
            basePenaltyRate: 2.0,
            smtpHost: 'smtp.mailtrap.io',
            smtpPort: 2525
          }
        });
      }
      return res.json(settings);
    } catch (err: any) {
      console.error('[Get Settings Error]', err);
      return res.status(500).json({ error: 'Server error retrieving settings.' });
    }
  }

  /**
   * Update company settings
   */
  public static async updateSettings(req: Request, res: Response) {
    const {
      companyName,
      logoUrl,
      address,
      baseInterestRate,
      basePenaltyRate,
      smsApiKey,
      whatsappApiKey,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      backupSchedule
    } = req.body;

    try {
      const current = await prisma.companySetting.findFirst();
      const settingsId = current?.id;

      const dataPayload = {
        ...(companyName && { companyName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(address && { address }),
        ...(baseInterestRate !== undefined && { baseInterestRate: parseFloat(baseInterestRate) }),
        ...(basePenaltyRate !== undefined && { basePenaltyRate: parseFloat(basePenaltyRate) }),
        ...(smsApiKey !== undefined && { smsApiKey }),
        ...(whatsappApiKey !== undefined && { whatsappApiKey }),
        ...(smtpHost && { smtpHost }),
        ...(smtpPort !== undefined && { smtpPort: parseInt(smtpPort, 10) }),
        ...(smtpUser !== undefined && { smtpUser }),
        ...(smtpPass !== undefined && { smtpPass }),
        ...(smtpFrom && { smtpFrom }),
        ...(backupSchedule && { backupSchedule })
      };

      let settings;
      if (settingsId) {
        settings = await prisma.companySetting.update({
          where: { id: settingsId },
          data: dataPayload
        });
      } else {
        settings = await prisma.companySetting.create({
          data: dataPayload
        });
      }

      return res.json({
        message: 'Settings updated successfully.',
        data: settings
      });
    } catch (err: any) {
      console.error('[Update Settings Error]', err);
      return res.status(500).json({ error: 'Server error updating settings.' });
    }
  }

  /**
   * Fetch system logs (Audit and Notification logs combined/separate)
   */
  public static async getSystemLogs(req: Request, res: Response) {
    const { type = 'audit', limit = '100' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    try {
      if (type === 'notifications') {
        const logs = await prisma.notificationLog.findMany({
          include: { customer: { include: { user: true } } },
          orderBy: { createdAt: 'desc' },
          take: limitNum
        });
        return res.json(logs);
      } else {
        const logs = await prisma.auditLog.findMany({
          include: { user: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: limitNum
        });
        return res.json(logs);
      }
    } catch (err: any) {
      console.error('[Get Logs Error]', err);
      return res.status(500).json({ error: 'Server error retrieving system log history.' });
    }
  }

  /**
   * Export database JSON backup
   */
  public static async exportBackup(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany();
      const profiles = await prisma.customerProfile.findMany();
      const loans = await prisma.loan.findMany();
      const emis = await prisma.eMIInstallment.findMany();
      const parts = await prisma.partPayment.findMany();
      const chitGroups = await prisma.chitGroup.findMany();
      const chitMembers = await prisma.chitMember.findMany();
      const chitAuctions = await prisma.chitAuction.findMany();
      const chitInstallments = await prisma.chitInstallment.findMany();
      const licPolicies = await prisma.lICPolicy.findMany();
      const licHistory = await prisma.lICPremiumHistory.findMany();
      const settings = await prisma.companySetting.findMany();
      const predictions = await prisma.aIPredictionLog.findMany();
      const audits = await prisma.auditLog.findMany();
      const notifications = await prisma.notificationLog.findMany();

      const backupContainer = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        tables: {
          users,
          profiles,
          loans,
          emis,
          parts,
          chitGroups,
          chitMembers,
          chitAuctions,
          chitInstallments,
          licPolicies,
          licHistory,
          settings,
          predictions,
          audits,
          notifications
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="Swaraj_DB_Backup_${Date.now()}.json"`);
      return res.send(JSON.stringify(backupContainer, null, 2));
    } catch (err: any) {
      console.error('[Export Backup Error]', err);
      return res.status(500).json({ error: 'Server error compiling database JSON backup.' });
    }
  }

  /**
   * Restore database from uploaded JSON backup
   */
  public static async restoreBackup(req: Request, res: Response) {
    const { backupData } = req.body;

    if (!backupData || !backupData.tables) {
      return res.status(400).json({ error: 'Valid database JSON backup data is required.' });
    }

    try {
      const tables = backupData.tables;

      // Truncate tables in dependency order
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "NotificationLog" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AuditLog" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AIPredictionLog" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "LICPremiumHistory" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "LICPolicy" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ChitInstallment" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ChitAuction" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ChitMember" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ChitGroup" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "PartPayment" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "EMIInstallment" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Loan" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CustomerProfile" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CompanySetting" CASCADE;`);

      // Write settings back
      if (tables.settings?.length) {
        await prisma.companySetting.createMany({ data: tables.settings });
      }
      // Users & profiles
      if (tables.users?.length) {
        await prisma.user.createMany({ data: tables.users });
      }
      if (tables.profiles?.length) {
        await prisma.customerProfile.createMany({ data: tables.profiles });
      }
      // Loans & EMIs
      if (tables.loans?.length) {
        await prisma.loan.createMany({ data: tables.loans });
      }
      if (tables.emis?.length) {
        await prisma.eMIInstallment.createMany({ data: tables.emis });
      }
      if (tables.parts?.length) {
        await prisma.partPayment.createMany({ data: tables.parts });
      }
      // Chit fund models
      if (tables.chitGroups?.length) {
        await prisma.chitGroup.createMany({ data: tables.chitGroups });
      }
      if (tables.chitMembers?.length) {
        await prisma.chitMember.createMany({ data: tables.chitMembers });
      }
      if (tables.chitAuctions?.length) {
        await prisma.chitAuction.createMany({ data: tables.chitAuctions });
      }
      if (tables.chitInstallments?.length) {
        await prisma.chitInstallment.createMany({ data: tables.chitInstallments });
      }
      // LIC Insurance models
      if (tables.licPolicies?.length) {
        await prisma.lICPolicy.createMany({ data: tables.licPolicies });
      }
      if (tables.licHistory?.length) {
        await prisma.lICPremiumHistory.createMany({ data: tables.licHistory });
      }
      // Logs & Predictions
      if (tables.predictions?.length) {
        await prisma.aIPredictionLog.createMany({ data: tables.predictions });
      }
      if (tables.audits?.length) {
        await prisma.auditLog.createMany({ data: tables.audits });
      }
      if (tables.notifications?.length) {
        await prisma.notificationLog.createMany({ data: tables.notifications });
      }

      return res.json({ message: 'Database successfully restored from JSON backup container.' });
    } catch (err: any) {
      console.error('[Restore Backup Error]', err);
      return res.status(500).json({ error: 'Server error restoring tables. Database constraints may have failed.' });
    }
  }
}
