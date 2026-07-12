import { Request, Response } from 'express';
import prisma from '../config/db';
import { AIService } from '../services/ai.service';

export class AIController {
  /**
   * Run Loan Approval Prediction
   */
  public static async predictApproval(req: Request, res: Response) {
    const { customerId, requestedPrincipal, tenorMonths, interestRate, otherEMIs, hasCollateral } = req.body;

    if (!customerId || !requestedPrincipal || !tenorMonths || !interestRate) {
      return res.status(400).json({ error: 'Missing input parameters for loan approval prediction.' });
    }

    try {
      // 1. Gather database customer context (income, late payment counts)
      const profile = await prisma.customerProfile.findUnique({
        where: { id: customerId },
        include: {
          user: true,
          loans: { include: { emiInstallments: true } },
          chits: { include: { chitGroup: { include: { installments: { where: { customerId } } } } } }
        }
      });

      if (!profile) {
        return res.status(404).json({ error: 'Customer profile not found.' });
      }

      // Count late payments (EMI installments overdue/unpaid past due date OR chit installments unpaid past due date)
      let latePayments = 0;
      profile.loans.forEach((loan) => {
        loan.emiInstallments.forEach((emi) => {
          if (emi.status === 'OVERDUE' || (emi.status === 'UNPAID' && new Date() > emi.dueDate)) {
            latePayments++;
          }
        });
      });
      profile.chits.forEach((membership) => {
        membership.chitGroup.installments.forEach((inst) => {
          if (inst.status === 'OVERDUE' || (inst.status === 'UNPAID' && new Date() > inst.dueDate)) {
            latePayments++;
          }
        });
      });

      // Fetch dynamic credit score
      const creditEval = AIService.calculateCustomerCreditScore(
        profile.monthlyIncome,
        profile.loans.reduce((sum, l) => sum + l.outstandingBalance, 0),
        latePayments,
        profile.loans.reduce((sum, l) => sum + l.emiInstallments.filter((e) => e.status === 'PAID').length, 0)
      );

      // 2. Execute Prediction
      const prediction = AIService.predictLoanApproval({
        monthlyIncome: profile.monthlyIncome,
        requestedPrincipal: parseFloat(requestedPrincipal),
        tenorMonths: parseInt(tenorMonths, 10),
        interestRate: parseFloat(interestRate),
        creditScore: creditEval.creditScore,
        otherEMIs: parseFloat(otherEMIs || '0'),
        hasCollateral: !!hasCollateral,
        latePaymentsCount: latePayments
      });

      // 3. Log to database
      const log = await prisma.aIPredictionLog.create({
        data: {
          customerId,
          predictionType: 'LOAN_APPROVAL',
          predictionScore: prediction.approvalScore,
          confidenceScore: prediction.confidenceScore,
          featureImportance: prediction.featureImportance as any,
          inputs: {
            monthlyIncome: profile.monthlyIncome,
            requestedPrincipal,
            tenorMonths,
            interestRate,
            creditScore: creditEval.creditScore,
            otherEMIs,
            hasCollateral,
            latePaymentsCount: latePayments
          } as any
        }
      });

      return res.json({
        predictionId: log.id,
        ...prediction,
        customerCreditScore: creditEval.creditScore,
        customerCreditRating: creditEval.rating
      });
    } catch (err: any) {
      console.error('[AI Approval Predict Error]', err);
      return res.status(500).json({ error: 'Server error running AI underwriter.' });
    }
  }

  /**
   * Run Loan Default Risk Prediction
   */
  public static async predictDefault(req: Request, res: Response) {
    const { loanId } = req.body;

    if (!loanId) {
      return res.status(400).json({ error: 'Loan ID is required.' });
    }

    try {
      // 1. Fetch Loan details
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { emiInstallments: true }
      });

      if (!loan) {
        return res.status(404).json({ error: 'Loan not found.' });
      }

      // 2. Fetch Customer profile with repayment history
      const profile = await prisma.customerProfile.findUnique({
        where: { id: loan.customerId },
        include: {
          loans: { include: { emiInstallments: true } },
          chits: { include: { chitGroup: { include: { installments: { where: { customerId: loan.customerId } } } } } }
        }
      });

      if (!profile) {
        return res.status(404).json({ error: 'Customer profile not found.' });
      }
      
      // Calculate overdue counts & total days overdue
      let overdueCount = 0;
      let maxDaysOverdue = 0;
      loan.emiInstallments.forEach((emi: any) => {
        if (emi.status === 'OVERDUE' || (emi.status === 'UNPAID' && new Date() > emi.dueDate)) {
          overdueCount++;
          const diffTime = Math.abs(new Date().getTime() - emi.dueDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > maxDaysOverdue) {
            maxDaysOverdue = diffDays;
          }
        }
      });

      // Chit late counts
      let lateChitCount = 0;
      profile.chits.forEach((membership: any) => {
        membership.chitGroup.installments.forEach((inst: any) => {
          if (inst.status === 'OVERDUE' || (inst.status === 'UNPAID' && new Date() > inst.dueDate)) {
            lateChitCount++;
          }
        });
      });

      // Recalculate credit score
      const creditEval = AIService.calculateCustomerCreditScore(
        profile.monthlyIncome,
        profile.loans.reduce((sum: number, l: any) => sum + l.outstandingBalance, 0),
        overdueCount + lateChitCount,
        profile.loans.reduce((sum: number, l: any) => sum + l.emiInstallments.filter((e: any) => e.status === 'PAID').length, 0)
      );

      // 2. Run prediction model
      const prediction = AIService.predictDefaultRisk({
        outstandingPrincipal: loan.outstandingBalance,
        originalPrincipal: loan.principal,
        overdueInstallmentsCount: overdueCount,
        daysPastDue: maxDaysOverdue,
        lateChitPaymentsCount: lateChitCount,
        creditScore: creditEval.creditScore
      });

      // 3. Log results
      const log = await prisma.aIPredictionLog.create({
        data: {
          customerId: loan.customerId,
          predictionType: 'LOAN_DEFAULT',
          predictionScore: prediction.defaultRisk,
          confidenceScore: prediction.confidenceScore,
          featureImportance: prediction.featureImportance as any,
          inputs: {
            loanId,
            outstandingPrincipal: loan.outstandingBalance,
            originalPrincipal: loan.principal,
            overdueInstallmentsCount: overdueCount,
            daysPastDue: maxDaysOverdue,
            lateChitPaymentsCount: lateChitCount,
            creditScore: creditEval.creditScore
          } as any
        }
      });

      return res.json({
        predictionId: log.id,
        ...prediction
      });
    } catch (err: any) {
      console.error('[AI Default Predict Error]', err);
      return res.status(500).json({ error: 'Server error running AI default assessment.' });
    }
  }

  /**
   * Run and return dynamic Credit Rating & Score for Customer
   */
  public static async getCustomerScore(req: Request, res: Response) {
    const { id } = req.params; // Customer Profile ID

    try {
      const profile = await prisma.customerProfile.findUnique({
        where: { id },
        include: {
          loans: { include: { emiInstallments: true } },
          chits: { include: { chitGroup: { include: { installments: { where: { customerId: id } } } } } }
        }
      });

      if (!profile) {
        return res.status(404).json({ error: 'Customer profile not found.' });
      }

      let latePayments = 0;
      let paidInstallments = 0;

      profile.loans.forEach((loan) => {
        loan.emiInstallments.forEach((emi) => {
          if (emi.status === 'OVERDUE' || (emi.status === 'UNPAID' && new Date() > emi.dueDate)) {
            latePayments++;
          } else if (emi.status === 'PAID') {
            paidInstallments++;
          }
        });
      });

      profile.chits.forEach((membership) => {
        membership.chitGroup.installments.forEach((inst) => {
          if (inst.status === 'OVERDUE' || (inst.status === 'UNPAID' && new Date() > inst.dueDate)) {
            latePayments++;
          } else if (inst.status === 'PAID') {
            paidInstallments++;
          }
        });
      });

      const totalDebt = profile.loans.reduce((sum, l) => sum + l.outstandingBalance, 0);

      const scoreResult = AIService.calculateCustomerCreditScore(
        profile.monthlyIncome,
        totalDebt,
        latePayments,
        paidInstallments
      );

      return res.json(scoreResult);
    } catch (err: any) {
      console.error('[Get Customer Score Error]', err);
      return res.status(500).json({ error: 'Server error evaluating borrower score.' });
    }
  }

  /**
   * Fetch logs history
   */
  public static async getPredictionHistory(req: Request, res: Response) {
    const { customerId } = req.query;

    try {
      const where: any = {};
      if (customerId) where.customerId = customerId as string;

      const history = await prisma.aIPredictionLog.findMany({
        where,
        include: {
          customer: { include: { user: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(history);
    } catch (err: any) {
      console.error('[Get Prediction History Error]', err);
      return res.status(500).json({ error: 'Server error retrieving logs.' });
    }
  }
}
