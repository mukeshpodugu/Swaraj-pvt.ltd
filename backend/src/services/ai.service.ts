interface LoanApprovalInput {
  monthlyIncome: number;
  requestedPrincipal: number;
  tenorMonths: number;
  interestRate: number;
  creditScore: number;
  otherEMIs: number;
  hasCollateral: boolean;
  latePaymentsCount: number;
}

interface DefaultRiskInput {
  outstandingPrincipal: number;
  originalPrincipal: number;
  overdueInstallmentsCount: number;
  daysPastDue: number;
  lateChitPaymentsCount: number;
  creditScore: number;
}

export class AIService {
  /**
   * Predicts the probability of a loan getting approved.
   * Calculates DTI (Debt-to-Income) ratio, LTV metrics, and merges with credit history.
   */
  public static predictLoanApproval(input: LoanApprovalInput) {
    const monthlyRate = (input.interestRate / 100) / 12;
    const emi = input.requestedPrincipal * monthlyRate * Math.pow(1 + monthlyRate, input.tenorMonths) / 
                (Math.pow(1 + monthlyRate, input.tenorMonths) - 1);
                
    const totalMonthlyCommitment = input.otherEMIs + emi;
    const dtiRatio = (totalMonthlyCommitment / input.monthlyIncome) * 100;
    
    let approvalScore = 100;
    const features: Record<string, number> = {};

    // 1. Debt to Income Ratio impact (Target: < 45%)
    if (dtiRatio < 30) {
      features['Debt-to-Income Ratio (DTI)'] = 25; // Positive impact
    } else if (dtiRatio < 45) {
      approvalScore -= 20;
      features['Debt-to-Income Ratio (DTI)'] = 10;
    } else if (dtiRatio < 60) {
      approvalScore -= 50;
      features['Debt-to-Income Ratio (DTI)'] = -25;
    } else {
      approvalScore -= 80;
      features['Debt-to-Income Ratio (DTI)'] = -60;
    }

    // 2. Credit Score impact
    if (input.creditScore >= 750) {
      features['Credit History'] = 30;
    } else if (input.creditScore >= 650) {
      approvalScore -= 15;
      features['Credit History'] = 15;
    } else if (input.creditScore >= 550) {
      approvalScore -= 40;
      features['Credit History'] = -10;
    } else {
      approvalScore -= 70;
      features['Credit History'] = -50;
    }

    // 3. Late Payments impact
    if (input.latePaymentsCount === 0) {
      features['Repayment History'] = 20;
    } else if (input.latePaymentsCount <= 2) {
      approvalScore -= 15;
      features['Repayment History'] = -5;
    } else {
      approvalScore -= 50;
      features['Repayment History'] = -35;
    }

    // 4. Collateral impact
    if (input.hasCollateral) {
      approvalScore += 15;
      features['Collateral Backing'] = 15;
    } else {
      features['Collateral Backing'] = 0;
    }

    // Final bound checks
    approvalScore = Math.max(0, Math.min(100, approvalScore));
    
    let decision = 'REJECTED';
    if (approvalScore >= 75) {
      decision = 'APPROVED';
    } else if (approvalScore >= 50) {
      decision = 'MANUAL_REVIEW';
    }

    const confidenceScore = Math.max(70, Math.min(98, 50 + (input.creditScore / 18) + (input.hasCollateral ? 10 : 0)));

    return {
      approvalScore,
      decision,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      dtiRatio: Math.round(dtiRatio * 100) / 100,
      monthlyEMI: Math.round(emi * 100) / 100,
      featureImportance: features,
      recommendations: this.getLoanRecommendations(dtiRatio, input.creditScore, input.hasCollateral, input.latePaymentsCount)
    };
  }

  /**
   * Predicts default risk probability (0 to 100%).
   */
  public static predictDefaultRisk(input: DefaultRiskInput) {
    const principalPaidRatio = (input.originalPrincipal - input.outstandingPrincipal) / input.originalPrincipal;
    
    let defaultRisk = 0;
    const features: Record<string, number> = {};

    // 1. Days Past Due (DPD) impact
    if (input.daysPastDue > 90) {
      defaultRisk += 55;
      features['Days Past Due (DPD)'] = 50;
    } else if (input.daysPastDue > 30) {
      defaultRisk += 30;
      features['Days Past Due (DPD)'] = 25;
    } else if (input.daysPastDue > 0) {
      defaultRisk += 10;
      features['Days Past Due (DPD)'] = 8;
    } else {
      features['Days Past Due (DPD)'] = 0;
    }

    // 2. Overdue Installments
    if (input.overdueInstallmentsCount > 3) {
      defaultRisk += 25;
      features['Unpaid EMIs'] = 20;
    } else if (input.overdueInstallmentsCount > 0) {
      defaultRisk += 10;
      features['Unpaid EMIs'] = 8;
    } else {
      features['Unpaid EMIs'] = 0;
    }

    // 3. Late Chit Payments
    if (input.lateChitPaymentsCount > 4) {
      defaultRisk += 15;
      features['Chit Repayment Delays'] = 12;
    } else if (input.lateChitPaymentsCount > 0) {
      defaultRisk += 5;
      features['Chit Repayment Delays'] = 4;
    } else {
      features['Chit Repayment Delays'] = 0;
    }

    // 4. Credit score offset
    if (input.creditScore < 500) {
      defaultRisk += 15;
      features['Borrower Credit Profile'] = 10;
    } else if (input.creditScore >= 750) {
      defaultRisk -= 15;
      features['Borrower Credit Profile'] = -15;
    } else {
      features['Borrower Credit Profile'] = -5;
    }

    // 5. Loan payoff progress mitigator
    if (principalPaidRatio > 0.7) {
      defaultRisk -= 10;
      features['Loan Payoff Progress'] = -10;
    } else {
      features['Loan Payoff Progress'] = 0;
    }

    defaultRisk = Math.max(0, Math.min(100, defaultRisk));
    const confidenceScore = Math.max(80, Math.min(99, 75 + (input.daysPastDue > 0 ? 15 : 0) + (input.creditScore > 700 ? 5 : 0)));

    let riskLevel = 'LOW';
    if (defaultRisk >= 60) {
      riskLevel = 'HIGH';
    } else if (defaultRisk >= 25) {
      riskLevel = 'MEDIUM';
    }

    return {
      defaultRisk,
      riskLevel,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      featureImportance: features,
      recommendations: this.getDefaultRecommendations(defaultRisk, input.daysPastDue, input.outstandingPrincipal)
    };
  }

  /**
   * Formulates a dynamic credit score (300-900) based on financial input factors.
   */
  public static calculateCustomerCreditScore(
    income: number,
    totalOutstandingDebt: number,
    latePayments: number,
    successfulEMIReviews: number
  ) {
    let score = 600; // Base score

    // Payment History (35% weight)
    if (latePayments === 0) {
      score += 150;
    } else if (latePayments <= 2) {
      score += 20;
    } else if (latePayments <= 5) {
      score -= 80;
    } else {
      score -= 180;
    }

    // Credit Utilization / Debt ratio (30% weight)
    const annualIncome = income * 12;
    const debtToAnnualIncomeRatio = totalOutstandingDebt / annualIncome;
    if (debtToAnnualIncomeRatio < 0.1) {
      score += 100;
    } else if (debtToAnnualIncomeRatio < 0.3) {
      score += 50;
    } else if (debtToAnnualIncomeRatio < 0.6) {
      score -= 50;
    } else {
      score -= 120;
    }

    // Account Age & Successful Payments (15% weight)
    score += Math.min(100, successfulEMIReviews * 8);

    // Limit to credit score bounds
    score = Math.max(300, Math.min(900, score));

    let rating = 'POOR';
    if (score >= 800) rating = 'EXCELLENT';
    else if (score >= 700) rating = 'VERY GOOD';
    else if (score >= 600) rating = 'GOOD';
    else if (score >= 500) rating = 'FAIR';

    return {
      creditScore: Math.round(score),
      rating,
      metrics: {
        paymentHistoryScore: latePayments === 0 ? 'EXCELLENT' : latePayments <= 2 ? 'FAIR' : 'POOR',
        debtRatio: Math.round(debtToAnnualIncomeRatio * 100) / 100
      }
    };
  }

  private static getLoanRecommendations(dti: number, credit: number, collateral: boolean, late: number): string[] {
    const list: string[] = [];
    if (dti > 45) {
      list.push('Reduce the requested principal amount to bring DTI ratio under 45%.');
    }
    if (credit < 600) {
      list.push('Improve credit score by paying outstanding credit cards or previous bills.');
    }
    if (!collateral && dti > 40) {
      list.push('Provide a secure asset/collateral to offset high debt risk.');
    }
    if (late > 1) {
      list.push('Ensure consecutive on-time payments for 3-6 months to demonstrate behavioral recovery.');
    }
    if (list.length === 0) {
      list.push('Borrower profiles meet all benchmarks. Recommended for fast-track disbursal.');
    }
    return list;
  }

  private static getDefaultRecommendations(risk: number, dpd: number, outstanding: number): string[] {
    const list: string[] = [];
    if (dpd > 30) {
      list.push('Initiate restructuring dialogue with borrower for loan consolidation.');
    }
    if (risk > 50) {
      list.push('Halt further credit approvals, chits, and LIC renewals under company-financed agent schemes.');
      list.push('Issue formal legal reminder under Negotiable Instruments Act (if applicable).');
    }
    if (outstanding > 100000 && risk > 30) {
      list.push('Contact guarantor immediately to inform them of payment delays.');
    }
    if (list.length === 0) {
      list.push('Maintain regular automated WhatsApp reminders.');
    }
    return list;
  }
}
