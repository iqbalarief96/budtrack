'use server'

/**
 * Brevo API integration for sending transactional emails
 * Using direct API instead of SMTP for better deliverability
 */

// Type for email parameters
export type BrevoEmailParams = {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  sender?: {
    name?: string;
    email?: string;
  };
}

/**
 * Send transactional email using Brevo API
 */
export async function sendBrevoEmail(params: BrevoEmailParams) {
  const API_KEY = process.env.BREVO_API_KEY;
  if (!API_KEY) {
    console.error('BREVO_API_KEY not found in environment variables');
    return { success: false, error: 'API key not configured' };
  }

  // Default sender jika tidak ada di params
  const sender = params.sender || {
    name: process.env.BREVO_SENDER_NAME || 'BudTrack App',
    email: process.env.BREVO_SENDER_EMAIL || 'budtrack@example.com',
  };

  try {
    // Log untuk debugging
    console.log(`Sending email via Brevo API to: ${params.to[0].email}`);
    
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender,
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response from Brevo API:', errorData);
      return { 
        success: false, 
        status: response.status,
        error: errorData 
      };
    }

    const data = await response.json();
    console.log('Email sent successfully via Brevo API:', { messageId: data.messageId });
    return { 
      success: true, 
      messageId: data.messageId 
    };
  } catch (error) {
    console.error('Error sending email via Brevo API:', error);
    return { 
      success: false, 
      error 
    };
  }
} 