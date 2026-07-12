export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER'
}

export enum KYCStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export enum LoanStatus {
  APPLIED = 'APPLIED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED',
  CLOSED = 'CLOSED'
}

export enum LoanType {
  PERSONAL = 'PERSONAL',
  HOME = 'HOME',
  GOLD = 'GOLD',
  BUSINESS = 'BUSINESS',
  VEHICLE = 'VEHICLE'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  aadhaar: string;
  pan: string;
  photoUrl?: string;
  address: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineePhone: string;
  employmentStatus: string;
  employerName?: string;
  monthlyIncome: number;
  kycStatus: KYCStatus;
  kycNotes?: string;
  verifiedAt?: Date;
  status: string; // 'ACTIVE', 'INACTIVE', 'SUSPENDED'
}

export interface Loan {
  id: string;
  customerId: string;
  loanType: LoanType;
  principal: number;
  interestRate: number; // annual % (e.g. 12 for 12%)
  tenorMonths: number;
  appliedDate: Date;
  approvedDate?: Date;
  disbursedDate?: Date;
  closedDate?: Date;
  outstandingBalance: number;
  status: LoanStatus;
  collateralDescription?: string;
  guarantorName?: string;
  guarantorPhone?: string;
}

export interface EMIInstallment {
  id: string;
  loanId: string;
  installmentNo: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidAmount: number;
  penaltyAmount: number;
  paidDate?: Date;
  status: PaymentStatus;
}

export interface PartPayment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: Date;
  notes?: string;
}

export interface ChitGroup {
  id: string;
  name: string;
  groupValue: number;
  durationMonths: number;
  maxMembers: number;
  monthlyContribution: number;
  commissionRate: number; // e.g. 5 for 5% admin commission
  startDate: Date;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface ChitMember {
  id: string;
  chitGroupId: string;
  customerId: string;
  slotNumber: number;
  joinedDate: Date;
}

export interface ChitAuction {
  id: string;
  chitGroupId: string;
  installmentNo: number;
  auctionDate: Date;
  winningBidderId: string; // CustomerId
  bidAmount: number; // amount foregone by bidder
  dividendDistributed: number; // dividend shared to each member
  nextInstallmentAmount: number; // net monthly contribution
}

export interface ChitInstallment {
  id: string;
  chitGroupId: string;
  customerId: string;
  installmentNo: number;
  dueDate: Date;
  dueAmount: number;
  paidAmount: number;
  penaltyAmount: number;
  paidDate?: Date;
  status: PaymentStatus;
}

export interface LICPolicy {
  id: string;
  customerId: string;
  policyNumber: string;
  planName: string;
  sumAssured: number;
  premiumAmount: number;
  premiumMode: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  startDate: Date;
  dueDate: Date;
  agentId?: string; // backoffice User as Agent
  commissionRate: number; // e.g. 15 for 15%
  status: 'ACTIVE' | 'LAPSED' | 'MATURED';
}

export interface LICPremiumHistory {
  id: string;
  policyId: string;
  premiumAmount: number;
  paidDate: Date;
  agentCommission: number;
  status: string; // 'SUCCESS', 'FAILED'
}

export interface AIPrediction {
  id: string;
  customerId: string;
  predictionType: 'LOAN_APPROVAL' | 'LOAN_DEFAULT' | 'RISK_SCORE';
  predictionScore: number; // 0 to 100
  confidenceScore: number; // 0 to 100
  featureImportance: Record<string, number>;
  inputs: Record<string, any>;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  ipAddress?: string;
  details?: string;
  createdAt: Date;
}

export interface NotificationLog {
  id: string;
  customerId: string;
  channel: 'WHATSAPP' | 'EMAIL';
  templateName: string;
  recipient: string;
  content: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  errorMessage?: string;
  createdAt: Date;
}
