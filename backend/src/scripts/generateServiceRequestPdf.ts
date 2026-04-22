import { Types } from "mongoose";

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

interface ServiceRequestDocument {
  _id: Types.ObjectId;
  referenceNumber: string;
  serviceType: string;
  requestType: string;
  applicantName: string;
  contactPhone: string;
  status: string;
  createdAt: string;
  estimatedCompletionDate?: string;
  completedAt?: string;
  department?: Department;
  district?: District;
  address?: Address;
  statusHistory?: StatusHistoryItem[];
  userId?: Types.ObjectId;
}

const STATUS_CONFIG: Record<string, { label: string }> = {
  submitted: { label: "Submitted" },
  under_review: { label: "Under Review" },
  approved: { label: "Approved" },
  processing: { label: "Processing" },
  completed: { label: "Completed" },
  rejected: { label: "Rejected" },
};

function dateFmt(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const generateServiceRequestPdf = async (serviceRequest: ServiceRequestDocument): Promise<Buffer> => {
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    doc.info.Title = `CivicSync Service Request ${serviceRequest.referenceNumber}`;
    doc.info.Author = "CivicSync";
    doc.info.Subject = "Service Request Receipt";

    // Header
    doc.fontSize(22).fillColor("#1E3A5F").text("CivicSync", { align: "left" });
    doc.fontSize(11).fillColor("#6B7280").text(`Service Request Receipt — ${serviceRequest.referenceNumber}`, { align: "left" });

    doc.moveDown(1.2);
    doc.lineWidth(1).strokeColor("#E5E7EB").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Details
    const addRow = (label: string, value: string) => {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(label, 50, doc.y, { continued: true, width: 170 });
      doc.font("Helvetica").fontSize(11).fillColor("#374151").text(value, { width: 350 });
      doc.moveDown(0.35);
    };

    addRow("Reference Number:", serviceRequest.referenceNumber);
    addRow("Department:", serviceRequest.department?.name ?? "—");
    addRow("Service Type:", serviceRequest.serviceType);
    addRow("Request Type:", serviceRequest.requestType.replace(/_/g, " "));
    addRow("Applicant:", serviceRequest.applicantName);
    addRow("Phone:", serviceRequest.contactPhone);
    addRow("Current Status:", STATUS_CONFIG[serviceRequest.status]?.label ?? serviceRequest.status);
    addRow("Applied On:", dateFmt(serviceRequest.createdAt));
    addRow("Location:", `${serviceRequest.address?.street ?? ""}, ${serviceRequest.address?.city ?? ""}, ${serviceRequest.address?.state ?? ""} — ${serviceRequest.address?.pincode ?? ""}`);
    addRow("District:", `${serviceRequest.district?.name ?? "—"}, ${serviceRequest.district?.state ?? ""}`);
    if (serviceRequest.estimatedCompletionDate) addRow("Est. Completion:", dateFmt(serviceRequest.estimatedCompletionDate));
    if (serviceRequest.completedAt) addRow("Completed On:", dateFmt(serviceRequest.completedAt));

    // Status History
    if (serviceRequest.statusHistory && serviceRequest.statusHistory.length > 0) {
      doc.moveDown(0.5);
      doc.lineWidth(1).strokeColor("#E5E7EB").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#1E3A5F").text("Status History", 50, doc.y);
      doc.moveDown(0.3);

      const tableData = serviceRequest.statusHistory.map((h, i) => [
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