import nodemailer from "nodemailer";
import "dotenv/config";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASSWORD,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const { to, subject, html, attachments } = options;

  await transporter.sendMail({
    from: `"CivicSync" <${GMAIL_USER}>`,
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType ?? "application/pdf",
    })),
  });
};

export const generatePaymentReceiptEmail = (receiptData: {
  receiptNumber: string;
  paymentId: string;
  paymentFor: string;
  amount: number;
  method?: string;
  status: string;
  paidAt?: Date;
  referenceValue: string;
}): { subject: string; html: string } => {
  const { receiptNumber, paymentFor, amount, method, status, paidAt, referenceValue } = receiptData;
  const paidDate = paidAt
    ? new Date(paidAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })
    : "N/A";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <div style="background: #1E3A5F; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">CivicSync</h1>
        <p style="color: #9ca3af; margin: 5px 0 0; font-size: 14px;">Official Payment Receipt</p>
      </div>
      <div style="padding: 24px; background: #ffffff;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Receipt Number</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827; font-size: 14px;">${receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment For</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827; font-size: 14px;">${paymentFor === "bill" ? "Bill Payment" : "Service Fee"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827; font-size: 18px;">₹${amount.toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Method</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827; font-size: 14px;">${method ? method.charAt(0).toUpperCase() + method.slice(1) : "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981; font-size: 14px;">${status.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Paid At</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827; font-size: 14px;">${paidDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${paymentFor === "bill" ? "Bill Number" : "Service Request Ref"}</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827; font-size: 14px;">${referenceValue}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">This is a system-generated receipt. For support, contact CivicSync Help Center.</p>
        </div>
      </div>
    </div>
  `;

  return {
    subject: `CivicSync Payment Receipt - ${receiptNumber}`,
    html,
  };
};

export const generateDocumentEmail = (docType: string, refNumber: string): { subject: string; html: string } => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <div style="background: #1E3A5F; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">CivicSync</h1>
        <p style="color: #9ca3af; margin: 5px 0 0; font-size: 14px;">Your Document is Ready</p>
      </div>
      <div style="padding: 24px; background: #ffffff; text-align: center;">
        <h2 style="color: #1E3A5F; margin: 0 0 16px;">${docType} Download</h2>
        <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
          Your ${docType.toLowerCase()} for reference number <strong>${refNumber}</strong> has been generated.
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Please find the document attached to this email. You can download and save it for your records.
        </p>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">For support, contact CivicSync Help Center.</p>
        </div>
      </div>
    </div>
  `;

  return {
    subject: `CivicSync ${docType} - ${refNumber}`,
    html,
  };
};