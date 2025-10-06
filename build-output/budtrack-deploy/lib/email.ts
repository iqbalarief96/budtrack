'use server'

import nodemailer from 'nodemailer'
import { sendBrevoEmail } from './brevo-api'

// Check if SMTP credentials are available
const isSmtpConfigured = process.env.BREVO_SMTP_HOST && 
                        process.env.BREVO_SMTP_USER && 
                        process.env.BREVO_SMTP_PASSWORD;

// Check if API key is available
const isApiConfigured = !!process.env.BREVO_API_KEY;

// Setup nodemailer transporter with SMTP Brevo
let transporter: nodemailer.Transporter | null = null;

try {
  if (isSmtpConfigured) {
    transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false, // true untuk 465, false untuk other ports
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD,
      },
    });
    console.log("Email transporter initialized successfully");
  } else {
    console.warn("SMTP credentials not found in environment variables.");
  }
} catch (error) {
  console.error("Failed to create email transporter:", error);
}

type EmailPayload = {
  to: string
  subject: string
  html: string
}

export async function sendEmail(payload: EmailPayload) {
  try {
    // Try API first if configured (should be more reliable)
    if (isApiConfigured) {
      console.log('Using Brevo API to send email');
      const result = await sendBrevoEmail({
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.html,
      });
      
      return result;
    }
    
    // If API not configured, fall back to SMTP
    if (!transporter) {
      console.log(`[EMAIL MOCK] Would send email to: ${payload.to}`);
      console.log(`[EMAIL MOCK] Subject: ${payload.subject}`);
      console.log(`[EMAIL MOCK] HTML length: ${payload.html.length} chars`);
      return { success: true, messageId: 'mocked-email-id', mocked: true };
    }
    
    // Otherwise, actually send the email via SMTP
    const info = await transporter.sendMail({
      from: `"BudTrack App" <${process.env.BREVO_SMTP_USER}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    console.log(`Email sent via SMTP: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

// Template email untuk berbagai jenis notifikasi
export async function getGroupNotificationEmailTemplate({
  groupName,
  action,
  userName,
  details,
  actionUrl
}: {
  groupName: string
  action: string
  userName: string
  details?: string
  actionUrl?: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #6366f1; margin: 0;">BudTrack</h1>
        <p style="color: #666; margin: 5px 0 0;">Manage your group finances</p>
      </div>
      
      <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #333;">Group Update: ${groupName}</h2>
        <p style="margin-bottom: 10px; color: #555; font-size: 16px;">
          Hi there,
        </p>
        <p style="margin-bottom: 20px; color: #555; font-size: 16px;">
          ${action} in the group "${groupName}" by ${userName}.
        </p>
        ${details ? `<p style="margin-bottom: 20px; color: #555; font-size: 16px;">${details}</p>` : ''}
        ${actionUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${actionUrl}" style="background-color: #6366f1; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Details
          </a>
        </div>
        ` : ''}
      </div>
      
      <div style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
        <p>This email was sent from BudTrack, your group finance management app.</p>
        <p>If you didn't expect this email, please ignore it or contact support.</p>
      </div>
    </div>
  `
}

// Contoh penggunaan:
// sendGroupNotification('New Transaction', userId, groupId, transactionId) 