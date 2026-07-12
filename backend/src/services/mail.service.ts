import nodemailer from 'nodemailer';
import prisma from '../config/db';

export class MailService {
  /**
   * Generates a reusable HTML structure with Swaraj Pvt. Limited branding
   */
  private static getBrandedTemplate(title: string, bodyContent: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
          }
          .header {
            background-color: #0b192c; /* Deep Navy Blue */
            padding: 30px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .header p {
            margin: 5px 0 0 0;
            font-size: 12px;
            opacity: 0.8;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .content {
            padding: 40px 30px;
            color: #1f2937;
            line-height: 1.6;
          }
          .content h2 {
            margin-top: 0;
            font-size: 20px;
            color: #1e3a8a; /* Royal Blue */
          }
          .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #1e3a8a;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .meta-table th, .meta-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          .meta-table th {
            background-color: #f9fafb;
            color: #4b5563;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="text-align: center;">
            <img src="http://localhost:5000/logo.jpg" alt="Swaraj Private Limited Logo" style="height: 60px; margin-bottom: 10px; background-color: white; padding: 4px; border-radius: 6px; display: inline-block;" />
            <h1 style="margin: 0; font-size: 20px; text-transform: uppercase;">Swaraj Pvt. Limited</h1>
            <p style="margin: 5px 0 0 0; font-size: 10px; opacity: 0.8; letter-spacing: 1px;">Trust &bull; Growth &bull; Together</p>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          <div class="footer">
            <p>Swaraj Pvt. Limited, 123 Swaraj Chowk, Finance District, New Delhi</p>
            <p>&copy; ${new Date().getFullYear()} Swaraj Pvt. Limited. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Dispatches emails and stores result logs in NotificationLog
   */
  public static async sendEmail(
    customerId: string,
    recipientEmail: string,
    subject: string,
    title: string,
    bodyHtml: string,
    templateName: string
  ) {
    const settings = await prisma.companySetting.findFirst();
    
    const host = settings?.smtpHost || 'smtp.mailtrap.io';
    const port = settings?.smtpPort || 2525;
    const user = settings?.smtpUser;
    const pass = settings?.smtpPass;
    const from = settings?.smtpFrom || 'no-reply@swarajfinance.com';

    let status = 'SENT';
    let errorMessage: string | undefined = undefined;

    const fullHtml = this.getBrandedTemplate(title, bodyHtml);

    // If SMTP credentials exist, perform real dispatch, otherwise run local mock logging.
    if (user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass
          }
        });

        await transporter.sendMail({
          from: `"Swaraj Pvt. Limited" <${from}>`,
          to: recipientEmail,
          subject,
          html: fullHtml
        });
      } catch (err: any) {
        status = 'FAILED';
        errorMessage = err.message || 'SMTP Dispatch Error';
        console.error('[Mailer Error]: ', err);
      }
    } else {
      console.log(`[SMTP Dry-Run] To: ${recipientEmail} | Subject: ${subject}`);
    }

    // Save logs to database
    try {
      await prisma.notificationLog.create({
        data: {
          customerId,
          channel: 'EMAIL',
          templateName,
          recipient: recipientEmail,
          content: `Subject: ${subject} | ${title}`,
          status,
          errorMessage
        }
      });
    } catch (dbErr) {
      console.error('Failed to save email notification log to DB', dbErr);
    }
  }

  public static async sendWelcomeEmail(customerId: string, email: string, name: string) {
    const body = `
      <h2>Welcome to Swaraj FinancePro!</h2>
      <p>Dear ${name},</p>
      <p>Thank you for choosing Swaraj Pvt. Limited. Your account has been successfully configured and activated.</p>
      <p>You can now log in to the Customer Portal to monitor your active Chit groups, view loan EMI schedules, keep track of your LIC policies, and download official premium receipts.</p>
      <a href="http://localhost:5173/portal" class="button">Access Customer Portal</a>
      <p>If you have any questions or require support, please contact your designated agent or reach out to our support desk.</p>
    `;
    await this.sendEmail(customerId, email, 'Welcome to Swaraj FinancePro AI', 'Account Activated', body, 'WELCOME');
  }

  public static async sendLoanStatusEmail(
    customerId: string,
    email: string,
    name: string,
    loanType: string,
    principal: number,
    status: 'APPROVED' | 'REJECTED'
  ) {
    const isApproved = status === 'APPROVED';
    const body = `
      <h2>Loan Application Update</h2>
      <p>Dear ${name},</p>
      <p>Your application for a <strong>${loanType} Loan</strong> has been reviewed by our credit underwriting team.</p>
      <table class="meta-table">
        <tr>
          <th>Loan Type</th>
          <td>${loanType}</td>
        </tr>
        <tr>
          <th>Principal Amount</th>
          <td>Rs. ${principal.toLocaleString()}</td>
        </tr>
        <tr>
          <th>Status</th>
          <td style="color: ${isApproved ? '#10b981' : '#ef4444'}; font-weight: bold;">${status}</td>
        </tr>
      </table>
      ${isApproved 
        ? `<p>Congratulations! Our disbursal officer will get in touch with you shortly to secure documentation and transfer coordinates.</p>
           <a href="http://localhost:5173/portal" class="button">View Schedule</a>`
        : `<p>Unfortunately, we are unable to approve your application at this time. This decision was informed by our credit risk algorithm (AI Underwriting Profile). Please feel free to re-apply after 6 months or discuss alternative collateral terms with an agent.</p>`
      }
    `;
    await this.sendEmail(
      customerId,
      email,
      `Loan Application ${status} - Swaraj Pvt. Limited`,
      'Loan Assessment Result',
      body,
      isApproved ? 'LOAN_APPROVAL' : 'LOAN_REJECTION'
    );
  }

  public static async sendPaymentReceiptEmail(
    customerId: string,
    email: string,
    name: string,
    paymentType: string,
    amount: number,
    referenceId: string
  ) {
    const body = `
      <h2>Payment Receipt Confirmation</h2>
      <p>Dear ${name},</p>
      <p>We acknowledge receipt of your payment with details summarized below:</p>
      <table class="meta-table">
        <tr>
          <th>Payment Type</th>
          <td>${paymentType}</td>
        </tr>
        <tr>
          <th>Amount Paid</th>
          <td>Rs. ${amount.toLocaleString()}</td>
        </tr>
        <tr>
          <th>Transaction Reference</th>
          <td><code>${referenceId}</code></td>
        </tr>
        <tr>
          <th>Date</th>
          <td>${new Date().toLocaleDateString()}</td>
        </tr>
      </table>
      <p>A detailed PDF copy of your receipt has been registered and is ready for download in your mobile dashboard.</p>
      <a href="http://localhost:5173/portal" class="button">Go to Portal</a>
    `;
    await this.sendEmail(
      customerId,
      email,
      `Receipt: Payment Received (Ref: ${referenceId})`,
      'Payment Received',
      body,
      'PAYMENT_RECEIPT'
    );
  }

  public static async sendNextDueEmail(
    customerId: string,
    email: string,
    name: string,
    productName: string,
    dueAmount: number,
    dueDate: Date
  ) {
    const body = `
      <h2>New Product Subscription & Next Due Notice</h2>
      <p>Dear ${name},</p>
      <p>This is to confirm your new enrollment in <strong>${productName}</strong>. Your subscription has been activated in our systems.</p>
      <p>Please find details of your first/next monthly payment due below:</p>
      <table class="meta-table">
        <tr>
          <th>Product Name</th>
          <td>${productName}</td>
        </tr>
        <tr>
          <th>Due Amount</th>
          <td>Rs. ${dueAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <th>Due Date</th>
          <td>${dueDate.toLocaleDateString()}</td>
        </tr>
      </table>
      <p>Please ensure payment is completed on or before the due date to avoid penalty charges or policy lapse.</p>
      <a href="http://localhost:5173/portal" class="button">Pay Installment Online</a>
    `;
    await this.sendEmail(
      customerId,
      email,
      `Next Due Notice: ${productName} - Swaraj Pvt. Limited`,
      'Enrollment & Due Notice',
      body,
      'NEXT_DUE_NOTICE'
    );
  }

  public static async sendOverdueReminderEmail(
    customerId: string,
    email: string,
    name: string,
    productName: string,
    dueAmount: number,
    dueDate: Date,
    penaltyAmount: number = 0
  ) {
    const body = `
      <h2 style="color: #ef4444;">Overdue Payment Reminder</h2>
      <p>Dear ${name},</p>
      <p>This is a reminder that your payment for <strong>${productName}</strong> was due on <strong>${dueDate.toLocaleDateString()}</strong> and is currently **UNPAID**.</p>
      <table class="meta-table">
        <tr>
          <th>Product Name</th>
          <td>${productName}</td>
        </tr>
        <tr>
          <th>Installment Due</th>
          <td>Rs. ${dueAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <th>Accumulated Penalty</th>
          <td style="color: #ef4444; font-weight: bold;">Rs. ${penaltyAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <th>Total Outstanding</th>
          <td style="font-weight: bold;">Rs. ${(dueAmount + penaltyAmount).toLocaleString()}</td>
        </tr>
      </table>
      <p>Please log in to the portal and settle your outstanding balance immediately to prevent additional penalty rates or policy suspension.</p>
      <a href="http://localhost:5173/portal" class="button" style="background-color: #ef4444;">Pay Overdue Installment</a>
    `;
    await this.sendEmail(
      customerId,
      email,
      `URGENT: Overdue Reminder for ${productName}`,
      'Payment Overdue Notice',
      body,
      'OVERDUE_REMINDER'
    );
  }
}

