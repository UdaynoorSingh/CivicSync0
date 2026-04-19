import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Receipt,
  Download,
  CreditCard,
  Banknote,
  FileText,
  IndianRupee,
  AlertCircle,
  Filter,
  CalendarDays,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTranslation } from "../../lib/i18n";
import * as api from "../../lib/api";
import MascotGuide from "../../components/shared/MascotGuide";
import type { MascotEmotion } from "../../components/shared/MascotGuide";
import type {
  CitizenServiceRequest,
  CitizenPayment,
  CitizenBill,
  PaymentStatus,
  BillStatus,
} from "../../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Complaint {
  _id: string;
  referenceNumber: string;
  category: string;
  description: string;
  status: string;
  urgency: string;
  createdAt: string;
  resolvedAt?: string;
  department: { name: string; code: string };
  district: { name: string; state: string };
  address: { street: string; city: string; state: string; pincode: string };
  statusHistory: { status: string; note: string; timestamp: string }[];
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; icon: React.ElementType; dot: string }
> = {
  submitted: {
    label: "Submitted",
    badge: "bg-yellow-100 text-yellow-700",
    icon: Clock,
    dot: "bg-yellow-400",
  },
  acknowledged: {
    label: "Acknowledged",
    badge: "bg-blue-100 text-blue-700",
    icon: RefreshCw,
    dot: "bg-blue-400",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-indigo-100 text-indigo-700",
    icon: RefreshCw,
    dot: "bg-indigo-400",
  },
  escalated: {
    label: "Escalated",
    badge: "bg-orange-100 text-orange-700",
    icon: AlertTriangle,
    dot: "bg-orange-400",
  },
  resolved: {
    label: "Resolved",
    badge: "bg-green-100 text-green-700",
    icon: CheckCircle2,
    dot: "bg-green-500",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-700",
    icon: XCircle,
    dot: "bg-red-400",
  },
  under_review: {
    label: "Under Review",
    badge: "bg-blue-100 text-blue-700",
    icon: RefreshCw,
    dot: "bg-blue-400",
  },
  approved: {
    label: "Approved",
    badge: "bg-green-100 text-green-700",
    icon: CheckCircle2,
    dot: "bg-green-500",
  },
  processing: {
    label: "Processing",
    badge: "bg-indigo-100 text-indigo-700",
    icon: RefreshCw,
    dot: "bg-indigo-400",
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
  },
};

const URGENCY_COLOR: Record<string, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-red-600",
};

const SERVICE_ICONS: Record<string, string> = {
  electricity: "⚡",
  water: "💧",
  gas: "🔥",
  sanitation: "🚽",
  waste_management: "♻️",
};

// ── Payment / Bill config ─────────────────────────────────────────────────────

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; badge: string; dot: string }
> = {
  success: {
    label: "Success",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  initiated: {
    label: "Pending",
    badge: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  failed: {
    label: "Failed",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
  refunded: {
    label: "Refunded",
    badge: "bg-purple-100 text-purple-700",
    dot: "bg-purple-400",
  },
};

const BILL_STATUS_CONFIG: Record<
  BillStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: "Due",
    badge: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  paid: {
    label: "Paid",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  overdue: {
    label: "Overdue",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  upi: <Banknote size={13} className="text-blue-500" />,
  card: <CreditCard size={13} className="text-indigo-500" />,
  netbanking: <FileText size={13} className="text-teal-500" />,
};

function fmt(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Payment Card ──────────────────────────────────────────────────────────────
function PaymentCard({
  p,
  index,
  expanded,
  onToggle,
}: {
  p: CitizenPayment;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const cfg = PAYMENT_STATUS_CONFIG[p.status];

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!p.receiptUrl && p.status !== "success") return;
    setDownloading(true);
    try {
      await api.downloadPaymentReceipt(p._id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download receipt");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#EEF0FB] flex items-center justify-center shrink-0">
              <Receipt size={17} className="text-[#1E3A5F]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm leading-tight">
                {p.paymentFor === "bill" ? "Bill Payment" : "Service Fee"}
              </p>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">
                {p.receiptNumber}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
            <p className="font-bold text-gray-800 text-sm">{fmt(p.amount)}</p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}
            >
              {cfg.label}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-1">
            {p.method ? METHOD_ICONS[p.method] : null}
            <span className="capitalize">{p.method ?? "—"}</span>
          </div>
          <span>
            {p.paidAt
              ? new Date(p.paidAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : new Date(p.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
          </span>
          {expanded ? (
            <ChevronUp size={13} className="text-gray-400" />
          ) : (
            <ChevronDown size={13} className="text-gray-400" />
          )}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-50"
          >
            <div className="px-4 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">
                    Amount
                  </p>
                  <p className="font-semibold text-gray-800">{fmt(p.amount)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">
                    Currency
                  </p>
                  <p className="font-semibold text-gray-800">{p.currency}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">
                    Order ID
                  </p>
                  <p className="font-mono text-[10px] text-gray-600 truncate">
                    {p.razorpayOrderId}
                  </p>
                </div>
                {p.razorpayPaymentId && (
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-semibold">
                      Payment ID
                    </p>
                    <p className="font-mono text-[10px] text-gray-600 truncate">
                      {p.razorpayPaymentId}
                    </p>
                  </div>
                )}
              </div>
              {p.status === "success" && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="mt-1 w-full flex items-center justify-center gap-2 bg-[#1E3A5F] text-white text-xs font-semibold py-2 rounded-xl disabled:opacity-60"
                >
                  {downloading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  {downloading ? "Downloading…" : "Download Receipt"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Bill Card ─────────────────────────────────────────────────────────────────
function BillCard({
  b,
  index,
  expanded,
  onToggle,
}: {
  b: CitizenBill;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = BILL_STATUS_CONFIG[b.status];
  const isOverdue = b.status === "overdue";
  const isDue = b.status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-2xl shadow-sm overflow-hidden ${
        isOverdue ? "ring-1 ring-red-200" : ""
      }`}
    >
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isOverdue
                  ? "bg-red-50"
                  : isDue
                    ? "bg-yellow-50"
                    : "bg-emerald-50"
              }`}
            >
              <IndianRupee
                size={17}
                className={
                  isOverdue
                    ? "text-red-500"
                    : isDue
                      ? "text-yellow-600"
                      : "text-emerald-600"
                }
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm leading-tight">
                {b.department?.name ?? "Utility"} — {b.billingPeriod.label}
              </p>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                {b.billNumber}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
            <p
              className={`font-bold text-sm ${
                isOverdue
                  ? "text-red-600"
                  : isDue
                    ? "text-yellow-700"
                    : "text-emerald-700"
              }`}
            >
              {fmt(b.amount)}
            </p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}
            >
              {cfg.label}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
          <span>{b.connectionNumber}</span>
          <div className="flex items-center gap-1.5">
            {isOverdue && <AlertCircle size={11} className="text-red-400" />}
            <span className={isOverdue ? "text-red-500 font-semibold" : ""}>
              Due:{" "}
              {new Date(b.dueDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          {expanded ? (
            <ChevronUp size={13} className="text-gray-400" />
          ) : (
            <ChevronDown size={13} className="text-gray-400" />
          )}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-50"
          >
            <div className="px-4 py-3 space-y-3">
              {/* Charges breakdown */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Previous Balance</span>
                  <span>{fmt(b.previousBalance)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Current Charges</span>
                  <span>{fmt(b.currentCharges)}</span>
                </div>
                {b.units !== undefined && (
                  <div className="flex justify-between text-gray-600">
                    <span>Units Consumed</span>
                    <span>{b.units} units</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Taxes &amp; Charges</span>
                  <span>{fmt(b.taxes)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1.5">
                  <span>Total</span>
                  <span>{fmt(b.amount)}</span>
                </div>
              </div>
              {b.paidAt && (
                <p className="text-xs text-emerald-600">
                  ✓ Paid on{" "}
                  {new Date(b.paidAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    badge: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`text-[11px] px-2 py-1 rounded-full font-semibold ${cfg.badge}`}
    >
      {cfg.label}
    </span>
  );
}

function StatusTimeline({
  history,
}: {
  history: { status: string; note: string; timestamp: string }[];
}) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2">
        Status History
      </p>
      <div className="flex flex-col gap-2">
        {[...history].reverse().map((h, idx) => {
          const cfg = STATUS_CONFIG[h.status];
          return (
            <div key={idx} className="flex items-start gap-2.5">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg?.dot ?? "bg-gray-300"}`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">
                    {cfg?.label ?? h.status}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(h.timestamp).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                {h.note && (
                  <p className="text-[11px] text-gray-500 mt-0.5">{h.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Complaint Card ────────────────────────────────────────────────────────────
function ComplaintCard({
  c,
  index,
  expanded,
  onToggle,
}: {
  c: Complaint;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [dlLoading, setDlLoading] = useState(false);

  const downloadSingleComplaintPDF = () => {
    setDlLoading(true);
    try {
      const doc = createPDFDoc(`Complaint — ${c.referenceNumber}`);
      let y = 30;

      // Detail rows
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const details: [string, string][] = [
        ["Reference Number", c.referenceNumber],
        ["Department", c.department?.name ?? "—"],
        ["Category", c.category],
        ["Urgency", c.urgency],
        ["Current Status", STATUS_CONFIG[c.status]?.label ?? c.status],
        ["Filed On", dateFmt(c.createdAt)],
        ["Location", `${c.address?.street ?? ""}, ${c.address?.city ?? ""}, ${c.address?.state ?? ""} — ${c.address?.pincode ?? ""}`],
        ["District", `${c.district?.name ?? "—"}, ${c.district?.state ?? ""}`],
      ];
      if (c.resolvedAt) details.push(["Resolved On", dateFmt(c.resolvedAt)]);

      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(label + ":", 14, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(value, 70, y);
        y += 6;
      });

      // Description
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("Description:", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const descLines = doc.splitTextToSize(c.description, doc.internal.pageSize.getWidth() - 28);
      doc.text(descLines, 14, y);
      y += descLines.length * 4.5 + 6;

      // Status History table
      if (c.statusHistory?.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 58, 95);
        doc.text("Status History", 14, y);
        y += 2;

        autoTable(doc, {
          startY: y,
          head: [["#", "Status", "Note", "Date & Time"]],
          body: c.statusHistory.map((h, i) => [
            String(i + 1),
            STATUS_CONFIG[h.status]?.label ?? h.status,
            h.note || "—",
            new Date(h.timestamp).toLocaleString("en-IN"),
          ]),
          headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [245, 247, 255] },
          margin: { left: 14, right: 14 },
        });
      }

      doc.save(`CivicSync_${c.referenceNumber}.pdf`);
    } finally {
      setDlLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm leading-tight">
              {c.department?.name} — {c.category}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {c.referenceNumber}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <StatusBadge status={c.status} />
            {expanded ? (
              <ChevronUp size={14} className="text-gray-400" />
            ) : (
              <ChevronDown size={14} className="text-gray-400" />
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 line-clamp-1">{c.description}</p>
        <div className="flex justify-between mt-2 text-[11px] text-gray-400">
          <span>
            {c.address?.city}, {c.address?.state}
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`font-semibold capitalize ${URGENCY_COLOR[c.urgency] ?? ""}`}
            >
              {c.urgency} urgency
            </span>
            <span>·</span>
            <span>
              {new Date(c.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </span>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-4 pb-4"
          >
            <p className="text-xs text-gray-600 leading-relaxed mb-2">
              <strong className="text-gray-700">Description: </strong>
              {c.description}
            </p>
            {c.resolvedAt && (
              <p className="text-xs text-green-600 mb-2">
                ✓ Resolved on{" "}
                {new Date(c.resolvedAt).toLocaleDateString("en-IN")}
              </p>
            )}
            {c.statusHistory?.length > 0 && (
              <StatusTimeline history={c.statusHistory} />
            )}
            <button
              onClick={downloadSingleComplaintPDF}
              disabled={dlLoading}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-[#1E3A5F] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#162d4a] transition-colors disabled:opacity-60"
            >
              {dlLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {dlLoading ? "Generating…" : "Download Complaint PDF"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Service Request Card ──────────────────────────────────────────────────────
function ServiceRequestCard({
  sr,
  index,
  expanded,
  onToggle,
}: {
  sr: CitizenServiceRequest;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [dlLoading, setDlLoading] = useState(false);

  const downloadSingleSRPDF = () => {
    setDlLoading(true);
    try {
      const doc = createPDFDoc(`Service Request — ${sr.referenceNumber}`);
      let y = 30;

      doc.setFontSize(9);
      const details: [string, string][] = [
        ["Reference Number", sr.referenceNumber],
        ["Department", sr.department?.name ?? "—"],
        ["Service Type", sr.serviceType],
        ["Request Type", sr.requestType.replace(/_/g, " ")],
        ["Applicant", sr.applicantName],
        ["Phone", sr.contactPhone],
        ["Current Status", STATUS_CONFIG[sr.status]?.label ?? sr.status],
        ["Applied On", dateFmt(sr.createdAt)],
        ["Location", `${sr.address?.street ?? ""}, ${sr.address?.city ?? ""}, ${sr.address?.state ?? ""} — ${sr.address?.pincode ?? ""}`],
        ["District", `${sr.district?.name ?? "—"}, ${sr.district?.state ?? ""}`],
      ];
      if (sr.estimatedCompletionDate)
        details.push(["Est. Completion", dateFmt(sr.estimatedCompletionDate)]);
      if (sr.completedAt)
        details.push(["Completed On", dateFmt(sr.completedAt)]);

      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(label + ":", 14, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(value, 70, y);
        y += 6;
      });

      // Status History table
      if (sr.statusHistory?.length > 0) {
        y += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 58, 95);
        doc.text("Status History", 14, y);
        y += 2;

        autoTable(doc, {
          startY: y,
          head: [["#", "Status", "Note", "Date & Time"]],
          body: sr.statusHistory.map((h, i) => [
            String(i + 1),
            STATUS_CONFIG[h.status]?.label ?? h.status,
            h.note || "—",
            new Date(h.timestamp).toLocaleString("en-IN"),
          ]),
          headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [245, 247, 255] },
          margin: { left: 14, right: 14 },
        });
      }

      doc.save(`CivicSync_${sr.referenceNumber}.pdf`);
    } finally {
      setDlLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm leading-tight">
              {SERVICE_ICONS[sr.serviceType] ?? ""} {sr.department?.name} —{" "}
              {sr.requestType.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {sr.referenceNumber}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <StatusBadge status={sr.status} />
            {expanded ? (
              <ChevronUp size={14} className="text-gray-400" />
            ) : (
              <ChevronDown size={14} className="text-gray-400" />
            )}
          </div>
        </div>
        <div className="flex justify-between mt-1 text-[11px] text-gray-400">
          <span>
            {sr.address?.city}, {sr.address?.state}
          </span>
          <span>
            Applied:{" "}
            {new Date(sr.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {sr.estimatedCompletionDate && (
          <p className="text-[11px] text-blue-500 mt-1">
            Est. completion:{" "}
            {new Date(sr.estimatedCompletionDate).toLocaleDateString("en-IN")}
          </p>
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-4 pb-4"
          >
            {sr.completedAt && (
              <p className="text-xs text-emerald-600 mb-2">
                ✓ Completed on{" "}
                {new Date(sr.completedAt).toLocaleDateString("en-IN")}
              </p>
            )}
            {sr.statusHistory?.length > 0 && (
              <StatusTimeline history={sr.statusHistory} />
            )}
            <button
              onClick={downloadSingleSRPDF}
              disabled={dlLoading}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-[#1E3A5F] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#162d4a] transition-colors disabled:opacity-60"
            >
              {dlLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {dlLoading ? "Generating…" : "Download Request PDF"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Filter Bar Sub-component ──────────────────────────────────────────────────
function FilterBar({
  statusOptions,
  statusValue,
  onStatusChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
  onDownload,
  downloading,
  filteredCount,
  totalCount,
}: {
  statusOptions: { value: string; label: string }[];
  statusValue: string;
  onStatusChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onClear: () => void;
  onDownload: () => void;
  downloading: boolean;
  filteredCount: number;
  totalCount: number;
}) {
  const hasFilter = statusValue !== "all" || dateFrom || dateTo;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm p-3 mb-4"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Filter size={13} className="text-[#1E3A5F]" />
        <span className="text-xs font-semibold text-gray-600">Filters</span>
        {hasFilter && (
          <span className="text-[10px] text-gray-400 ml-1">
            Showing {filteredCount} of {totalCount}
          </span>
        )}
        {hasFilter && (
          <button
            onClick={onClear}
            className="ml-auto text-[10px] text-red-500 font-semibold hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <select
          value={statusValue}
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 flex-1 min-w-[110px]"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} className="text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-xl px-2 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 w-[115px]"
          />
          <span className="text-[10px] text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-xl px-2 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 w-[115px]"
          />
        </div>
        <button
          onClick={onDownload}
          disabled={downloading || filteredCount === 0}
          className="flex items-center gap-1.5 bg-[#1E3A5F] text-white text-xs font-semibold px-3.5 py-2 rounded-xl disabled:opacity-50 hover:bg-[#162d4a] transition-colors"
        >
          {downloading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
          {downloading ? "Generating…" : "Download PDF"}
        </button>
      </div>
    </motion.div>
  );
}

// ── PDF generation helpers ───────────────────────────────────────────────────
function createPDFDoc(title: string): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  // Branding header
  doc.setFillColor(30, 58, 95); // #1E3A5F
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("CivicSync", 14, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, 72, 13);
  // Date stamp
  doc.setFontSize(8);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    doc.internal.pageSize.getWidth() - 14,
    13,
    { align: "right" },
  );
  doc.setTextColor(0, 0, 0);
  return doc;
}

function dateFmt(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TrackStatusPage() {
  const [tab, setTab] = useState<"complaints" | "requests" | "payments">(
    "complaints",
  );
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [srs, setSrs] = useState<CitizenServiceRequest[]>([]);
  const [loadingC, setLoadingC] = useState(false);
  const [loadingSR, setLoadingSR] = useState(false);
  const [srLoaded, setSrLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Payments tab state
  const [payments, setPayments] = useState<CitizenPayment[]>([]);
  const [bills, setBills] = useState<CitizenBill[]>([]);
  const [loadingP, setLoadingP] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [paySubTab, setPaySubTab] = useState<"history" | "bills">("history");

  // Ref-number search (complaints only)
  const [searchRef, setSearchRef] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Complaint | null>(null);
  const [searchError, setSearchError] = useState("");

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  // Reset filters when changing tabs
  useEffect(() => {
    clearFilters();
  }, [tab, paySubTab]);

  const { t } = useTranslation();
  const navigate = useNavigate();

  // Load complaints on mount
  useEffect(() => {
    const load = async () => {
      setLoadingC(true);
      try {
        const res = await api.getMyComplaints();
        setComplaints(res.complaints as Complaint[]);
      } catch {
        /* noop */
      } finally {
        setLoadingC(false);
      }
    };
    void load();
  }, []);

  // Load service requests when Requests tab is first opened
  useEffect(() => {
    if (tab !== "requests" || srLoaded) return;
    const load = async () => {
      setLoadingSR(true);
      try {
        const res = await api.getMyServiceRequests();
        setSrs(res.serviceRequests);
      } catch {
        /* noop */
      } finally {
        setLoadingSR(false);
        setSrLoaded(true);
      }
    };
    void load();
  }, [tab, srLoaded]);

  // Load payments + bills when Payments tab is first opened
  useEffect(() => {
    if (tab !== "payments" || paymentsLoaded) return;
    const load = async () => {
      setLoadingP(true);
      try {
        const [paymentsRes, billsRes] = await Promise.all([
          api.getMyPayments(),
          api.getMyBills(),
        ]);
        setPayments(paymentsRes.payments);
        setBills(billsRes.bills);
      } catch {
        /* noop */
      } finally {
        setLoadingP(false);
        setPaymentsLoaded(true);
      }
    };
    void load();
  }, [tab, paymentsLoaded]);

  const handleSearch = async () => {
    if (!searchRef.trim()) return;
    setSearching(true);
    setSearchResult(null);
    setSearchError("");
    try {
      const res = await api.getComplaintByRef(searchRef.trim().toUpperCase());
      setSearchResult(res.complaint as Complaint);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Complaint not found.",
      );
    } finally {
      setSearching(false);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => (prev === id ? null : id));
  const displayComplaints = searchResult ? [searchResult] : complaints;

  // ── Filtered data memos ─────────────────────────────────────────────────────
  const inDateRange = (dateStr: string) => {
    if (!filterDateFrom && !filterDateTo) return true;
    const d = new Date(dateStr).getTime();
    if (filterDateFrom && d < new Date(filterDateFrom).getTime()) return false;
    if (filterDateTo && d > new Date(filterDateTo + "T23:59:59").getTime())
      return false;
    return true;
  };

  const filteredComplaints = useMemo(
    () =>
      displayComplaints.filter(
        (c) =>
          (filterStatus === "all" || c.status === filterStatus) &&
          inDateRange(c.createdAt),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayComplaints, filterStatus, filterDateFrom, filterDateTo],
  );

  const filteredSRs = useMemo(
    () =>
      srs.filter(
        (sr) =>
          (filterStatus === "all" || sr.status === filterStatus) &&
          inDateRange(sr.createdAt),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [srs, filterStatus, filterDateFrom, filterDateTo],
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          (filterStatus === "all" || p.status === filterStatus) &&
          inDateRange(p.paidAt ?? p.createdAt),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payments, filterStatus, filterDateFrom, filterDateTo],
  );

  const filteredBills = useMemo(
    () =>
      bills.filter(
        (b) =>
          (filterStatus === "all" || b.status === filterStatus) &&
          inDateRange(b.createdAt),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bills, filterStatus, filterDateFrom, filterDateTo],
  );

  // ── PDF generators ──────────────────────────────────────────────────────────
  const downloadComplaintsPDF = () => {
    setPdfLoading(true);
    try {
      const doc = createPDFDoc("Complaint Status History");
      autoTable(doc, {
        startY: 28,
        head: [["Ref No", "Department", "Category", "Urgency", "Status", "Filed On", "Description"]],
        body: filteredComplaints.map((c) => [
          c.referenceNumber,
          c.department?.name ?? "—",
          c.category,
          c.urgency,
          STATUS_CONFIG[c.status]?.label ?? c.status,
          dateFmt(c.createdAt),
          c.description.length > 60 ? c.description.slice(0, 60) + "…" : c.description,
        ]),
        headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        margin: { left: 14, right: 14 },
      });
      doc.save("CivicSync_Complaints.pdf");
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadSRsPDF = () => {
    setPdfLoading(true);
    try {
      const doc = createPDFDoc("Service Request History");
      autoTable(doc, {
        startY: 28,
        head: [["Ref No", "Department", "Service Type", "Request Type", "Status", "Applied On", "Est. Completion"]],
        body: filteredSRs.map((sr) => [
          sr.referenceNumber,
          sr.department?.name ?? "—",
          sr.serviceType,
          sr.requestType.replace(/_/g, " "),
          STATUS_CONFIG[sr.status]?.label ?? sr.status,
          dateFmt(sr.createdAt),
          sr.estimatedCompletionDate ? dateFmt(sr.estimatedCompletionDate) : "—",
        ]),
        headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        margin: { left: 14, right: 14 },
      });
      doc.save("CivicSync_ServiceRequests.pdf");
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadPaymentsPDF = () => {
    setPdfLoading(true);
    try {
      const doc = createPDFDoc("Transaction History");
      autoTable(doc, {
        startY: 28,
        head: [["Receipt No", "Type", "Amount", "Currency", "Method", "Status", "Date"]],
        body: filteredPayments.map((p) => [
          p.receiptNumber,
          p.paymentFor === "bill" ? "Bill Payment" : "Service Fee",
          fmt(p.amount),
          p.currency,
          p.method ?? "—",
          PAYMENT_STATUS_CONFIG[p.status]?.label ?? p.status,
          dateFmt(p.paidAt ?? p.createdAt),
        ]),
        headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        margin: { left: 14, right: 14 },
      });
      doc.save("CivicSync_Transactions.pdf");
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadBillsPDF = () => {
    setPdfLoading(true);
    try {
      const doc = createPDFDoc("Bill History");
      autoTable(doc, {
        startY: 28,
        head: [["Bill No", "Department", "Period", "Connection", "Amount", "Due Date", "Status"]],
        body: filteredBills.map((b) => [
          b.billNumber,
          b.department?.name ?? "Utility",
          b.billingPeriod.label,
          b.connectionNumber,
          fmt(b.amount),
          dateFmt(b.dueDate),
          BILL_STATUS_CONFIG[b.status]?.label ?? b.status,
        ]),
        headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        margin: { left: 14, right: 14 },
      });
      doc.save("CivicSync_Bills.pdf");
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Status option lists for filter dropdowns ────────────────────────────────
  const complaintStatusOpts = [
    { value: "all", label: "All Status" },
    { value: "submitted", label: "Submitted" },
    { value: "acknowledged", label: "Acknowledged" },
    { value: "in_progress", label: "In Progress" },
    { value: "escalated", label: "Escalated" },
    { value: "resolved", label: "Resolved" },
    { value: "rejected", label: "Rejected" },
  ];
  const srStatusOpts = [
    { value: "all", label: "All Status" },
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "approved", label: "Approved" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "rejected", label: "Rejected" },
  ];
  const paymentStatusOpts = [
    { value: "all", label: "All Status" },
    { value: "success", label: "Success" },
    { value: "initiated", label: "Pending" },
    { value: "failed", label: "Failed" },
    { value: "refunded", label: "Refunded" },
  ];
  const billStatusOpts = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Due" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-600">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">{t("trackStatus")}</h1>
      </div>

      {/* Reference number search */}
      <div className="bg-white rounded-2xl shadow-sm p-3 mb-4 flex gap-2">
        <input
          value={searchRef}
          onChange={(e) => {
            setSearchRef(e.target.value);
            setSearchResult(null);
            setSearchError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by complaint ref (e.g. COMP-20260226-00001)"
          className="flex-1 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !searchRef.trim()}
          className="bg-[#1E3A5F] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          {searching ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Search size={15} />
          )}
          Search
        </button>
        {searchResult && (
          <button
            onClick={() => {
              setSearchResult(null);
              setSearchRef("");
            }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            Clear
          </button>
        )}
      </div>
      {searchError && (
        <p className="text-red-500 text-xs text-center mb-3">{searchError}</p>
      )}

      {/* ── Animated Mascot Guide ──────────────────────────────────── */}
      {(() => {
        let emotion: MascotEmotion = "happy";
        let msg = "";
        const isLoading = (tab === "complaints" && loadingC) ||
          (tab === "requests" && loadingSR) ||
          (tab === "payments" && loadingP);

        if (searchError) {
          emotion = "sorry";
          msg = t("mascotCantFindRef");
        } else if (isLoading) {
          emotion = "loading";
          msg = t("mascotFetchingRecords");
        } else if (tab === "complaints" && !loadingC && displayComplaints.length === 0) {
          emotion = "neutral";
          msg = t("mascotNoComplaints");
        } else if (tab === "requests" && !loadingSR && srs.length === 0) {
          emotion = "neutral";
          msg = t("mascotNoRequests");
        } else if (tab === "payments" && !loadingP && payments.length === 0 && bills.length === 0) {
          emotion = "neutral";
          msg = t("mascotNoPayments");
        } else {
          emotion = "happy";
          msg = t("mascotStatusOverview");
        }
        return (
          <MascotGuide
            emotion={emotion}
            message={msg}
            size="sm"
            className="mb-4"
          />
        );
      })()}

      {/* Tabs */}
      {!searchResult && (
        <div className="flex gap-1 bg-white rounded-2xl p-1 mb-5 shadow-sm">
          {(["complaints", "requests", "payments"] as const).map((t_) => (
            <button
              key={t_}
              onClick={() => {
                setTab(t_);
                setExpanded(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t_ ? "bg-[#1E3A5F] text-white shadow" : "text-gray-500"}`}
            >
              {t_ === "complaints"
                ? `${t("complaintsTab")}${complaints.length > 0 ? ` (${complaints.length})` : ""}`
                : t_ === "requests"
                  ? `${t("requestsTab")}${srs.length > 0 ? ` (${srs.length})` : ""}`
                  : `${t("paymentsTab")}${payments.length + bills.length > 0 ? ` (${payments.length + bills.length})` : ""}`}
            </button>
          ))}
        </div>
      )}

      {/* Complaints tab */}
      {(tab === "complaints" || searchResult) && (
        <div className="space-y-3">
          {!searchResult && displayComplaints.length > 0 && (
            <FilterBar
              statusOptions={complaintStatusOpts}
              statusValue={filterStatus}
              onStatusChange={setFilterStatus}
              dateFrom={filterDateFrom}
              dateTo={filterDateTo}
              onDateFromChange={setFilterDateFrom}
              onDateToChange={setFilterDateTo}
              onClear={clearFilters}
              onDownload={downloadComplaintsPDF}
              downloading={pdfLoading}
              filteredCount={filteredComplaints.length}
              totalCount={displayComplaints.length}
            />
          )}
          {loadingC ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-12">
              <Loader2 size={18} className="animate-spin" /> Loading your
              complaints…
            </div>
          ) : filteredComplaints.length === 0 && displayComplaints.length > 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No complaints match your filters.</p>
            </div>
          ) : displayComplaints.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No complaints filed yet.</p>
              <button
                onClick={() => navigate("/citizen/complaint/new")}
                className="mt-3 text-xs text-[#1E3A5F] font-semibold underline"
              >
                Register your first complaint →
              </button>
            </div>
          ) : (
            filteredComplaints.map((c, i) => (
              <ComplaintCard
                key={c._id}
                c={c}
                index={i}
                expanded={expanded === c._id}
                onToggle={() => toggle(c._id)}
              />
            ))
          )}
        </div>
      )}

      {/* Service Requests tab */}
      {tab === "requests" && !searchResult && (
        <div className="space-y-3">
          {srs.length > 0 && (
            <FilterBar
              statusOptions={srStatusOpts}
              statusValue={filterStatus}
              onStatusChange={setFilterStatus}
              dateFrom={filterDateFrom}
              dateTo={filterDateTo}
              onDateFromChange={setFilterDateFrom}
              onDateToChange={setFilterDateTo}
              onClear={clearFilters}
              onDownload={downloadSRsPDF}
              downloading={pdfLoading}
              filteredCount={filteredSRs.length}
              totalCount={srs.length}
            />
          )}
          {loadingSR ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-12">
              <Loader2 size={18} className="animate-spin" /> Loading your
              requests…
            </div>
          ) : filteredSRs.length === 0 && srs.length > 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No requests match your filters.</p>
            </div>
          ) : srs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No service requests submitted yet.</p>
              <button
                onClick={() => navigate("/citizen/service/new")}
                className="mt-3 text-xs text-[#1E3A5F] font-semibold underline"
              >
                Submit a new connection request →
              </button>
            </div>
          ) : (
            filteredSRs.map((sr, i) => (
              <ServiceRequestCard
                key={sr._id}
                sr={sr}
                index={i}
                expanded={expanded === sr._id}
                onToggle={() => toggle(sr._id)}
              />
            ))
          )}
        </div>
      )}

      {/* Payments tab */}
      {tab === "payments" && !searchResult && (
        <div>
          {/* Payment sub-tabs */}
          <div className="flex gap-1 bg-white rounded-2xl p-1 mb-4 shadow-sm">
            {(["history", "bills"] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setPaySubTab(st);
                  setExpanded(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                  paySubTab === st
                    ? "bg-[#1E3A5F] text-white shadow"
                    : "text-gray-500"
                }`}
              >
                {st === "history"
                  ? `Transactions${payments.length > 0 ? ` (${payments.length})` : ""}`
                  : `Bills${bills.length > 0 ? ` (${bills.length})` : ""}`}
              </button>
            ))}
          </div>

          {/* Transactions sub-tab */}
          {paySubTab === "history" && (
            <div className="space-y-3">
              {payments.length > 0 && (
                <FilterBar
                  statusOptions={paymentStatusOpts}
                  statusValue={filterStatus}
                  onStatusChange={setFilterStatus}
                  dateFrom={filterDateFrom}
                  dateTo={filterDateTo}
                  onDateFromChange={setFilterDateFrom}
                  onDateToChange={setFilterDateTo}
                  onClear={clearFilters}
                  onDownload={downloadPaymentsPDF}
                  downloading={pdfLoading}
                  filteredCount={filteredPayments.length}
                  totalCount={payments.length}
                />
              )}
              {loadingP ? (
                <div className="flex items-center justify-center gap-2 text-gray-400 py-12">
                  <Loader2 size={18} className="animate-spin" /> Loading
                  transactions…
                </div>
              ) : filteredPayments.length === 0 && payments.length > 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No transactions match your filters.</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Receipt size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No payments yet.</p>
                  <p className="text-xs mt-1">
                    Payments made through CivicSync will appear here.
                  </p>
                </div>
              ) : (
                filteredPayments.map((p, i) => (
                  <PaymentCard
                    key={p._id}
                    p={p}
                    index={i}
                    expanded={expanded === p._id}
                    onToggle={() => toggle(p._id)}
                  />
                ))
              )}
            </div>
          )}

          {/* Bills sub-tab */}
          {paySubTab === "bills" && (
            <div className="space-y-3">
              {bills.length > 0 && (
                <FilterBar
                  statusOptions={billStatusOpts}
                  statusValue={filterStatus}
                  onStatusChange={setFilterStatus}
                  dateFrom={filterDateFrom}
                  dateTo={filterDateTo}
                  onDateFromChange={setFilterDateFrom}
                  onDateToChange={setFilterDateTo}
                  onClear={clearFilters}
                  onDownload={downloadBillsPDF}
                  downloading={pdfLoading}
                  filteredCount={filteredBills.length}
                  totalCount={bills.length}
                />
              )}
              {loadingP ? (
                <div className="flex items-center justify-center gap-2 text-gray-400 py-12">
                  <Loader2 size={18} className="animate-spin" /> Loading bills…
                </div>
              ) : filteredBills.length === 0 && bills.length > 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No bills match your filters.</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <IndianRupee size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No bills found.</p>
                  <p className="text-xs mt-1">
                    Utility bills linked to your account will appear here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Overdue / pending summary banner */}
                  {(() => {
                    const overdue = filteredBills.filter((b) => b.status === "overdue");
                    const pending = filteredBills.filter((b) => b.status === "pending");
                    const totalDue = [...overdue, ...pending].reduce(
                      (acc, b) => acc + b.amount,
                      0,
                    );
                    if (totalDue === 0) return null;
                    return (
                      <div
                        className={`rounded-2xl p-3.5 mb-1 flex items-center gap-3 ${
                          overdue.length > 0
                            ? "bg-red-50 border border-red-100"
                            : "bg-yellow-50 border border-yellow-100"
                        }`}
                      >
                        <AlertCircle
                          size={20}
                          className={
                            overdue.length > 0
                              ? "text-red-500"
                              : "text-yellow-600"
                          }
                        />
                        <div className="flex-1">
                          <p
                            className={`text-xs font-bold ${
                              overdue.length > 0
                                ? "text-red-700"
                                : "text-yellow-700"
                            }`}
                          >
                            {overdue.length > 0
                              ? `${overdue.length} overdue bill${overdue.length > 1 ? "s" : ""}`
                              : `${pending.length} bill${pending.length > 1 ? "s" : ""} due`}
                          </p>
                          <p
                            className={`text-[11px] mt-0.5 ${
                              overdue.length > 0
                                ? "text-red-500"
                                : "text-yellow-600"
                            }`}
                          >
                            Total outstanding:{" "}
                            <strong>
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0,
                              }).format(totalDue)}
                            </strong>
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  {filteredBills.map((b, i) => (
                    <BillCard
                      key={b._id}
                      b={b}
                      index={i}
                      expanded={expanded === b._id}
                      onToggle={() => toggle(b._id)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
