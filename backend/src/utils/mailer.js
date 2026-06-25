import nodemailer from 'nodemailer';

let transporter = null;
let warned = false;

/**
 * Lazily build an SMTP transporter from env. Returns null (and warns once) if
 * SMTP isn't configured, so email features degrade gracefully instead of
 * crashing the API.
 */
const getTransporter = () => {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (!warned) {
      console.warn('✖ Email disabled: set SMTP_HOST, SMTP_USER and SMTP_PASS in .env to enable notifications.');
      warned = true;
    }
    return null;
  }
  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
};

/**
 * Sends an email. Resolves to true if sent, false if SMTP isn't configured.
 * Throws only on an actual send failure (callers may catch and ignore).
 */
export const sendMail = async ({ to, subject, html, text, replyTo }) => {
  const tx = getTransporter();
  if (!tx) return false;
  await tx.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
    replyTo,
  });
  return true;
};

/** Builds the HTML body for an enquiry notification email. */
export const enquiryEmailHtml = (e) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
    <div style="background:#FF7A00;color:#fff;padding:16px 20px">
      <h2 style="margin:0;font-size:18px">🕉 New Enquiry — Ayodhya Tirtham</h2>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#222">
      <tr><td style="padding:10px 20px;color:#888;width:120px">Name</td><td style="padding:10px 20px"><b>${e.name || '-'}</b></td></tr>
      <tr><td style="padding:10px 20px;color:#888">Email</td><td style="padding:10px 20px">${e.email || '-'}</td></tr>
      <tr><td style="padding:10px 20px;color:#888">Mobile</td><td style="padding:10px 20px">${e.mobile || '-'}</td></tr>
      <tr><td style="padding:10px 20px;color:#888">Subject</td><td style="padding:10px 20px">${e.subject || '-'}</td></tr>
      <tr><td style="padding:10px 20px;color:#888">Source</td><td style="padding:10px 20px">${e.source || '-'}</td></tr>
      <tr><td style="padding:10px 20px;color:#888;vertical-align:top">Message</td><td style="padding:10px 20px;white-space:pre-wrap">${e.message || '-'}</td></tr>
      <tr><td style="padding:10px 20px;color:#888">Received</td><td style="padding:10px 20px">${new Date().toLocaleString('en-IN')}</td></tr>
    </table>
  </div>`;
