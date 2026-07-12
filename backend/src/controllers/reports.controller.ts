import { Request, Response } from 'express';
import prisma from '../config/db';
import { ReportService, ReportData } from '../services/report.service';
import { MailService } from '../services/mail.service';

export class ReportsController {
  /**
   * Helper to stream download payload
   */
  private static async sendReportFile(res: Response, data: ReportData, format: string, filename: string) {
    try {
      if (format === 'pdf') {
        const buffer = await ReportService.generatePDF(data);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        return res.end(buffer);
      } else if (format === 'excel') {
        const buffer = await ReportService.generateExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        return res.end(buffer);
      } else {
        const csvText = ReportService.generateCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        return res.send(csvText);
      }
    } catch (err: any) {
      console.error('[Generate Report Error]', err);
      return res.status(500).json({ error: 'Failed to compile and download report file.' });
    }
  }

  /**
   * Customers Report
   */
  public static async downloadCustomersReport(req: Request, res: Response) {
    const { format = 'csv', kycStatus, startDate, endDate } = req.query;

    try {
      const where: any = {};
      if (kycStatus) where.kycStatus = kycStatus;
      if (startDate && endDate) {
        where.user = {
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        };
      }

      const profiles = await prisma.customerProfile.findMany({
        where,
        include: { user: true }
      });

      const reportRows = profiles.map((p) => ({
        fullName: p.user.fullName,
        email: p.user.email,
        phone: p.user.phone,
        aadhaar: p.aadhaar,
        pan: p.pan,
        income: p.monthlyIncome,
        kycStatus: p.kycStatus,
        status: p.status
      }));

      const totals = {
        fullName: 'Total Customers',
        email: profiles.length,
        income: profiles.reduce((sum, p) => sum + p.monthlyIncome, 0)
      };

      const data: ReportData = {
        title: 'Customer Directory Report',
        subtitle: `Swaraj Customer Registry ${startDate ? `from ${startDate} to ${endDate}` : ''}`,
        headers: ['Name', 'Email', 'Phone', 'Aadhaar ID', 'PAN Card', 'Monthly Income', 'KYC Status', 'Profile Status'],
        keys: ['fullName', 'email', 'phone', 'aadhaar', 'pan', 'income', 'kycStatus', 'status'],
        rows: reportRows,
        totals
      };

      return ReportsController.sendReportFile(res, data, format as string, 'Swaraj_Customers_Report');
    } catch (err) {
      return res.status(500).json({ error: 'Server error compiling report.' });
    }
  }

  /**
   * Loans Report
   */
  public static async downloadLoansReport(req: Request, res: Response) {
    const { format = 'csv', status, type, startDate, endDate } = req.query;

    try {
      const where: any = {};
      if (status) where.status = status;
      if (type) where.loanType = type;
      if (startDate && endDate) {
        where.appliedDate = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const loans = await prisma.loan.findMany({
        where,
        include: { customer: { include: { user: true } } }
      });

      const reportRows = loans.map((l) => ({
        loanId: l.id.substring(0, 8).toUpperCase(),
        customerName: l.customer.user.fullName,
        loanType: l.loanType,
        principal: l.principal,
        rate: `${l.interestRate}%`,
        tenor: `${l.tenorMonths} Mos`,
        balance: l.outstandingBalance,
        status: l.status
      }));

      const totals = {
        loanId: 'Total Loans',
        customerName: loans.length,
        principal: loans.reduce((sum, l) => sum + l.principal, 0),
        balance: loans.reduce((sum, l) => sum + l.outstandingBalance, 0)
      };

      const data: ReportData = {
        title: 'Credit Portfolio Report',
        subtitle: `Swaraj Lending Audit ${startDate ? `from ${startDate} to ${endDate}` : ''}`,
        headers: ['Loan ID', 'Borrower', 'Type', 'Principal', 'Interest Rate', 'Tenor', 'Outstanding Balance', 'Status'],
        keys: ['loanId', 'customerName', 'loanType', 'principal', 'rate', 'tenor', 'balance', 'status'],
        rows: reportRows,
        totals
      };

      return ReportsController.sendReportFile(res, data, format as string, 'Swaraj_Loans_Report');
    } catch (err) {
      return res.status(500).json({ error: 'Server error compiling report.' });
    }
  }

  /**
   * Chit Funds Report
   */
  public static async downloadChitsReport(req: Request, res: Response) {
    const { format = 'csv', status } = req.query;

    try {
      const where: any = {};
      if (status) where.status = status;

      const groups = await prisma.chitGroup.findMany({
        where,
        include: { members: true, auctions: true }
      });

      const reportRows = groups.map((g) => ({
        name: g.name,
        value: g.groupValue,
        dur: `${g.durationMonths} Months`,
        members: `${g.members.length} / ${g.maxMembers}`,
        comm: `${g.commissionRate}%`,
        auctionsConducted: `${g.auctions.length} rounds`,
        status: g.status
      }));

      const totals = {
        name: 'Total Chit Groups',
        value: groups.reduce((sum, g) => sum + g.groupValue, 0),
        dur: groups.length
      };

      const data: ReportData = {
        title: 'Chit Mutual Funds Report',
        subtitle: 'Swaraj Chit Group Matrix & Auctions Audit',
        headers: ['Group Name', 'Value (Rs.)', 'Tenor Months', 'Subscribers', 'Admin Fee %', 'Completed Auctions', 'Group Status'],
        keys: ['name', 'value', 'dur', 'members', 'comm', 'auctionsConducted', 'status'],
        rows: reportRows,
        totals
      };

      return ReportsController.sendReportFile(res, data, format as string, 'Swaraj_Chits_Report');
    } catch (err) {
      return res.status(500).json({ error: 'Server error compiling report.' });
    }
  }

  /**
   * LIC Policies Report
   */
  public static async downloadLICReport(req: Request, res: Response) {
    const { format = 'csv', status } = req.query;

    try {
      const where: any = {};
      if (status) where.status = status;

      const policies = await prisma.lICPolicy.findMany({
        where,
        include: { customer: { include: { user: true } }, premiumHistory: true }
      });

      const reportRows = policies.map((p) => ({
        policyNo: p.policyNumber,
        customer: p.customer.user.fullName,
        plan: p.planName,
        sumAssured: p.sumAssured,
        premium: p.premiumAmount,
        mode: p.premiumMode,
        dueDate: p.dueDate,
        paidRounds: `${p.premiumHistory.length} paid`,
        status: p.status
      }));

      const totals = {
        policyNo: 'Total Policies',
        customer: policies.length,
        sumAssured: policies.reduce((sum, p) => sum + p.sumAssured, 0),
        premium: policies.reduce((sum, p) => sum + p.premiumAmount, 0)
      };

      const data: ReportData = {
        title: 'LIC Insurance Policies Portfolio',
        subtitle: 'Swaraj Agent Licensing & Policy Coverage Metrics',
        headers: ['Policy No', 'Insured Name', 'LIC Plan', 'Sum Assured', 'Premium Due', 'Billing Cycle', 'Due Date', 'History', 'Status'],
        keys: ['policyNo', 'customer', 'plan', 'sumAssured', 'premium', 'mode', 'dueDate', 'paidRounds', 'status'],
        rows: reportRows,
        totals
      };

      return ReportsController.sendReportFile(res, data, format as string, 'Swaraj_LIC_Report');
    } catch (err) {
      return res.status(500).json({ error: 'Server error compiling report.' });
    }
  }

  /**
   * Defaulters Report
   */
  public static async downloadDefaultersReport(req: Request, res: Response) {
    const { format = 'csv' } = req.query;

    try {
      const today = new Date();

      // Find overdue EMIs
      const overdueEMIs = await prisma.eMIInstallment.findMany({
        where: {
          dueDate: { lt: today },
          status: { in: ['UNPAID', 'OVERDUE'] }
        },
        include: { loan: { include: { customer: { include: { user: true } } } } }
      });

      // Find overdue Chit Installments
      const overdueChits = await prisma.chitInstallment.findMany({
        where: {
          dueDate: { lt: today },
          status: { in: ['UNPAID', 'OVERDUE'] }
        },
        include: { chitGroup: true, customer: { include: { user: true } } }
      });

      const reportRows: any[] = [];

      overdueEMIs.forEach((emi: any) => {
        const diffTime = Math.abs(today.getTime() - emi.dueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        reportRows.push({
          borrower: emi.loan.customer.user.fullName,
          phone: emi.loan.customer.user.phone,
          product: `Loan: ${emi.loan.loanType} EMI #${emi.installmentNo}`,
          dueDate: emi.dueDate,
          amountDue: emi.totalAmount - emi.paidAmount,
          daysOverdue: diffDays,
          status: emi.status
        });
      });

      overdueChits.forEach((inst) => {
        const diffTime = Math.abs(today.getTime() - inst.dueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        reportRows.push({
          borrower: inst.customer.user.fullName,
          phone: inst.customer.user.phone,
          product: `Chit Group: ${inst.chitGroup.name} (Round #${inst.installmentNo})`,
          dueDate: inst.dueDate,
          amountDue: inst.dueAmount - inst.paidAmount,
          daysOverdue: diffDays,
          status: inst.status
        });
      });

      // Sort by days overdue descending
      reportRows.sort((a, b) => b.daysOverdue - a.daysOverdue);

      const totals = {
        borrower: 'Total Overdue Items',
        phone: reportRows.length,
        amountDue: reportRows.reduce((sum, r) => sum + r.amountDue, 0)
      };

      const data: ReportData = {
        title: 'Overdue Dues & Defaulters Audit List',
        subtitle: 'Swaraj Credit Risk & Collections Management Sheet',
        headers: ['Customer Name', 'Phone Number', 'Delinquent Item', 'Due Date', 'Outstanding Balance Due', 'Days Past Due', 'Status'],
        keys: ['borrower', 'phone', 'product', 'dueDate', 'amountDue', 'daysOverdue', 'status'],
        rows: reportRows,
        totals
      };

      return ReportsController.sendReportFile(res, data, format as string, 'Swaraj_Defaulters_Report');
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error compiling report.' });
    }
  }

  /**
   * Cash Flow / Ledger Balance Report (Income vs. Expense)
   */
  public static async downloadCashFlowReport(req: Request, res: Response) {
    const { format = 'csv' } = req.query;

    try {
      // Income calculations
      // 1. Sum of paid EMI interest amounts
      const paidEMIs = await prisma.eMIInstallment.findMany({
        where: { status: 'PAID' }
      });
      const loanInterestIncome = paidEMIs.reduce((sum: number, e: any) => sum + e.interestAmount, 0);

      // 2. Sum of chit auction commission fees (duration * groupValue * commissionRate)
      const auctions = await prisma.chitAuction.findMany({
        include: { chitGroup: true }
      });
      const chitCommissions = auctions.reduce((sum: number, a: any) => sum + (a.chitGroup.groupValue * (a.chitGroup.commissionRate / 100)), 0);

      // 3. LIC commissions (this goes to agents/company)
      const licHistory = await prisma.lICPremiumHistory.findMany({
        where: { status: 'SUCCESS' }
      });
      const licCommissions = licHistory.reduce((sum: number, p: any) => sum + p.agentCommission, 0);

      // Expense calculations
      // 1. Total disbursed loans
      const disbursedLoans = await prisma.loan.findMany({
        where: { status: { in: ['DISBURSED', 'CLOSED'] } }
      });
      const loanDisbursalExpense = disbursedLoans.reduce((sum: number, l: any) => sum + l.principal, 0);

      // Assemble entries
      const reportRows = [
        { item: 'Lending Operations Interest Collected', type: 'INCOME', amount: loanInterestIncome },
        { item: 'Chit Group Auction Administration Commissions', type: 'INCOME', amount: chitCommissions },
        { item: 'LIC Policy Sales Commission Earnings', type: 'INCOME', amount: licCommissions },
        { item: 'Capital Loan Disbursals Capital Outflow', type: 'EXPENSE', amount: loanDisbursalExpense }
      ];

      const netCashFlow = (loanInterestIncome + chitCommissions + licCommissions) - loanDisbursalExpense;

      const totals = {
        item: 'Net Balance Cash Flow',
        type: netCashFlow >= 0 ? 'NET INCOME' : 'NET DEFICIT',
        amount: Math.abs(netCashFlow)
      };

      const data: ReportData = {
        title: 'Swaraj Fiscal Ledger & Income-Expense Audit',
        subtitle: `Accounting Consolidated Cashflows`,
        headers: ['Financial Ledger Description', 'Ledger Classification', 'Amount (Rs.)'],
        keys: ['item', 'type', 'amount'],
        rows: reportRows,
        totals
      };

      return ReportsController.sendReportFile(res, data, format as string, 'Swaraj_Income_Expense_Report');
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error compiling report.' });
    }
  }

  /**
   * Scan for all overdue payments and dispatch email/whatsapp reminders
   */
  public static async triggerOverdueReminders(req: Request, res: Response) {
    try {
      const today = new Date();
      let remindersSent = 0;

      // 1. Scan overdue EMIs
      const overdueEMIs = await prisma.eMIInstallment.findMany({
        where: {
          dueDate: { lt: today },
          status: { in: ['UNPAID', 'OVERDUE'] }
        },
        include: { loan: { include: { customer: { include: { user: true } } } } }
      });

      for (const emi of overdueEMIs) {
        try {
          const cust = emi.loan.customer;
          await MailService.sendOverdueReminderEmail(
            cust.id,
            cust.user.email,
            cust.user.fullName,
            `Loan EMI #${emi.installmentNo} (${emi.loan.loanType})`,
            emi.totalAmount,
            emi.dueDate,
            emi.penaltyAmount
          );
          remindersSent++;
        } catch (err) {
          console.error(`Failed to send overdue EMI email to customer ${emi.loan.customerId}`, err);
        }
      }

      // 2. Scan overdue Chit Installments
      const overdueChits = await prisma.chitInstallment.findMany({
        where: {
          dueDate: { lt: today },
          status: { in: ['UNPAID', 'OVERDUE'] }
        },
        include: { chitGroup: true, customer: { include: { user: true } } }
      });

      for (const inst of overdueChits) {
        try {
          await MailService.sendOverdueReminderEmail(
            inst.customerId,
            inst.customer.user.email,
            inst.customer.user.fullName,
            `Chit "${inst.chitGroup.name}" Round #${inst.installmentNo}`,
            inst.dueAmount,
            inst.dueDate,
            inst.penaltyAmount
          );
          remindersSent++;
        } catch (err) {
          console.error(`Failed to send overdue chit email to customer ${inst.customerId}`, err);
        }
      }

      // 3. Scan overdue LIC Policies
      const overdueLICs = await prisma.lICPolicy.findMany({
        where: {
          dueDate: { lt: today },
          status: 'ACTIVE'
        },
        include: { customer: { include: { user: true } } }
      });

      for (const policy of overdueLICs) {
        try {
          await MailService.sendOverdueReminderEmail(
            policy.customerId,
            policy.customer.user.email,
            policy.customer.user.fullName,
            `LIC Policy: ${policy.planName} (${policy.policyNumber})`,
            policy.premiumAmount,
            policy.dueDate,
            0 // no penalty for LIC
          );
          // Auto-mark policy as LAPSED if past due
          await prisma.lICPolicy.update({
            where: { id: policy.id },
            data: { status: 'LAPSED' }
          });
          remindersSent++;
        } catch (err) {
          console.error(`Failed to send overdue LIC email to customer ${policy.customerId}`, err);
        }
      }

      return res.json({
        message: `Overdue scan completed. Sent ${remindersSent} reminders.`,
        count: remindersSent
      });
    } catch (err) {
      console.error('[Trigger Overdue Reminders Error]', err);
      return res.status(500).json({ error: 'Server error processing overdue reminder scan.' });
    }
  }

  /**
   * Generates a monthly payment/collections status report showing Loan, Chit, and LIC users' status
   */
  public static async downloadMonthlyStatusReport(req: Request, res: Response) {
    const { startDate, endDate, format } = req.query;

    try {
      const today = new Date();
      const start = startDate ? new Date(startDate as string) : new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      // 1. Gather Loan EMI installments
      const emiInstallments = await prisma.eMIInstallment.findMany({
        where: {
          dueDate: { gte: start, lte: end }
        },
        include: {
          loan: {
            include: {
              customer: {
                include: { user: true }
              }
            }
          }
        }
      });

      // 2. Gather Chit installments
      const chitInstallments = await prisma.chitInstallment.findMany({
        where: {
          dueDate: { gte: start, lte: end }
        },
        include: {
          chitGroup: true,
          customer: {
            include: { user: true }
          }
        }
      });

      // 3. Gather LIC paid premium history
      const paidLICHistory = await prisma.lICPremiumHistory.findMany({
        where: {
          paidDate: { gte: start, lte: end },
          status: 'SUCCESS'
        },
        include: {
          policy: {
            include: {
              customer: {
                include: { user: true }
              }
            }
          }
        }
      });

      // 4. Gather LIC unpaid policies (due in this period, but not paid)
      const activeLics = await prisma.lICPolicy.findMany({
        where: {
          dueDate: { gte: start, lte: end },
          status: { in: ['ACTIVE', 'LAPSED'] }
        },
        include: {
          customer: {
            include: { user: true }
          }
        }
      });

      const reportRows: any[] = [];

      // Add Loan EMIs
      emiInstallments.forEach((emi) => {
        reportRows.push({
          customer: `${emi.loan.customer.user.fullName} (${emi.loan.customer.user.phone})`,
          type: 'LOAN',
          description: `EMI #${emi.installmentNo} - ${emi.loan.loanType} Loan`,
          amount: emi.totalAmount,
          dueDate: emi.dueDate.toLocaleDateString(),
          status: emi.status,
          paidDate: emi.status === 'PAID' && emi.paidDate ? emi.paidDate.toLocaleDateString() : '-'
        });
      });

      // Add Chit Installments
      chitInstallments.forEach((inst) => {
        reportRows.push({
          customer: `${inst.customer.user.fullName} (${inst.customer.user.phone})`,
          type: 'CHIT',
          description: `Round #${inst.installmentNo} - ${inst.chitGroup.name}`,
          amount: inst.dueAmount,
          dueDate: inst.dueDate.toLocaleDateString(),
          status: inst.status,
          paidDate: inst.status === 'PAID' && inst.paidDate ? inst.paidDate.toLocaleDateString() : '-'
        });
      });

      // Add Paid LIC Premiums
      paidLICHistory.forEach((hist: any) => {
        reportRows.push({
          customer: `${hist.policy.customer.user.fullName} (${hist.policy.customer.user.phone})`,
          type: 'LIC',
          description: `Premium Payment - ${hist.policy.planName}`,
          amount: hist.premiumAmount,
          dueDate: '-',
          status: 'PAID',
          paidDate: hist.paidDate.toLocaleDateString()
        });
      });

      // Add Unpaid LIC Dues (only if they haven't paid in this period)
      activeLics.forEach((policy) => {
        const hasPaidThisPeriod = paidLICHistory.some((h) => h.policyId === policy.id);
        if (!hasPaidThisPeriod) {
          reportRows.push({
            customer: `${policy.customer.user.fullName} (${policy.customer.user.phone})`,
            type: 'LIC',
            description: `Overdue Premium - ${policy.planName}`,
            amount: policy.premiumAmount,
            dueDate: policy.dueDate.toLocaleDateString(),
            status: 'UNPAID',
            paidDate: '-'
          });
        }
      });

      // Sort rows alphabetically by Customer Name
      reportRows.sort((a, b) => a.customer.localeCompare(b.customer));

      // Calculate totals
      const totalAmount = reportRows.reduce((sum, row) => sum + row.amount, 0);
      const totalPaid = reportRows.filter(r => r.status === 'PAID').reduce((sum, row) => sum + row.amount, 0);
      const totalUnpaid = reportRows.filter(r => r.status !== 'PAID').reduce((sum, row) => sum + row.amount, 0);

      const totals = {
        customer: 'SUMMARY TOTALS',
        type: `${reportRows.length} Accounts`,
        description: `Paid: Rs.${totalPaid} / Unpaid: Rs.${totalUnpaid}`,
        amount: totalAmount
      };

      const data: ReportData = {
        title: 'Swaraj Monthly Subscriptions & Collections Audit',
        subtitle: `Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
        headers: ['Customer Details', 'Product', 'Installment/Premium Details', 'Amount (Rs.)', 'Due Date', 'Status', 'Paid Date'],
        keys: ['customer', 'type', 'description', 'amount', 'dueDate', 'status', 'paidDate'],
        rows: reportRows,
        totals
      };

      return ReportsController.sendReportFile(res, data, format as string, `Swaraj_Monthly_Collections_Report`);
    } catch (err) {
      console.error('[Monthly Collections Report Error]', err);
      return res.status(500).json({ error: 'Server error generating monthly collections status report.' });
    }
  }
}
