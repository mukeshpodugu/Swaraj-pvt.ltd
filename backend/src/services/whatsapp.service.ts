import prisma from '../config/db';

export interface WhatsAppVariables {
  customerName: string;
  amount?: string | number;
  date?: string;
  itemName?: string; // Loan type, Chit name, Policy number
  extraText?: string;
}

export class WhatsAppService {
  private static templates: Record<string, string> = {
    WELCOME: 'Hello {customerName}, welcome to Swaraj Pvt. Limited. Your account is active. Explore our Chits, Loans, and LIC options.',
    LOAN_APPROVAL: 'Dear {customerName}, your loan of Rs. {amount} has been APPROVED by Swaraj Pvt. Limited. Disbursal schedule will be shared shortly.',
    LOAN_REJECTION: 'Dear {customerName}, we regret to inform you that your loan application has been rejected at this stage. Detailed info has been sent via email.',
    PAYMENT_RECEIVED: 'Namaste {customerName}, we have successfully received your payment of Rs. {amount} towards {itemName} on {date}. Receipt download available in customer portal. Swaraj Pvt. Limited.',
    DUE_REMINDER: 'Alert {customerName}: Your payment of Rs. {amount} for {itemName} is due on {date}. Please pay promptly to avoid penalty fees. Swaraj Pvt. Limited.',
    POLICY_LAPSED: 'Warning {customerName}: Your LIC Policy {itemName} has lapsed due to non-payment of premium. Please contact your Swaraj Agent to renew.',
    BIRTHDAY_WISHES: 'Dear {customerName}, Swaraj Pvt. Limited wishes you a very Happy Birthday! May you have a prosperous and financially secure year ahead.',
    FESTIVAL_GREETINGS: 'Dear {customerName}, Swaraj Pvt. Limited wishes you and your family a very happy and prosperous festival season! May wealth and happiness overflow.'
  };

  /**
   * Sends a WhatsApp notification using configured settings or falls back to system logger.
   * Creates a NotificationLog entry in the database.
   */
  public static async sendWhatsApp(
    customerId: string,
    templateName: keyof typeof WhatsAppService.templates,
    recipient: string,
    variables: WhatsAppVariables
  ) {
    let template = this.templates[templateName];
    if (!template) {
      throw new Error(`WhatsApp Template ${templateName} not found.`);
    }

    // Replace placeholders
    let content = template
      .replace('{customerName}', variables.customerName)
      .replace('{amount}', String(variables.amount || ''))
      .replace('{date}', variables.date || '')
      .replace('{itemName}', variables.itemName || '')
      .replace('{extraText}', variables.extraText || '');

    // Get API Key from settings to see if real delivery is possible
    const settings = await prisma.companySetting.findFirst();
    const apiKey = settings?.whatsappApiKey;
    
    let status = 'SENT';
    let errorMessage: string | undefined = undefined;

    if (apiKey) {
      try {
        // Here we would make a real POST request to the WhatsApp Business API or Twilio API.
        // e.g. await axios.post('https://graph.facebook.com/v19.0/me/messages', { ... })
        // For demonstration, we assume successful API handover.
      } catch (err: any) {
        status = 'FAILED';
        errorMessage = err.message || 'WhatsApp Cloud API Error';
      }
    } else {
      // Dry run Mode / Development Log
      console.log(`[WhatsApp Dry-Run] To: ${recipient} | Content: ${content}`);
    }

    // Save to Database
    const log = await prisma.notificationLog.create({
      data: {
        customerId,
        channel: 'WHATSAPP',
        templateName,
        recipient,
        content,
        status,
        errorMessage
      }
    });

    return log;
  }
}
