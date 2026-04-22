import { Types } from "mongoose";
import PDFDocument from "pdfkit";

interface StatusHistoryItem {
  status: string;
  note?: string;
  timestamp: string;
}

interface Address {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface Department {
  name?: string;
  code?: string;
}

interface District {
  name?: string;
  state?: string;
}

interface ComplaintDocument {
  _id: Types.ObjectId;
  referenceNumber: string;
  category: string;
  description: string;
  status: string;
  urgency: string;
  createdAt: string;
  resolvedAt?: string;
  department?: Department;
  district?: District;
  address?: Address;
  statusHistory?: StatusHistoryItem[];
  userId?: Types.ObjectId;
}

const STATUS_CONFIG: Record<string, { label: string }> = {
  submitted: { label: "Submitted" },
  acknowledged: { label: "Acknowledged" },
  in_progress: { label: "In Progress" },
  escalated: { label: "Escalated" },
  resolved: { label: "Resolved" },
  rejected: { label: "Rejected" },
  under_review: { label: "Under Review" },
};

function dateFmt(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const generateComplaintPdf = async (complaint: ComplaintDocument): Promise<Buffer> => {

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    doc.info.Title = `CivicSync Complaint ${complaint.referenceNumber}`;
    doc.info.Author = "CivicSync";
    doc.info.Subject = "Complaint Receipt";

    // Header
    doc.fontSize(22).fillColor("#1E3A5F").text("CivicSync", { align: "left" });
    doc.fontSize(11).fillColor("#6B7280").text(`Complaint Receipt — ${complaint.referenceNumber}`, { align: "left" });

    doc.moveDown(1.2);
    doc.lineWidth(1).strokeColor("#E5E7EB").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Details
    const addRow = (label: string, value: string) => {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(label, 50, doc.y, { continued: true, width: 170 });
      doc.font("Helvetica").fontSize(11).fillColor("#374151").text(value, { width: 350 });
      doc.moveDown(0.35);
    };

    addRow("Reference Number:", complaint.referenceNumber);
    addRow("Department:", complaint.department?.name ?? "—");
    addRow("Category:", complaint.category);
    addRow("Urgency:", complaint.urgency);
    addRow("Current Status:", STATUS_CONFIG[complaint.status]?.label ?? complaint.status);
    addRow("Filed On:", dateFmt(complaint.createdAt));
    addRow("Location:", `${complaint.address?.street ?? ""}, ${complaint.address?.city ?? ""}, ${complaint.address?.state ?? ""} — ${complaint.address?.pincode ?? ""}`);
    addRow("District:", `${complaint.district?.name ?? "—"}, ${complaint.district?.state ?? ""}`);
    if (complaint.resolvedAt) addRow("Resolved On:", dateFmt(complaint.resolvedAt));

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Description:", 50, doc.y);
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(11).fillColor("#374151").text(complaint.description, { width: 495 });
    doc.moveDown(1);

    // Status History
    if (complaint.statusHistory && complaint.statusHistory.length > 0) {
      doc.lineWidth(1).strokeColor("#E5E7EB").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#1E3A5F").text("Status History", 50, doc.y);
      doc.moveDown(0.3);

      const tableData = complaint.statusHistory.map((h, i) => [
        String(i + 1),
        STATUS_CONFIG[h.status]?.label ?? h.status,
        h.note || "—",
        new Date(h.timestamp).toLocaleString("en-IN"),
      ]);

      (doc as any).table?.({
        startY: doc.y,
        head: [["#", "Status", "Note", "Date & Time"]],
        body: tableData,
        headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        margin: { left: 50, right: 50 },
      }) ?? doc.moveDown(5);
    }

    doc.moveDown(1);
    doc.lineWidth(1).strokeColor("#E5E7EB").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor("#6B7280").text("This is a system-generated document. For support, contact CivicSync Help Center.");

    doc.end();
  });
};