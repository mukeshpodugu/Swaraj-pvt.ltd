import { Request, Response } from 'express';
import prisma from '../config/db';
import { PaymentStatus } from '../../../shared/src/types';
import { MailService } from '../services/mail.service';
import { WhatsAppService } from '../services/whatsapp.service';

export class ChitsController {
  /**
   * Create a new Chit Group
   */
  public static async createChitGroup(req: Request, res: Response) {
    const { name, groupValue, durationMonths, maxMembers, commissionRate, startDate } = req.body;

    if (!name || !groupValue || !durationMonths || !maxMembers || !startDate) {
      return res.status(400).json({ error: 'Required chit parameters missing.' });
    }

    try {
      const gVal = parseFloat(groupValue);
      const dur = parseInt(durationMonths, 10);
      const monthlyContribution = gVal / dur;

      const group = await prisma.chitGroup.create({
        data: {
          name,
          groupValue: gVal,
          durationMonths: dur,
          maxMembers: parseInt(maxMembers, 10),
          monthlyContribution,
          commissionRate: parseFloat(commissionRate || '5.0'),
          startDate: new Date(startDate),
          status: 'ACTIVE'
        }
      });

      return res.status(210).json({
        message: 'Chit group created successfully.',
        data: group
      });
    } catch (err: any) {
      console.error('[Create Chit Group Error]', err);
      return res.status(400).json({ error: 'Group creation failed. Name may already be taken.' });
    }
  }

  /**
   * Enroll a customer into a Chit Group (Allocates slot number)
   */
  public static async joinChitGroup(req: Request, res: Response) {
    const { id } = req.params; // Chit Group ID
    const { customerId, slotNumber } = req.body;

    if (!customerId || !slotNumber) {
      return res.status(400).json({ error: 'Customer ID and slot number are required.' });
    }

    try {
      const group = await prisma.chitGroup.findUnique({
        where: { id },
        include: { members: true }
      });

      if (!group) {
        return res.status(404).json({ error: 'Chit group not found.' });
      }

      if (group.members.length >= group.maxMembers) {
        return res.status(400).json({ error: 'Chit group is already full.' });
      }

      const slot = parseInt(slotNumber, 10);
      
      // Verify slot is vacant
      const isSlotTaken = group.members.some((m) => m.slotNumber === slot);
      if (isSlotTaken) {
        return res.status(400).json({ error: `Slot number ${slot} is already occupied.` });
      }

      // Verify customer is not already in group
      const isMember = group.members.some((m) => m.customerId === customerId);
      if (isMember) {
        return res.status(400).json({ error: 'Customer is already enrolled in this Chit group.' });
      }

      const member = await prisma.chitMember.create({
        data: {
          chitGroupId: id,
          customerId,
          slotNumber: slot
        },
        include: {
          customer: { include: { user: true } }
        }
      });

      // Send Chit enrollment confirmation email
      try {
        await MailService.sendEmail(
          customerId,
          member.customer.user.email,
          `Enrolled in Chit Group: ${group.name}`,
          'Chit Registration Successful',
          `<h2>Chit Group Enrollment</h2>
           <p>Dear ${member.customer.user.fullName},</p>
           <p>You have successfully registered in Chit Group <strong>${group.name}</strong>.</p>
           <table class="meta-table">
             <tr><th>Chit Group</th><td>${group.name}</td></tr>
             <tr><th>Allocated Slot</th><td>Slot #${slot}</td></tr>
             <tr><th>Group Value</th><td>Rs. ${group.groupValue.toLocaleString()}</td></tr>
             <tr><th>Monthly Subscription</th><td>Rs. ${group.monthlyContribution.toLocaleString()}</td></tr>
           </table>
           <p>Monthly bidding auctions will be conducted according to schedule, and you will be notified of net dues and dividend payouts after each auction.</p>`,
          'CHIT_ENROLLMENT'
        );
      } catch (mailErr) {
        console.error('Failed to send chit join confirmation email', mailErr);
      }

      return res.status(210).json({
        message: 'Customer enrolled in Chit group successfully.',
        data: member
      });
    } catch (err: any) {
      console.error('[Join Chit Error]', err);
      return res.status(500).json({ error: 'Server error enrolling customer in Chit group.' });
    }
  }

  /**
   * Conduct monthly chit auction: registers winner, computes dividend distribution pool,
   * creates next-installment due receipts for all other group members.
   */
  public static async conductAuction(req: Request, res: Response) {
    const { id } = req.params; // Chit Group ID
    const { installmentNo, winningBidderId, bidAmount } = req.body;

    if (!installmentNo || !winningBidderId || bidAmount === undefined) {
      return res.status(400).json({ error: 'Required auction resolution details missing.' });
    }

    try {
      const group = await prisma.chitGroup.findUnique({
        where: { id },
        include: { members: { include: { customer: { include: { user: true } } } } }
      });

      if (!group) {
        return res.status(404).json({ error: 'Chit group not found.' });
      }

      const instNo = parseInt(installmentNo, 10);
      const bidVal = parseFloat(bidAmount);

      // Verify auction wasn't already conducted for this month
      const existingAuction = await prisma.chitAuction.findFirst({
        where: { chitGroupId: id, installmentNo: instNo }
      });
      if (existingAuction) {
        return res.status(400).json({ error: `Auction for installment #${instNo} has already been resolved.` });
      }

      // Calculations:
      // Group value = Rs 1,00,000. Winning bid = Rs 20,000 (discount).
      // Commission (e.g. 5%) = Rs 5,000.
      // Dividend Pool = Bid - Commission = Rs 15,000.
      // Dividend per Member = Rs 15,000 / Max Members (e.g., 20) = Rs 750.
      // Net installment due from other members = Monthly Contribution (Rs 5,000) - Dividend (Rs 750) = Rs 4,250.
      // Prize amount paid to winner = Group Value - Bid Amount = Rs 80,000.
      const commission = group.groupValue * (group.commissionRate / 100);
      const dividendPool = Math.max(0, bidVal - commission);
      const dividendPerMember = dividendPool / group.maxMembers;
      const netMonthlyContribution = group.monthlyContribution - dividendPerMember;
      const prizeAmount = group.groupValue - bidVal;

      // 1. Create Auction Entry
      const auction = await prisma.chitAuction.create({
        data: {
          chitGroupId: id,
          installmentNo: instNo,
          winningBidderId,
          bidAmount: bidVal,
          dividendDistributed: dividendPerMember,
          nextInstallmentAmount: netMonthlyContribution
        }
      });

      // 2. Generate Chit Installment records for this installment number for ALL members
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 10); // Due in 10 days

      const installmentRecords = group.members.map((member) => {
        const isWinner = member.customerId === winningBidderId;
        return {
          chitGroupId: id,
          customerId: member.customerId,
          installmentNo: instNo,
          dueDate,
          dueAmount: netMonthlyContribution,
          paidAmount: isWinner ? netMonthlyContribution : 0, // Winner's contribution can be net set off
          penaltyAmount: 0,
          status: isWinner ? PaymentStatus.PAID : PaymentStatus.UNPAID,
          paidDate: isWinner ? new Date() : null
        };
      });

      await prisma.chitInstallment.createMany({
        data: installmentRecords
      });

      // 3. Update group status if final installment completed
      if (instNo === group.durationMonths) {
        await prisma.chitGroup.update({
          where: { id },
          data: { status: 'COMPLETED' }
        });
      }

      // Notify winner
      const winnerMember = group.members.find((m) => m.customerId === winningBidderId);
      if (winnerMember) {
        await MailService.sendEmail(
          winningBidderId,
          winnerMember.customer.user.email,
          `Congratulations: You won Chit Auction for ${group.name}!`,
          'Chit Auction Winner',
          `<h2>Chit Auction Won</h2>
           <p>Dear ${winnerMember.customer.user.fullName},</p>
           <p>You have won the auction for installment #${instNo} of Chit Group <strong>${group.name}</strong>.</p>
           <table class="meta-table">
             <tr><th>Group Name</th><td>${group.name}</td></tr>
             <tr><th>Installment No</th><td>#${instNo}</td></tr>
             <tr><th>Bid Discount Value</th><td>Rs. ${bidVal.toLocaleString()}</td></tr>
             <tr><th>Net Prize Amount Payable</th><td style="color: #10b981; font-weight: bold;">Rs. ${prizeAmount.toLocaleString()}</td></tr>
           </table>
           <p>Our cash department will arrange the payout coordinates within 48 business hours.</p>`,
          'CHIT_WINNER'
        );

        await WhatsAppService.sendWhatsApp(
          winningBidderId,
          'PAYMENT_RECEIVED',
          winnerMember.customer.user.phone,
          {
            customerName: winnerMember.customer.user.fullName,
            amount: prizeAmount.toLocaleString(),
            itemName: `Prize payout for Chit Auction #${instNo} (${group.name})`,
            date: new Date().toLocaleDateString()
          }
        );
      }

      // Send next due notices to all other group members
      for (const member of group.members) {
        if (member.customerId !== winningBidderId) {
          try {
            await MailService.sendNextDueEmail(
              member.customerId,
              member.customer.user.email,
              member.customer.user.fullName,
              `Chit "${group.name}" Installment #${instNo}`,
              netMonthlyContribution,
              dueDate
            );
          } catch (mailErr) {
            console.error(`Failed to send next due email to chit subscriber ${member.customerId}`, mailErr);
          }
        }
      }

      return res.json({
        message: `Auction for installment #${instNo} completed. Dividends distributed.`,
        auction,
        dividendPerMember,
        nextDueAmount: netMonthlyContribution,
        prizeAmountPaid: prizeAmount
      });
    } catch (err: any) {
      console.error('[Conduct Auction Error]', err);
      return res.status(500).json({ error: 'Server error conducting chit auction.' });
    }
  }

  /**
   * Pay a monthly chit installment contribution
   */
  public static async payInstallment(req: Request, res: Response) {
    const { installmentId } = req.params;
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required.' });
    }

    try {
      const installment = await prisma.chitInstallment.findUnique({
        where: { id: installmentId },
        include: {
          chitGroup: true,
          customer: { include: { user: true } }
        }
      });

      if (!installment) {
        return res.status(404).json({ error: 'Chit installment record not found.' });
      }

      if (installment.status === PaymentStatus.PAID) {
        return res.status(400).json({ error: 'Installment is already fully paid.' });
      }

      const payVal = parseFloat(amount);
      const isPastDue = new Date() > installment.dueDate;
      
      // Calculate penalty if past due date
      let penalty = 0;
      if (isPastDue) {
        const settings = await prisma.companySetting.findFirst();
        const penaltyRate = settings?.basePenaltyRate || 2.0;
        penalty = Math.round((installment.dueAmount * (penaltyRate / 100)) * 100) / 100;
      }

      const totalRequired = installment.dueAmount + penalty;
      const netPaid = installment.paidAmount + payVal;
      
      let newStatus: PaymentStatus = PaymentStatus.UNPAID;
      if (netPaid >= totalRequired) {
        newStatus = PaymentStatus.PAID;
      } else if (isPastDue) {
        newStatus = PaymentStatus.OVERDUE;
      }

      const updatedInstallment = await prisma.chitInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: netPaid,
          penaltyAmount: penalty,
          paidDate: new Date(),
          status: newStatus
        }
      });

      // Send Receipts
      await MailService.sendPaymentReceiptEmail(
        installment.customerId,
        installment.customer.user.email,
        installment.customer.user.fullName,
        `Chit Group ${installment.chitGroup.name} - Installment #${installment.installmentNo}`,
        payVal,
        `CHIT_TXN_${updatedInstallment.id.substring(0, 8).toUpperCase()}`
      );

      await WhatsAppService.sendWhatsApp(
        installment.customerId,
        'PAYMENT_RECEIVED',
        installment.customer.user.phone,
        {
          customerName: installment.customer.user.fullName,
          amount: payVal.toLocaleString(),
          itemName: `Chit Installment #${installment.installmentNo} (${installment.chitGroup.name})`,
          date: new Date().toLocaleDateString()
        }
      );

      return res.json({
        message: 'Chit installment contribution received successfully.',
        data: updatedInstallment
      });
    } catch (err: any) {
      console.error('[Pay Installment Error]', err);
      return res.status(500).json({ error: 'Server error processing chit payment.' });
    }
  }

  /**
   * Fetch all chit groups with member metrics
   */
  public static async getChitGroups(req: Request, res: Response) {
    try {
      const groups = await prisma.chitGroup.findMany({
        include: {
          members: {
            include: { customer: { include: { user: true } } }
          },
          auctions: {
            include: { winningBidder: { include: { user: true } } },
            orderBy: { installmentNo: 'asc' }
          },
          installments: {
            orderBy: { installmentNo: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      });
      return res.json(groups);
    } catch (err: any) {
      console.error('[Get Chits Error]', err);
      return res.status(500).json({ error: 'Server error retrieving chit groups.' });
    }
  }
}
