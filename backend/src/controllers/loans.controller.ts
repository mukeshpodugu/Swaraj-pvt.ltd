import { Request, Response } from 'express';
import prisma from '../config/db';
import { LoanStatus, PaymentStatus } from '../../../shared/src/types';
import { MailService } from '../services/mail.service';
import { WhatsAppService } from '../services/whatsapp.service';

export class LoansController {
  /**
   * Apply for a new loan
   */
  public static async applyForLoan(req: Request, res: Response) {
    const { customerId, loanType, principal, interestRate, tenorMonths, collateralDescription, guarantorName, guarantorPhone, collateralUrl } = req.body;

    if (!customerId || !loanType || !principal || !interestRate || !tenorMonths) {
      return res.status(400).json({ error: 'Required loan parameters missing.' });
    }

    try {
      const loan = await prisma.loan.create({
        data: {
          customerId,
          loanType,
          principal: parseFloat(principal),
          interestRate: parseFloat(interestRate),
          tenorMonths: parseInt(tenorMonths, 10),
          outstandingBalance: parseFloat(principal),
          status: LoanStatus.APPLIED,
          collateralDescription,
          guarantorName,
          guarantorPhone,
          collateralStatus: 'PENDING',
          collateralUrl
        },
        include: {
          customer: { include: { user: true } }
        }
      });

      return res.status(210).json({
        message: 'Loan application submitted successfully.',
        data: loan
      });
    } catch (err: any) {
      console.error('[Apply Loan Error]', err);
      return res.status(500).json({ error: 'Server error processing loan application.' });
    }
  }

  /**
   * Approve or reject a loan application
   */
  public static async approveLoan(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body; // APPROVED or REJECTED

    if (!status || ![LoanStatus.APPROVED, LoanStatus.REJECTED].includes(status)) {
      return res.status(400).json({ error: 'Invalid approval status choice.' });
    }

    try {
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: { customer: { include: { user: true } } }
      });

      if (!loan) {
        return res.status(404).json({ error: 'Loan application not found.' });
      }

      if (status === LoanStatus.APPROVED && loan.collateralStatus !== 'VERIFIED') {
        return res.status(400).json({ error: 'Collateral must be VERIFIED before approving and sanctioning this loan.' });
      }

      const updatedLoan = await prisma.loan.update({
        where: { id },
        data: {
          status,
          approvedDate: status === LoanStatus.APPROVED ? new Date() : null
        }
      });

      // Dispatch Notifications
      await MailService.sendLoanStatusEmail(
        loan.customerId,
        loan.customer.user.email,
        loan.customer.user.fullName,
        loan.loanType,
        loan.principal,
        status as 'APPROVED' | 'REJECTED'
      );

      await WhatsAppService.sendWhatsApp(
        loan.customerId,
        status === LoanStatus.APPROVED ? 'LOAN_APPROVAL' : 'LOAN_REJECTION',
        loan.customer.user.phone,
        {
          customerName: loan.customer.user.fullName,
          amount: loan.principal.toLocaleString(),
          itemName: `${loan.loanType} Loan`
        }
      );

      return res.json({
        message: `Loan status changed to ${status}.`,
        data: updatedLoan
      });
    } catch (err: any) {
      console.error('[Approve Loan Error]', err);
      return res.status(500).json({ error: 'Server error updating loan status.' });
    }
  }

  /**
   * Admin collateral assessment workflow: verify or reject submitted collateral
   */
  public static async verifyCollateral(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body; // VERIFIED or REJECTED

    if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid collateral status option.' });
    }

    try {
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: { customer: { include: { user: true } } }
      });

      if (!loan) {
        return res.status(404).json({ error: 'Loan not found.' });
      }

      const updatedLoan = await prisma.loan.update({
        where: { id },
        data: {
          collateralStatus: status
        }
      });

      // Send collateral update email notification
      try {
        await MailService.sendEmail(
          loan.customerId,
          loan.customer.user.email,
          `Collateral Review: ${status} - Swaraj Pvt. Limited`,
          'Collateral Assessment Update',
          `<h2>Collateral Document Review</h2>
           <p>Dear ${loan.customer.user.fullName},</p>
           <p>The collateral document you submitted for your <strong>${loan.loanType} Loan</strong> application has been reviewed by our auditing desk.</p>
           <table class="meta-table">
             <tr><th>Loan Type</th><td>${loan.loanType}</td></tr>
             <tr><th>Requested Capital</th><td>Rs. ${loan.principal.toLocaleString()}</td></tr>
             <tr><th>Collateral Assessment</th><td style="color: ${status === 'VERIFIED' ? '#10b981' : '#ef4444'}; font-weight: bold;">${status}</td></tr>
           </table>
           ${status === 'VERIFIED'
             ? `<p>Your collateral verification was successful. Your application is now in the queue for executive disbursal sanctioning.</p>`
             : `<p>Unfortunately, your collateral details were rejected. Please update your document details or contact your designated underwriting agent.</p>`
           }`,
          'COLLATERAL_VERIFICATION'
        );
      } catch (mailErr) {
        console.error('Failed to send collateral status email', mailErr);
      }

      return res.json({
        message: `Collateral status changed to ${status}.`,
        data: updatedLoan
      });
    } catch (err: any) {
      console.error('[Verify Collateral Error]', err);
      return res.status(500).json({ error: 'Server error updating collateral verification status.' });
    }
  }

  /**
   * Disburse the loan: mark status as DISBURSED, set disbursedDate,
   * and automatically generate the EMI installment schedule.
   */
  public static async disburseLoan(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: { customer: { include: { user: true } } }
      });

      if (!loan) {
        return res.status(404).json({ error: 'Loan not found.' });
      }

      if (loan.status !== LoanStatus.APPROVED) {
        return res.status(400).json({ error: 'Loan must be APPROVED before disbursal.' });
      }

      // Amortization EMI Calculation: P * r * (1+r)^n / ((1+r)^n - 1)
      const P = loan.principal;
      const annualR = loan.interestRate / 100;
      const r = annualR / 12;
      const n = loan.tenorMonths;

      const emi = r > 0 ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : P / n;
      const totalRepay = emi * n;
      
      const installmentsData = [];
      let outstanding = P;
      let currentDate = new Date();

      for (let i = 1; i <= n; i++) {
        // Increment date by one month for each installment
        currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        
        const interestForMonth = outstanding * r;
        const principalForMonth = emi - interestForMonth;
        
        installmentsData.push({
          loanId: loan.id,
          installmentNo: i,
          dueDate: new Date(currentDate),
          principalAmount: Math.round(principalForMonth * 100) / 100,
          interestAmount: Math.round(interestForMonth * 100) / 100,
          totalAmount: Math.round(emi * 100) / 100,
          paidAmount: 0,
          penaltyAmount: 0,
          status: PaymentStatus.UNPAID
        });

        outstanding -= principalForMonth;
      }

      // Execute transaction: Update loan status and insert EMI schedules
      const [updatedLoan] = await prisma.$transaction([
        prisma.loan.update({
          where: { id },
          data: {
            status: LoanStatus.DISBURSED,
            disbursedDate: new Date(),
            outstandingBalance: totalRepay
          }
        }),
        prisma.eMIInstallment.createMany({
          data: installmentsData
        })
      ]);

      // Send Next Due Email for EMI #1
      try {
        const cust = await prisma.customerProfile.findUnique({
          where: { id: loan.customerId },
          include: { user: true }
        });
        if (cust && installmentsData.length > 0) {
          await MailService.sendNextDueEmail(
            loan.customerId,
            cust.user.email,
            cust.user.fullName,
            `${loan.loanType} Loan EMI #1`,
            installmentsData[0].totalAmount,
            installmentsData[0].dueDate
          );
        }
      } catch (mailErr) {
        console.error('Failed to send next due email on disbursal', mailErr);
      }

      return res.json({
        message: 'Loan disbursed successfully and EMI schedule generated.',
        data: updatedLoan
      });
    } catch (err: any) {
      console.error('[Disburse Loan Error]', err);
      return res.status(500).json({ error: 'Server error processing loan disbursal.' });
    }
  }

  /**
   * Pay a specific EMI installment
   */
  public static async payEMI(req: Request, res: Response) {
    const { id, installmentId } = req.params;
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required.' });
    }

    try {
      const emi = await prisma.eMIInstallment.findUnique({
        where: { id: installmentId },
        include: { loan: { include: { customer: { include: { user: true } } } } }
      });

      if (!emi) {
        return res.status(404).json({ error: 'EMI Installment not found.' });
      }

      if (emi.status === PaymentStatus.PAID) {
        return res.status(400).json({ error: 'This EMI has already been paid.' });
      }

      const paymentVal = parseFloat(amount);
      const isPastDue = new Date() > emi.dueDate;
      
      // Calculate Penalty rate if overdue (e.g. 2% base rate on total due)
      let penalty = 0;
      if (isPastDue) {
        const settings = await prisma.companySetting.findFirst();
        const basePenalty = settings?.basePenaltyRate || 2.0;
        penalty = Math.round((emi.totalAmount * (basePenalty / 100)) * 100) / 100;
      }

      const requiredAmt = emi.totalAmount + penalty;
      const netPaid = emi.paidAmount + paymentVal;
      
      let newStatus: PaymentStatus = PaymentStatus.UNPAID;
      if (netPaid >= requiredAmt) {
        newStatus = PaymentStatus.PAID;
      } else if (isPastDue) {
        newStatus = PaymentStatus.OVERDUE;
      }

      // Update EMI installment & reduce Loan outstanding balance
      const [updatedEmi, updatedLoan] = await prisma.$transaction([
        prisma.eMIInstallment.update({
          where: { id: installmentId },
          data: {
            paidAmount: netPaid,
            penaltyAmount: penalty,
            paidDate: new Date(),
            status: newStatus
          }
        }),
        prisma.loan.update({
          where: { id: emi.loanId },
          data: {
            outstandingBalance: {
              decrement: paymentVal
            }
          }
        })
      ]);

      // Check if Loan is fully settled (closes loan automatically)
      if (updatedLoan.outstandingBalance <= 0) {
        await prisma.loan.update({
          where: { id: emi.loanId },
          data: {
            status: LoanStatus.CLOSED,
            closedDate: new Date(),
            outstandingBalance: 0
          }
        });
      }

      // Send Receipts
      await MailService.sendPaymentReceiptEmail(
        emi.loan.customerId,
        emi.loan.customer.user.email,
        emi.loan.customer.user.fullName,
        `EMI Installment #${emi.installmentNo} - ${emi.loan.loanType} Loan`,
        paymentVal,
        `EMI_TXN_${updatedEmi.id.substring(0, 8).toUpperCase()}`
      );

      await WhatsAppService.sendWhatsApp(
        emi.loan.customerId,
        'PAYMENT_RECEIVED',
        emi.loan.customer.user.phone,
        {
          customerName: emi.loan.customer.user.fullName,
          amount: paymentVal.toLocaleString(),
          itemName: `EMI #${emi.installmentNo} for ${emi.loan.loanType} Loan`,
          date: new Date().toLocaleDateString()
        }
      );

      // Send next due notice for subsequent EMI if applicable
      try {
        const nextEmi = await prisma.eMIInstallment.findFirst({
          where: {
            loanId: emi.loanId,
            installmentNo: emi.installmentNo + 1,
            status: PaymentStatus.UNPAID
          }
        });
        if (nextEmi) {
          await MailService.sendNextDueEmail(
            emi.loan.customerId,
            emi.loan.customer.user.email,
            emi.loan.customer.user.fullName,
            `${emi.loan.loanType} Loan EMI #${nextEmi.installmentNo}`,
            nextEmi.totalAmount,
            nextEmi.dueDate
          );
        }
      } catch (mailErr) {
        console.error('Failed to send next due email on EMI payment', mailErr);
      }

      return res.json({
        message: 'EMI Payment successfully received.',
        emi: updatedEmi,
        loanBalance: Math.max(0, updatedLoan.outstandingBalance)
      });
    } catch (err: any) {
      console.error('[Pay EMI Error]', err);
      return res.status(500).json({ error: 'Server error processing EMI payment.' });
    }
  }

  /**
   * Record a custom part payment that reduces the principal outstanding directly
   */
  public static async makePartPayment(req: Request, res: Response) {
    const { id } = req.params; // Loan ID
    const { amount, notes } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid part payment amount is required.' });
    }

    try {
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: { customer: { include: { user: true } } }
      });

      if (!loan) {
        return res.status(404).json({ error: 'Loan not found.' });
      }

      const paymentVal = parseFloat(amount);

      // Create transaction: record part payment, reduce loan outstanding
      const [partPayment, updatedLoan] = await prisma.$transaction([
        prisma.partPayment.create({
          data: {
            loanId: id,
            amount: paymentVal,
            notes: notes || 'Part payment principal reduction'
          }
        }),
        prisma.loan.update({
          where: { id },
          data: {
            outstandingBalance: {
              decrement: paymentVal
            }
          }
        })
      ]);

      // If outstanding balance is fully paid, close the loan
      if (updatedLoan.outstandingBalance <= 0) {
        await prisma.loan.update({
          where: { id },
          data: {
            status: LoanStatus.CLOSED,
            closedDate: new Date(),
            outstandingBalance: 0
          }
        });
      }

      // Send Receipts
      await MailService.sendPaymentReceiptEmail(
        loan.customerId,
        loan.customer.user.email,
        loan.customer.user.fullName,
        `Part Payment Principal Reduction - ${loan.loanType} Loan`,
        paymentVal,
        `PART_TXN_${partPayment.id.substring(0, 8).toUpperCase()}`
      );

      return res.json({
        message: 'Part-payment successfully processed. Loan outstanding balance reduced.',
        partPayment,
        outstandingBalance: Math.max(0, updatedLoan.outstandingBalance)
      });
    } catch (err: any) {
      console.error('[Part Payment Error]', err);
      return res.status(500).json({ error: 'Server error processing part-payment.' });
    }
  }

  /**
   * Fetch all loans in database (with customer profiles)
   */
  public static async getAllLoans(req: Request, res: Response) {
    const { status, customerId } = req.query;

    try {
      const where: any = {};
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;

      const loans = await prisma.loan.findMany({
        where,
        include: {
          customer: {
            include: { user: true }
          },
          emiInstallments: {
            orderBy: { installmentNo: 'asc' }
          },
          partPayments: {
            orderBy: { paymentDate: 'desc' }
          }
        },
        orderBy: { appliedDate: 'desc' }
      });

      return res.json(loans);
    } catch (err: any) {
      console.error('[Get All Loans Error]', err);
      return res.status(500).json({ error: 'Server error retrieving loans list.' });
    }
  }
}
