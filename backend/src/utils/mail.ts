import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/** Gmail: set `GMAIL_USER` (full address) and `GMAIL_PASSWORD` (Google App Password) in `.env`. */
export function isReceiptEmailConfigured(): boolean {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_PASSWORD?.trim();
  if (gmailUser && gmailPass) return true;

  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

function createTransporter(): Transporter {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_PASSWORD?.trim();
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  }

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) {
    const err = new Error(
      "Email not configured. Set GMAIL_USER + GMAIL_PASSWORD in .env (recommended), or SMTP_HOST + SMTP_USER + SMTP_PASS.",
    );
    (err as NodeJS.ErrnoException).code = "MAIL_NOT_CONFIGURED";
    throw err;
  }

  const port = Number(process.env.SMTP_PORT || "587");
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
}

function defaultFromAddress(): string {
  const gmailUser = process.env.GMAIL_USER?.trim();
  if (gmailUser) return gmailUser;

  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "CivicSync <noreply@civicsync.local>"
  );
}

export async function sendReceiptPdfEmail(opts: {
  to: string;
  receiptNumber: string;
  pdfBuffer: Buffer;
  filename: string;
}): Promise<void> {
  if (!isReceiptEmailConfigured()) {
    const err = new Error(
      "Email not configured. Add GMAIL_USER and GMAIL_PASSWORD to your .env file (use a Google App Password, not your normal login password, if 2-Step Verification is on).",
    );
    (err as NodeJS.ErrnoException).code = "MAIL_NOT_CONFIGURED";
    throw err;
  }

  const transporter = createTransporter();
  const from = defaultFromAddress();

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: `CivicSync payment receipt ${opts.receiptNumber}`,
    text: `Your payment receipt ${opts.receiptNumber} is attached as a PDF.`,
    html: `<p>Your payment receipt <strong>${opts.receiptNumber}</strong> is attached.</p><p>Thank you for using CivicSync.</p>`,
    attachments: [
      {
        filename: opts.filename,
        content: opts.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
