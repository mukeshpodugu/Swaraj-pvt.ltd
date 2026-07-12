import { Request, Response } from 'express';
import prisma from '../config/db';
import { KYCStatus } from '../../../shared/src/types';

export class CustomersController {
  /**
   * Fetch all customers with filters (name/email, KYC status, general status) and pagination
   */
  public static async getCustomers(req: Request, res: Response) {
    const { search, kycStatus, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
      const whereClause: any = {};

      if (kycStatus && Object.values(KYCStatus).includes(kycStatus as any)) {
        whereClause.kycStatus = kycStatus;
      }
      if (status) {
        whereClause.status = status;
      }
      if (search) {
        const searchStr = search as string;
        whereClause.OR = [
          { aadhaar: { contains: searchStr, mode: 'insensitive' } },
          { pan: { contains: searchStr, mode: 'insensitive' } },
          { user: { fullName: { contains: searchStr, mode: 'insensitive' } } },
          { user: { email: { contains: searchStr, mode: 'insensitive' } } },
          { user: { phone: { contains: searchStr, mode: 'insensitive' } } }
        ];
      }

      const [customers, totalCount] = await prisma.$transaction([
        prisma.customerProfile.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                role: true
              }
            }
          },
          orderBy: { id: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.customerProfile.count({ where: whereClause })
      ]);

      return res.json({
        data: customers,
        meta: {
          totalCount,
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          limit: limitNum
        }
      });
    } catch (err: any) {
      console.error('[Get Customers Error]', err);
      return res.status(500).json({ error: 'Server error retrieving customers.' });
    }
  }

  /**
   * Fetch a single customer's full profile details
   */
  public static async getCustomerById(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const customer = await prisma.customerProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, phone: true }
          },
          loans: {
            orderBy: { appliedDate: 'desc' }
          },
          chits: {
            include: {
              chitGroup: true
            }
          },
          licPolicies: {
            orderBy: { startDate: 'desc' }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found.' });
      }

      return res.json(customer);
    } catch (err: any) {
      console.error('[Get Customer By ID Error]', err);
      return res.status(500).json({ error: 'Server error retrieving customer details.' });
    }
  }

  /**
   * Update customer profile attributes
   */
  public static async updateProfile(req: Request, res: Response) {
    const { id } = req.params;
    const {
      aadhaar,
      pan,
      photoUrl,
      address,
      nomineeName,
      nomineeRelation,
      nomineePhone,
      employmentStatus,
      employerName,
      monthlyIncome,
      fullName,
      phone
    } = req.body;

    try {
      // Fetch current profile to get user ID
      const profile = await prisma.customerProfile.findUnique({ where: { id } });
      if (!profile) {
        return res.status(404).json({ error: 'Customer profile not found.' });
      }

      // Update User fields if provided
      if (fullName || phone) {
        await prisma.user.update({
          where: { id: profile.userId },
          data: {
            ...(fullName && { fullName }),
            ...(phone && { phone })
          }
        });
      }

      // Update CustomerProfile fields
      const updatedProfile = await prisma.customerProfile.update({
        where: { id },
        data: {
          ...(aadhaar && { aadhaar }),
          ...(pan && { pan }),
          ...(photoUrl !== undefined && { photoUrl }),
          ...(address && { address }),
          ...(nomineeName && { nomineeName }),
          ...(nomineeRelation && { nomineeRelation }),
          ...(nomineePhone && { nomineePhone }),
          ...(employmentStatus && { employmentStatus }),
          ...(employerName !== undefined && { employerName }),
          ...(monthlyIncome !== undefined && { monthlyIncome: parseFloat(monthlyIncome) }),
          kycStatus: 'PENDING' // Reset to pending KYC when structural documents update
        },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, phone: true }
          }
        }
      });

      return res.json({
        message: 'Profile updated successfully. Resubmitted for KYC review.',
        data: updatedProfile
      });
    } catch (err: any) {
      console.error('[Update Profile Error]', err);
      return res.status(500).json({ error: 'Server error updating profile.' });
    }
  }

  /**
   * Admin verification endpoint for Customer KYC
   */
  public static async verifyKYC(req: Request, res: Response) {
    const { id } = req.params;
    const { status, notes } = req.body; // status: VERIFIED or REJECTED

    if (!status || !Object.values(KYCStatus).includes(status)) {
      return res.status(400).json({ error: 'Valid KYC Status (VERIFIED / REJECTED) is required.' });
    }

    try {
      const profile = await prisma.customerProfile.update({
        where: { id },
        data: {
          kycStatus: status as any,
          kycNotes: notes || null,
          verifiedAt: status === 'VERIFIED' ? new Date() : null
        },
        include: {
          user: { select: { fullName: true } }
        }
      });

      // Write custom system audit entry
      await prisma.auditLog.create({
        data: {
          action: `KYC_${status}`,
          details: `Admin resolved KYC for ${profile.user.fullName}. Status: ${status}`
        }
      });

      return res.json({
        message: `KYC status resolved to ${status} successfully.`,
        data: profile
      });
    } catch (err: any) {
      console.error('[Verify KYC Error]', err);
      return res.status(500).json({ error: 'Server error resolving KYC.' });
    }
  }

  /**
   * Aggregates a multi-resource calendar history/timeline for the customer's financial engagements
   */
  public static async getCustomerTimeline(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const profile = await prisma.customerProfile.findUnique({
        where: { id },
        include: {
          user: true,
          loans: {
            include: { emiInstallments: true, partPayments: true }
          },
          chits: {
            include: {
              chitGroup: {
                include: { auctions: true, installments: { where: { customerId: id } } }
              }
            }
          },
          licPolicies: {
            include: { premiumHistory: true }
          },
          notifications: {
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        }
      });

      if (!profile) {
        return res.status(404).json({ error: 'Customer not found.' });
      }

      const timeline: Array<{
        date: Date;
        type: string;
        title: string;
        description: string;
        amount?: number;
        status?: string;
      }> = [];

      // 1. Account Creation
      timeline.push({
        date: profile.user.createdAt,
        type: 'ACCOUNT',
        title: 'Account Registered',
        description: 'Customer registered on Swaraj FinancePro Portal.'
      });

      // 2. KYC verification
      if (profile.verifiedAt) {
        timeline.push({
          date: profile.verifiedAt,
          type: 'KYC',
          title: 'KYC Approved',
          description: 'Aadhaar, PAN, and Photo KYC documents verified by Compliance Officer.'
        });
      }

      // 3. Loans timeline (Disbursals, EMI paid, Part-payments)
      profile.loans.forEach((loan) => {
        timeline.push({
          date: loan.appliedDate,
          type: 'LOAN_APPLIED',
          title: `${loan.loanType} Loan Applied`,
          description: `Applied for Rs. ${loan.principal.toLocaleString()} loan.`,
          amount: loan.principal,
          status: loan.status
        });

        if (loan.disbursedDate) {
          timeline.push({
            date: loan.disbursedDate,
            type: 'LOAN_DISBURSED',
            title: `${loan.loanType} Loan Disbursed`,
            description: `Principal of Rs. ${loan.principal.toLocaleString()} disbursed.`,
            amount: loan.principal
          });
        }

        loan.emiInstallments.forEach((emi) => {
          if (emi.paidDate) {
            timeline.push({
              date: emi.paidDate,
              type: 'EMI_PAYMENT',
              title: `EMI Installment #${emi.installmentNo} Paid`,
              description: `Paid monthly EMI of Rs. ${emi.paidAmount.toLocaleString()}`,
              amount: emi.paidAmount
            });
          }
        });

        loan.partPayments.forEach((part) => {
          timeline.push({
            date: part.paymentDate,
            type: 'LOAN_PART_PAYMENT',
            title: 'Loan Part-Payment Received',
            description: `Principal reduction payment of Rs. ${part.amount.toLocaleString()} processed.`,
            amount: part.amount
          });
        });
      });

      // 4. Chits Timeline (Joined, Auctions Won, Monthly Payments)
      profile.chits.forEach((membership) => {
        timeline.push({
          date: membership.joinedDate,
          type: 'CHIT_JOINED',
          title: `Joined Chit Group: ${membership.chitGroup.name}`,
          description: `Allocated Slot Number #${membership.slotNumber}. Monthly contribution: Rs. ${membership.chitGroup.monthlyContribution.toLocaleString()}`
        });

        // Bidding winnings
        membership.chitGroup.auctions.forEach((auction) => {
          if (auction.winningBidderId === id) {
            timeline.push({
              date: auction.auctionDate,
              type: 'CHIT_AUCTION_WON',
              title: `Won Chit Auction - Installment #${auction.installmentNo}`,
              description: `Bid amount: Rs. ${auction.bidAmount.toLocaleString()} foregone. Net dividend shared to group.`,
              amount: membership.chitGroup.groupValue - auction.bidAmount
            });
          }
        });

        // Chit Installment payments
        membership.chitGroup.installments.forEach((inst) => {
          if (inst.paidDate) {
            timeline.push({
              date: inst.paidDate,
              type: 'CHIT_PAYMENT',
              title: `Chit Installment #${inst.installmentNo} Paid`,
              description: `Paid Rs. ${inst.paidAmount.toLocaleString()} to ${membership.chitGroup.name}.`,
              amount: inst.paidAmount
            });
          }
        });
      });

      // 5. LIC Policies Timeline (Purchases, Premium History)
      profile.licPolicies.forEach((policy) => {
        timeline.push({
          date: policy.startDate,
          type: 'LIC_POLICY_START',
          title: `LIC Policy Registered: ${policy.planName}`,
          description: `Policy Number ${policy.policyNumber} active. Sum Assured: Rs. ${policy.sumAssured.toLocaleString()}`,
          amount: policy.premiumAmount
        });

        policy.premiumHistory.forEach((prem) => {
          timeline.push({
            date: prem.paidDate,
            type: 'LIC_PREMIUM_PAID',
            title: `LIC Premium Paid - Policy ${policy.policyNumber}`,
            description: `Premium payment of Rs. ${prem.premiumAmount.toLocaleString()} confirmed. Agent commission generated.`,
            amount: prem.premiumAmount
          });
        });
      });

      // 6. Notification Dispatch history
      profile.notifications.forEach((notif) => {
        timeline.push({
          date: notif.createdAt,
          type: `NOTIF_${notif.channel}`,
          title: `${notif.channel} Alert Sent`,
          description: `Template: ${notif.templateName} | Recipient: ${notif.recipient} | Delivery Status: ${notif.status}`
        });
      });

      // Sort timeline chronologically (latest first)
      timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

      return res.json(timeline);
    } catch (err: any) {
      console.error('[Get Customer Timeline Error]', err);
      return res.status(500).json({ error: 'Server error generating timeline logs.' });
    }
  }
}
