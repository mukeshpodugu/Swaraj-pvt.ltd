const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const readline = require('readline');
const nodemailer = require('./backend/node_modules/nodemailer');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgrespassword@localhost:5432/swaraj_financepro?schema=public"
    }
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n==================================================');
  console.log('       Swaraj SMTP Configuration Wizard           ');
  console.log('==================================================\n');

  try {
    const host = await askQuestion('Enter SMTP Host [default: smtp.gmail.com]: ') || 'smtp.gmail.com';
    
    let portInput = await askQuestion('Enter SMTP Port [default: 587]: ') || '587';
    let port = parseInt(portInput, 10);
    if (isNaN(port)) port = 587;

    const user = await askQuestion('Enter SMTP Username/Email: ');
    if (!user) {
      console.log('❌ Username is required. Exiting wizard.');
      process.exit(1);
    }

    const pass = await askQuestion('Enter SMTP Password (or Gmail App Password): ');
    if (!pass) {
      console.log('❌ Password is required. Exiting wizard.');
      process.exit(1);
    }

    const from = await askQuestion(`Enter Sender Email [default: ${user}]: `) || user;

    console.log('\n⌛ Connecting to database and saving configurations...');
    
    let settings = await prisma.companySetting.findFirst();
    if (settings) {
      settings = await prisma.companySetting.update({
        where: { id: settings.id },
        data: { smtpHost: host, smtpPort: port, smtpUser: user, smtpPass: pass, smtpFrom: from }
      });
    } else {
      settings = await prisma.companySetting.create({
        data: {
          companyName: 'Swaraj Pvt. Limited',
          logoUrl: '/logo.jpg',
          address: '123 Swaraj Chowk, New Delhi',
          baseInterestRate: 12.0,
          basePenaltyRate: 2.0,
          smtpHost: host,
          smtpPort: port,
          smtpUser: user,
          smtpPass: pass,
          smtpFrom: from
        }
      });
    }
    
    console.log('✅ Configuration saved successfully to the database!');

    const testMail = await askQuestion('\nDo you want to send a test email now? (y/n): ');
    if (testMail.toLowerCase() === 'y' || testMail.toLowerCase() === 'yes') {
      const recipient = await askQuestion('Enter test recipient email address: ');
      if (recipient) {
        console.log(`⌛ Dispatching test email to ${recipient}...`);
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass }
        });

        await transporter.sendMail({
          from: `"${settings.companyName}" <${from}>`,
          to: recipient,
          subject: 'SMTP Connection Test - Swaraj FinancePro',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
              <div style="background-color: #0b192c; color: white; padding: 25px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Swaraj Pvt. Limited</h2>
                <p style="margin: 5px 0 0 0; font-size: 11px; opacity: 0.8;">Trust &bull; Growth &bull; Together</p>
              </div>
              <div style="padding: 25px; color: #333; line-height: 1.6;">
                <h3 style="color: #0b192c; margin-top: 0;">SMTP Connection Verified</h3>
                <p>Hello,</p>
                <p>This is a verification email confirming that your SMTP server settings for the **Swaraj FinancePro** system have been configured successfully!</p>
                <p>The platform will now transmit real-time customer premium invoices, chit auction statements, and overdue EMI alerts using this mail server channel.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 11px; color: #666;">This is an automated system check. Do not reply directly to this mail.</p>
              </div>
              <div style="background-color: #f8fafc; color: #64748b; font-size: 10px; text-align: center; padding: 15px; border-top: 1px solid #f1f5f9;">
                Swaraj Pvt. Limited, 123 Swaraj Chowk, Finance District, New Delhi &bull; &copy; ${new Date().getFullYear()}
              </div>
            </div>
          `
        });
        console.log('✅ Test email sent successfully! Please check your inbox.');
      }
    }

    console.log('\n🎉 Setup complete. Exiting wizard.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ An error occurred:', err.message);
    process.exit(1);
  }
}

main();
