import { Request, Response } from 'express';
import prisma from '../config/db';
import { MailService } from '../services/mail.service';
import { WhatsAppService } from '../services/whatsapp.service';

export class LICController {
  /**
   * Register a new LIC policy for a customer
   */
  public static async createPolicy(req: Request, res: Response) {
    const { customerId, policyNumber, planName, sumAssured, premiumAmount, premiumMode, startDate, agentId, commissionRate } = req.body;

    if (!customerId || !policyNumber || !planName || !sumAssured || !premiumAmount || !premiumMode || !startDate) {
      return res.status(400).json({ error: 'Required LIC policy details are missing.' });
    }

    try {
      const sDate = new Date(startDate);
      // Calculate next due date based on premiumMode
      let dueDate = new Date(sDate);
      const mode = String(premiumMode).toUpperCase();
      
      if (mode === 'MONTHLY') dueDate.setMonth(dueDate.getMonth() + 1);
      else if (mode === 'QUARTERLY') dueDate.setMonth(dueDate.getMonth() + 3);
      else if (mode === 'HALF_YEARLY') dueDate.setMonth(dueDate.getMonth() + 6);
      else dueDate.setFullYear(dueDate.getFullYear() + 1); // YEARLY

      const policy = await prisma.lICPolicy.create({
        data: {
          customerId,
          policyNumber,
          planName,
          sumAssured: parseFloat(sumAssured),
          premiumAmount: parseFloat(premiumAmount),
          premiumMode: mode,
          startDate: sDate,
          dueDate,
          agentId: agentId || null,
          commissionRate: parseFloat(commissionRate || '15.0'),
          status: 'ACTIVE'
        },
        include: {
          customer: { include: { user: true } }
        }
      });

      // Send LIC policy enrollment next due notification
      try {
        await MailService.sendNextDueEmail(
          policy.customerId,
          policy.customer.user.email,
          policy.customer.user.fullName,
          `LIC Policy ${policy.planName} (${policy.policyNumber})`,
          policy.premiumAmount,
          policy.dueDate
        );
      } catch (mailErr) {
        console.error('Failed to send LIC policy join next due email', mailErr);
      }

      return res.status(210).json({
        message: 'LIC Policy registered successfully.',
        data: policy
      });
    } catch (err: any) {
      console.error('[Create Policy Error]', err);
      return res.status(400).json({ error: 'Registration failed. Policy number must be unique.' });
    }
  }

  /**
   * Record a premium payment, update the next premium due date, and log agent commission.
   */
  public static async payPremium(req: Request, res: Response) {
    const { id } = req.params; // Policy ID

    try {
      const policy = await prisma.lICPolicy.findUnique({
        where: { id },
        include: { customer: { include: { user: true } } }
      });

      if (!policy) {
        return res.status(404).json({ error: 'LIC Policy not found.' });
      }

      if (policy.status === 'LAPSED') {
        // Allow paying but mark status as active again
      }

      // Calculate Agent Commission = Premium * (commissionRate / 100)
      const commission = policy.premiumAmount * (policy.commissionRate / 100);

      // Determine next due date based on premiumMode
      let nextDue = new Date(policy.dueDate);
      const mode = policy.premiumMode.toUpperCase();
      
      if (mode === 'MONTHLY') nextDue.setMonth(nextDue.getMonth() + 1);
      else if (mode === 'QUARTERLY') nextDue.setMonth(nextDue.getMonth() + 3);
      else if (mode === 'HALF_YEARLY') nextDue.setMonth(nextDue.getMonth() + 6);
      else nextDue.setFullYear(nextDue.getFullYear() + 1); // YEARLY

      // Execute transaction: create history entry, update policy due date
      const [history, updatedPolicy] = await prisma.$transaction([
        prisma.lICPremiumHistory.create({
          data: {
            policyId: id,
            premiumAmount: policy.premiumAmount,
            agentCommission: commission,
            status: 'SUCCESS'
          }
        }),
        prisma.lICPolicy.update({
          where: { id },
          data: {
            dueDate: nextDue,
            status: 'ACTIVE'
          }
        })
      ]);

      // Notify customer
      await MailService.sendPaymentReceiptEmail(
        policy.customerId,
        policy.customer.user.email,
        policy.customer.user.fullName,
        `Premium payment for LIC Policy #${policy.policyNumber} (${policy.planName})`,
        policy.premiumAmount,
        `LIC_TXN_${history.id.substring(0, 8).toUpperCase()}`
      );

      await WhatsAppService.sendWhatsApp(
        policy.customerId,
        'PAYMENT_RECEIVED',
        policy.customer.user.phone,
        {
          customerName: policy.customer.user.fullName,
          amount: policy.premiumAmount.toLocaleString(),
          itemName: `LIC Policy #${policy.policyNumber} Premium`,
          date: new Date().toLocaleDateString()
        }
      );

      // Send next due notice for the updated premium period
      try {
        await MailService.sendNextDueEmail(
          policy.customerId,
          policy.customer.user.email,
          policy.customer.user.fullName,
          `LIC Policy ${policy.planName} (${policy.policyNumber})`,
          policy.premiumAmount,
          nextDue
        );
      } catch (mailErr) {
        console.error('Failed to send LIC next due notice on premium payment', mailErr);
      }

      return res.json({
        message: 'LIC Premium payment registered successfully. Next due date updated.',
        history,
        policy: updatedPolicy
      });
    } catch (err: any) {
      console.error('[Pay Premium Error]', err);
      return res.status(500).json({ error: 'Server error registering premium payment.' });
    }
  }

  /**
   * Fetch renewal notifications (policies with dues in the next 30 days or overdue)
   */
  public static async getRenewalAlerts(req: Request, res: Response) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30); // 30 days window

      const policies = await prisma.lICPolicy.findMany({
        where: {
          dueDate: {
            lte: targetDate
          },
          status: {
            not: 'MATURED'
          }
        },
        include: {
          customer: { include: { user: true } },
          agent: { select: { fullName: true, phone: true } }
        },
        orderBy: { dueDate: 'asc' }
      });

      return res.json(policies);
    } catch (err: any) {
      console.error('[Get LIC Alerts Error]', err);
      return res.status(500).json({ error: 'Server error checking renewal alerts.' });
    }
  }

  /**
   * Fetch all LIC policies with history
   */
  public static async getPolicies(req: Request, res: Response) {
    const { customerId } = req.query;

    try {
      const where: any = {};
      if (customerId) where.customerId = customerId;

      const policies = await prisma.lICPolicy.findMany({
        where,
        include: {
          customer: { include: { user: true } },
          agent: { select: { fullName: true, phone: true } },
          premiumHistory: { orderBy: { paidDate: 'desc' } }
        },
        orderBy: { startDate: 'desc' }
      });

      return res.json(policies);
    } catch (err: any) {
      console.error('[Get LIC Policies Error]', err);
      return res.status(500).json({ error: 'Server error retrieving policies.' });
    }
  }
}
