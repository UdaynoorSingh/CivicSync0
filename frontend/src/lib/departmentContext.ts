import type { CitizenBill } from "./api";
import type { CitizenServiceRequest } from "./api";
import type { CitizenPayment } from "./api";

export const DEPARTMENT_SLUGS = [
  "electricity",
  "gas",
  "water",
  "sanitation",
  "others",
] as const;

export type DepartmentSlug = (typeof DEPARTMENT_SLUGS)[number];

export function isDepartmentSlug(s: string | undefined): s is DepartmentSlug {
  return !!s && (DEPARTMENT_SLUGS as readonly string[]).includes(s);
}

/** Uppercase backend `Department.code` values for this kiosk area */
export function departmentCodesForSlug(slug: DepartmentSlug): string[] {
  switch (slug) {
    case "electricity":
      return ["ELEC"];
    case "gas":
      return ["GAS"];
    case "water":
      return ["WATER"];
    case "sanitation":
      return ["SANITATION"];
    case "others":
      return ["WASTE"];
    default:
      return [];
  }
}

/** RegisterComplaint `DEPARTMENTS` key */
export function slugToComplaintDepartmentKey(slug: DepartmentSlug): string {
  if (slug === "others") return "waste";
  return slug;
}

export function slugToServiceType(
  slug: DepartmentSlug,
): "electricity" | "water" | "gas" | undefined {
  if (slug === "electricity" || slug === "water" || slug === "gas") return slug;
  return undefined;
}

/** PayBills UI category (must match `mapDepartmentToCategory` on bills) */
export type BillCategoryFilter =
  | "electricity"
  | "water"
  | "gas"
  | "waste"
  | "sanitation";

export function slugToBillCategory(slug: DepartmentSlug): BillCategoryFilter {
  switch (slug) {
    case "electricity":
      return "electricity";
    case "gas":
      return "gas";
    case "water":
      return "water";
    case "sanitation":
      return "sanitation";
    case "others":
      return "waste";
    default:
      return "electricity";
  }
}

export function billMatchesSlug(bill: CitizenBill, slug: DepartmentSlug): boolean {
  const code = (bill.department?.code ?? "").toUpperCase();
  return departmentCodesForSlug(slug).includes(code);
}

export function complaintMatchesSlug(
  c: { department?: { code?: string } },
  slug: DepartmentSlug,
): boolean {
  const code = (c.department?.code ?? "").toUpperCase();
  return departmentCodesForSlug(slug).includes(code);
}

export function serviceTypeMatchesSlug(
  serviceType: string | undefined,
  slug: DepartmentSlug,
): boolean {
  if (!serviceType) return false;
  const st = serviceType.toLowerCase();
  if (slug === "electricity" && st === "electricity") return true;
  if (slug === "water" && st === "water") return true;
  if (slug === "gas" && st === "gas") return true;
  if (slug === "sanitation" && (st === "sanitation" || st === "waste_management"))
    return true;
  if (slug === "others" && (st === "waste" || st === "waste_management")) return true;
  return false;
}

export function serviceRequestMatchesSlug(
  sr: CitizenServiceRequest,
  slug: DepartmentSlug,
): boolean {
  const code = (sr.department?.code ?? "").toUpperCase();
  if (code && departmentCodesForSlug(slug).includes(code)) return true;
  return serviceTypeMatchesSlug(sr.serviceType, slug);
}

type PopulatedDept = { code?: string } | undefined;

function paymentBillDepartment(
  p: CitizenPayment,
): PopulatedDept {
  const raw = p.billId;
  if (!raw || typeof raw !== "object") return undefined;
  const b = raw as { department?: PopulatedDept | string };
  if (b.department && typeof b.department === "object") return b.department;
  return undefined;
}

function paymentServiceDepartment(
  p: CitizenPayment,
): PopulatedDept {
  const raw = p.serviceRequestId;
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as { department?: PopulatedDept | string; serviceType?: string };
  if (s.department && typeof s.department === "object") return s.department;
  return undefined;
}

function paymentServiceType(p: CitizenPayment): string | undefined {
  const raw = p.serviceRequestId;
  if (!raw || typeof raw !== "object") return undefined;
  return (raw as { serviceType?: string }).serviceType;
}

export function paymentMatchesSlug(
  p: CitizenPayment,
  slug: DepartmentSlug,
): boolean {
  const codes = departmentCodesForSlug(slug);
  if (p.paymentFor === "bill") {
    const code = (paymentBillDepartment(p)?.code ?? "").toUpperCase();
    return code.length > 0 && codes.includes(code);
  }
  if (p.paymentFor === "service_request") {
    const code = (paymentServiceDepartment(p)?.code ?? "").toUpperCase();
    if (code && codes.includes(code)) return true;
    return serviceTypeMatchesSlug(paymentServiceType(p), slug);
  }
  return false;
}

export function parseDepartmentSlugFromState(
  state: unknown,
): DepartmentSlug | null {
  if (!state || typeof state !== "object") return null;
  const slug = (state as { departmentSlug?: string }).departmentSlug;
  return isDepartmentSlug(slug) ? slug : null;
}

/** i18n key for the department name (same labels as dashboard cards). */
export function departmentTitleI18nKey(slug: DepartmentSlug): string {
  switch (slug) {
    case "electricity":
      return "electricity";
    case "gas":
      return "gasSupply";
    case "water":
      return "waterSupply";
    case "sanitation":
      return "sanitationDept";
    case "others":
      return "othersDept";
    default:
      return "electricity";
  }
}
