const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const nodemailer = require('./backend/node_modules/nodemailer');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgrespassword@localhost:5432/swaraj_financepro?schema=public"
    }
  }
});

async function main() {
  console.log('==================================================');
  console.log('    Programmatic SMTP Provisioning with Ethereal   ');
  console.log('==================================================\n');

  try {
    console.log('⌛ Generating nodemailer test account credentials...');
    const account = await nodemailer.createTestAccount();
    
    console.log('✅ SMTP Test Credentials Generated:');
    console.log(`   Host:     ${account.smtp.host}`);
    console.log(`   Port:     ${account.smtp.port}`);
    console.log(`   Username: ${account.user}`);
    console.log(`   Password: ${account.pass}`);

    console.log('\n⌛ Saving configurations to the database...');
    let settings = await prisma.companySetting.findFirst();
    if (settings) {
      settings = await prisma.companySetting.update({
        where: { id: settings.id },
        data: {
          smtpHost: account.smtp.host,
          smtpPort: account.smtp.port,
          smtpUser: account.user,
          smtpPass: account.pass,
          smtpFrom: `billing@swarajfinance.com`
        }
      });
    } else {
      settings = await prisma.companySetting.create({
        data: {
          companyName: 'Swaraj Pvt. Limited',
          logoUrl: '/logo.jpg',
          address: '123 Swaraj Chowk, New Delhi',
          baseInterestRate: 12.0,
          basePenaltyRate: 2.0,
          smtpHost: account.smtp.host,
          smtpPort: account.smtp.port,
          smtpUser: account.user,
          smtpPass: account.pass,
          smtpFrom: `billing@swarajfinance.com`
        }
      });
    }
    console.log('✅ Configuration saved successfully to the database!');

    console.log('\n⌛ Dispatching verified test email...');
    const transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass
      }
    });

    const info = await transporter.sendMail({
      from: '"Swaraj Pvt. Limited" <billing@swarajfinance.com>',
      to: 'customer1@gmail.com',
      subject: 'SMTP Autoconfig Complete - Swaraj FinancePro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
          <div style="background-color: #0b192c; color: white; padding: 25px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Swaraj Pvt. Limited</h2>
            <p style="margin: 5px 0 0 0; font-size: 11px; opacity: 0.8;">Trust &bull; Growth &bull; Together</p>
          </div>
          <div style="padding: 25px; color: #333; line-height: 1.6;">
            <h3 style="color: #0b192c; margin-top: 0;">Ethereal SMTP Active</h3>
            <p>Hello,</p>
            <p>Your autoconfigured SMTP server is fully operational! The platform will now routing all premium notices, chit auction updates, and debt overdue notifications to Ethereal Mail sandbox.</p>
            <p>You can check the test inbox immediately using the verification link below.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 11px; color: #666;">This is an automated system check.</p>
          </div>
          <div style="background-color: #f8fafc; color: #64748b; font-size: 10px; text-align: center; padding: 15px; border-top: 1px solid #f1f5f9;">
            Swaraj Pvt. Limited &bull; &copy; ${new Date().getFullYear()}
          </div>
        </div>
      `
    });

    const testUrl = nodemailer.getTestMessageUrl(info);
    console.log('✅ Test email sent successfully!');
    console.log(`🔗 Click here to view the email: ${testUrl}\n`);
    
    console.log('==================================================');
    console.log(' 🎉 SMTP PROVISIONING COMPLETE!');
    console.log('==================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed programmatically setting up SMTP:', err.message);
    process.exit(1);
  }
}

main();
