import { PrismaClient, UserRole, KYCStatus, LoanStatus, LoanType, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Password Hashing
  const hashedPw = await bcrypt.hash('password123', 10);

  // 2. Clear old data (dependency order)
  await prisma.notificationLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.aIPredictionLog.deleteMany();
  await prisma.lICPremiumHistory.deleteMany();
  await prisma.lICPolicy.deleteMany();
  await prisma.chitInstallment.deleteMany();
  await prisma.chitAuction.deleteMany();
  await prisma.chitMember.deleteMany();
  await prisma.chitGroup.deleteMany();
  await prisma.partPayment.deleteMany();
  await prisma.eMIInstallment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companySetting.deleteMany();

  // 3. Create Default settings
  const settings = await prisma.companySetting.create({
    data: {
      companyName: 'Swaraj Pvt. Limited',
      logoUrl: 'https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?w=128&h=128&fit=crop',
      address: '123 Swaraj Chowk, Finance District, New Delhi',
      baseInterestRate: 12.0,
      basePenaltyRate: 2.0,
      smtpHost: 'smtp.mailtrap.io',
      smtpPort: 2525,
      smtpFrom: 'no-reply@swarajfinance.com'
    }
  });

  // 4. Create Administrative & Agent Users
  const superadmin = await prisma.user.create({
    data: {
      email: 'superadmin@swarajfinance.com',
      passwordHash: hashedPw,
      fullName: 'Vikramaditya Singh',
      phone: '9999999999',
      role: UserRole.SUPER_ADMIN
    }
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@swarajfinance.com',
      passwordHash: hashedPw,
      fullName: 'Ramesh Sharma',
      phone: '9888888888',
      role: UserRole.ADMIN
    }
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@swarajfinance.com',
      passwordHash: hashedPw,
      fullName: 'Anjali Gupta',
      phone: '9777777777',
      role: UserRole.STAFF
    }
  });

  const agent = await prisma.user.create({
    data: {
      email: 'agent1@swarajfinance.com',
      passwordHash: hashedPw,
      fullName: 'Suresh Kumar',
      phone: '9666666666',
      role: UserRole.AGENT
    }
  });

  // 5. Create Customer Users & Profiles
  const custUser1 = await prisma.user.create({
    data: {
      email: 'customer1@gmail.com',
      passwordHash: hashedPw,
      fullName: 'Amit Patel',
      phone: '9555555555',
      role: UserRole.CUSTOMER
    }
  });

  const profile1 = await prisma.customerProfile.create({
    data: {
      userId: custUser1.id,
      aadhaar: '123456789012',
      pan: 'ABCDE1234F',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
      address: '45, Patel Nagar, Ahmedabad, Gujarat',
      nomineeName: 'Kiran Patel',
      nomineeRelation: 'SPOUSE',
      nomineePhone: '9555555556',
      employmentStatus: 'SALARIED',
      employerName: 'Tata Consultancy Services',
      monthlyIncome: 75000,
      kycStatus: KYCStatus.VERIFIED,
      verifiedAt: new Date()
    }
  });

  const custUser2 = await prisma.user.create({
    data: {
      email: 'customer2@gmail.com',
      passwordHash: hashedPw,
      fullName: 'Priya Nair',
      phone: '9444444444',
      role: UserRole.CUSTOMER
    }
  });

  const profile2 = await prisma.customerProfile.create({
    data: {
      userId: custUser2.id,
      aadhaar: '234567890123',
      pan: 'BCDEF2345G',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      address: '89, Residency Road, Bangalore, Karnataka',
      nomineeName: 'Radha Nair',
      nomineeRelation: 'MOTHER',
      nomineePhone: '9444444445',
      employmentStatus: 'SELF_EMPLOYED',
      employerName: 'Nair Organics Cafe',
      monthlyIncome: 120000,
      kycStatus: KYCStatus.VERIFIED,
      verifiedAt: new Date()
    }
  });

  const custUser3 = await prisma.user.create({
    data: {
      email: 'customer3@gmail.com',
      passwordHash: hashedPw,
      fullName: 'Rajesh Khanna',
      phone: '9333333333',
      role: UserRole.CUSTOMER
    }
  });

  const profile3 = await prisma.customerProfile.create({
    data: {
      userId: custUser3.id,
      aadhaar: '345678901234',
      pan: 'CDEFG3456H',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      address: '12, Link Road, Mumbai, Maharashtra',
      nomineeName: 'Sanjay Khanna',
      nomineeRelation: 'SON',
      nomineePhone: '9333333334',
      employmentStatus: 'RETIRED',
      monthlyIncome: 45000,
      kycStatus: KYCStatus.PENDING
    }
  });

  // 6. Create Loan (Customer 1 gets a disbursed loan, Customer 2 gets applied)
  const activeLoan = await prisma.loan.create({
    data: {
      customerId: profile1.id,
      loanType: LoanType.PERSONAL,
      principal: 200000,
      interestRate: 12.0,
      tenorMonths: 12,
      appliedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      approvedDate: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
      disbursedDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
      outstandingBalance: 213000, // Roughly principal + interest minus payments
      status: LoanStatus.DISBURSED,
      collateralDescription: 'Fixed Deposit Receipt FD-90876',
      guarantorName: 'Vinod Mehta',
      guarantorPhone: '9876543210'
    }
  });

  // Generate EMIs for this loan (12 EMIs, EMI 1 is paid, EMI 2 is paid, EMI 3 is due)
  const emiList = [];
  const P = 200000;
  const r = 0.12 / 12;
  const n = 12;
  const emiAmt = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalRepay = emiAmt * n;

  let outstanding = P;
  for (let i = 1; i <= n; i++) {
    const interestForMonth = outstanding * r;
    const principalForMonth = emiAmt - interestForMonth;
    let dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() - 2 + i); // Backdate EMIs

    let status: PaymentStatus = PaymentStatus.UNPAID;
    let paidAmt = 0;
    let paidDate = null;

    if (i === 1) {
      status = PaymentStatus.PAID;
      paidAmt = emiAmt;
      paidDate = new Date(dueDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    } else if (i === 2) {
      status = PaymentStatus.PAID;
      paidAmt = emiAmt;
      paidDate = new Date(dueDate.getTime() - 1 * 24 * 60 * 60 * 1000);
    }

    emiList.push({
      loanId: activeLoan.id,
      installmentNo: i,
      dueDate,
      principalAmount: Math.round(principalForMonth * 100) / 100,
      interestAmount: Math.round(interestForMonth * 100) / 100,
      totalAmount: Math.round(emiAmt * 100) / 100,
      paidAmount: Math.round(paidAmt * 100) / 100,
      penaltyAmount: 0,
      paidDate,
      status
    });

    outstanding -= principalForMonth;
  }

  await prisma.eMIInstallment.createMany({ data: emiList });

  // Update outstanding loan balance to actual
  const actualOutstanding = totalRepay - (emiAmt * 2);
  await prisma.loan.update({
    where: { id: activeLoan.id },
    data: { outstandingBalance: Math.round(actualOutstanding) }
  });

  const appliedLoan = await prisma.loan.create({
    data: {
      customerId: profile2.id,
      loanType: LoanType.HOME,
      principal: 1500000,
      interestRate: 8.5,
      tenorMonths: 180,
      outstandingBalance: 1500000,
      status: LoanStatus.APPLIED,
      collateralDescription: 'Property Papers for flat in Whitefield',
      guarantorName: 'Ashok Nair',
      guarantorPhone: '9888812345'
    }
  });

  // 7. Create Chit Group & Auctions (Customer 1 & 2 join)
  const chitGroup = await prisma.chitGroup.create({
    data: {
      name: 'Swaraj Royal 2 Lakhs Chit',
      groupValue: 200000,
      durationMonths: 20,
      maxMembers: 20,
      monthlyContribution: 10000,
      commissionRate: 5.0,
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      status: 'ACTIVE'
    }
  });

  // Enroll customers into chit group
  const member1 = await prisma.chitMember.create({
    data: {
      chitGroupId: chitGroup.id,
      customerId: profile1.id,
      slotNumber: 1
    }
  });

  const member2 = await prisma.chitMember.create({
    data: {
      chitGroupId: chitGroup.id,
      customerId: profile2.id,
      slotNumber: 2
    }
  });

  // Add 18 other dummy slot members
  for (let s = 3; s <= 20; s++) {
    // Generate dummy customer
    const dummyUser = await prisma.user.create({
      data: {
        email: `chitsubscriber${s}@swarajfinance.com`,
        passwordHash: hashedPw,
        fullName: `Subscriber ${s}`,
        phone: `91111111${s.toString().padStart(2, '0')}`,
        role: UserRole.CUSTOMER
      }
    });
    const dummyProf = await prisma.customerProfile.create({
      data: {
        userId: dummyUser.id,
        aadhaar: `9000000000${s.toString().padStart(2, '0')}`,
        pan: `DUMMY${s}P`,
        address: 'Delhi backoffice subscriber pool',
        nomineeName: 'No Nominee',
        nomineeRelation: 'NONE',
        nomineePhone: '9000000000',
        employmentStatus: 'SALARIED',
        monthlyIncome: 50000,
        kycStatus: KYCStatus.VERIFIED
      }
    });
    await prisma.chitMember.create({
      data: {
        chitGroupId: chitGroup.id,
        customerId: dummyProf.id,
        slotNumber: s
      }
    });
  }

  // Conduct 1st auction round (Discount bid: Rs 40,000. Winner is slot 3)
  // Comm (5%) = 10,000. Dividend = 30,000. Dividend per member = 1,500.
  // Next installment = 10,000 - 1500 = 8,500. Prize paid = 200,000 - 40,000 = 160,000.
  const winBidder = await prisma.customerProfile.findFirst({
    where: { aadhaar: '900000000003' }
  });

  const auction1 = await prisma.chitAuction.create({
    data: {
      chitGroupId: chitGroup.id,
      installmentNo: 1,
      winningBidderId: winBidder!.id,
      bidAmount: 40000,
      dividendDistributed: 1500,
      nextInstallmentAmount: 8500,
      auctionDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
    }
  });

  // Generate Installment dues for round 1 (Amit Patel and Priya Nair pay. Winner pays net)
  await prisma.chitInstallment.createMany({
    data: [
      {
        chitGroupId: chitGroup.id,
        customerId: profile1.id,
        installmentNo: 1,
        dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        dueAmount: 8500,
        paidAmount: 8500,
        paidDate: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000),
        status: PaymentStatus.PAID
      },
      {
        chitGroupId: chitGroup.id,
        customerId: profile2.id,
        installmentNo: 1,
        dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        dueAmount: 8500,
        paidAmount: 8500,
        paidDate: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
        status: PaymentStatus.PAID
      },
      {
        chitGroupId: chitGroup.id,
        customerId: winBidder!.id,
        installmentNo: 1,
        dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        dueAmount: 8500,
        paidAmount: 8500, // Winner paid automatically via set-off
        paidDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        status: PaymentStatus.PAID
      }
    ]
  });

  // 8. Create LIC Policies (Customer 1 gets a policy, agent is Agent Suresh)
  const policy1 = await prisma.lICPolicy.create({
    data: {
      customerId: profile1.id,
      policyNumber: 'LIC-778899',
      planName: 'Jeevan Labh (836)',
      sumAssured: 500000,
      premiumAmount: 18500,
      premiumMode: 'YEARLY',
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // due in 15 days
      agentId: agent.id,
      commissionRate: 15.0,
      status: 'ACTIVE'
    }
  });

  // Add 1 paid premium payment for policy 1
  await prisma.lICPremiumHistory.create({
    data: {
      policyId: policy1.id,
      premiumAmount: 18500,
      paidDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      agentCommission: 18500 * 0.15,
      status: 'SUCCESS'
    }
  });

  // 9. Write some system audit logs
  await prisma.auditLog.createMany({
    data: [
      { userId: superadmin.id, action: 'SYSTEM_BOOT', details: 'Database seeded with core operational metrics.' },
      { userId: admin.id, action: 'KYC_RESOLVE', details: 'Admin Vikram resolved customer Amit Patel KYC.' }
    ]
  });

  console.log('Database Seeding Completed Successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
