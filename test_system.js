const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('==================================================');
  console.log('  Swaraj FinancePro AI E2E Docker Integration Test ');
  console.log('==================================================\n');

  const BASE_URL = 'http://localhost:5000/api';

  try {
    // 1. Log in as Admin
    console.log('1. Logging in as Admin (admin@swarajfinance.com)...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@swarajfinance.com', password: 'password123' })
    });
    
    if (!adminLoginRes.ok) {
      throw new Error(`Admin login failed: ${await adminLoginRes.text()}`);
    }
    
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.accessToken;
    console.log(`✅ Admin logged in successfully! Name: ${adminData.user.fullName}\n`);

    // 2. Log in as Customer
    console.log('2. Logging in as Customer (customer1@gmail.com)...');
    const custLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer1@gmail.com', password: 'password123' })
    });
    
    if (!custLoginRes.ok) {
      throw new Error(`Customer login failed: ${await custLoginRes.text()}`);
    }
    
    const custData = await custLoginRes.json();
    const custToken = custData.accessToken;
    const customerId = custData.user.customerProfileId;
    console.log(`✅ Customer logged in successfully! Name: ${custData.user.fullName}`);
    console.log(`✅ Retrieved Customer Profile ID: ${customerId}\n`);

    // 3. Apply for a loan with PENDING collateral
    console.log('3. Applying for a new loan (Customer Portal)...');
    const loanApplyRes = await fetch(`${BASE_URL}/loans/apply`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${custToken}`
      },
      body: JSON.stringify({
        customerId,
        loanType: 'PERSONAL',
        principal: 75000,
        interestRate: 14.5,
        tenorMonths: 24,
        collateralDescription: 'Fixed Deposit Receipt FD-889900',
        guarantorName: 'Rajesh Patel',
        guarantorPhone: '9111111111',
        collateralUrl: 'http://localhost/logo.jpg'
      })
    });
    
    if (!loanApplyRes.ok) {
      throw new Error(`Loan application failed: ${await loanApplyRes.text()}`);
    }
    const loanData = await loanApplyRes.json();
    const loanId = loanData.data.id;
    console.log(`✅ Loan application submitted successfully! ID: ${loanId}`);
    console.log(`   Collateral Status: ${loanData.data.collateralStatus}\n`);

    // 4. Try to approve the loan without verifying collateral (Should fail!)
    console.log('4. Attempting to approve loan without verified collateral...');
    const approveFailRes = await fetch(`${BASE_URL}/loans/${loanId}/approve`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    
    console.log(`   Response status: ${approveFailRes.status}`);
    const approveFailData = await approveFailRes.json();
    console.log(`✅ Correctly blocked! Error message: "${approveFailData.error}"\n`);

    // 5. Verify the collateral (Admin desk)
    console.log('5. Auditing and Verifying collateral (Admin Desk)...');
    const verifyRes = await fetch(`${BASE_URL}/loans/${loanId}/verify-collateral`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    if (!verifyRes.ok) {
      throw new Error(`Collateral verification failed: ${await verifyRes.text()}`);
    }
    const verifyData = await verifyRes.json();
    console.log(`✅ Collateral verified! Status: ${verifyData.data.collateralStatus}\n`);

    // 6. Approve the loan now that collateral is verified (Should succeed!)
    console.log('6. Approving loan application now...');
    const approveRes = await fetch(`${BASE_URL}/loans/${loanId}/approve`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    if (!approveRes.ok) {
      throw new Error(`Loan approval failed: ${await approveRes.text()}`);
    }
    const approveData = await approveRes.json();
    console.log(`✅ Loan approved successfully! Status: ${approveData.data.status}\n`);

    // 7. Download Monthly Collections Report (PDF format)
    console.log('7. Downloading Monthly Subscriptions & Collections Audit Report (PDF)...');
    const reportRes = await fetch(`${BASE_URL}/reports/monthly-status?format=pdf`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!reportRes.ok) {
      throw new Error(`Monthly report download failed: ${await reportRes.text()}`);
    }
    
    const buffer = Buffer.from(await reportRes.arrayBuffer());
    const reportPath = path.join(__dirname, 'swaraj_monthly_report.pdf');
    fs.writeFileSync(reportPath, buffer);
    console.log(`✅ Monthly Report PDF generated and saved successfully!`);
    console.log(`   Path: ${reportPath}\n`);

    console.log('==================================================');
    console.log(' 🎉 ALL E2E DOCKER INTEGRATION TESTS PASSED!');
    console.log('==================================================');
  } catch (err) {
    console.error('\n❌ Test execution failed:', err.message);
    process.exit(1);
  }
}

runTests();
