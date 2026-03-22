// ── Dummy Data for CivicSync Frontend ────────────────────────────────────────

export const dummyUser = {
  id: "u001",
  name: "Citizen User",
  phone: "+919876545678",
  email: "citizen@example.com",
  address: "12, Sector 15, Chandigarh, Punjab - 160015",
  aadhaar: "XXXX-XXXX-4321",
  registeredDate: "2024-03-01",
  avatar: null,
};

export const dummyAdmin = {
  id: "a001",
  name: "Admin Officer",
  username: "admin",
  password: "admin123", // demo only
  department: "Municipal Corporation",
  email: "admin@civicsync.gov.in",
};

// ── Utility Bills ─────────────────────────────────────────────────────────────
export interface Bill {
  id: string;
  category: "electricity" | "water" | "gas" | "waste";
  amount: number;
  dueDate: string;
  billingPeriod: string;
  previousBalance: number;
  currentCharges: number;
  taxes: number;
  status: "pending" | "overdue" | "paid";
  consumerNo: string;
}

export const dummyBills: Bill[] = [
  {
    id: "b001",
    category: "electricity",
    amount: 1245,
    dueDate: "2026-02-15",
    billingPeriod: "Jan 2026",
    previousBalance: 0,
    currentCharges: 1100,
    taxes: 145,
    status: "overdue",
    consumerNo: "PSPCL-4521",
  },
  {
    id: "b002",
    category: "water",
    amount: 340,
    dueDate: "2026-02-28",
    billingPeriod: "Jan 2026",
    previousBalance: 0,
    currentCharges: 300,
    taxes: 40,
    status: "pending",
    consumerNo: "WB-7832",
  },
  {
    id: "b003",
    category: "gas",
    amount: 890,
    dueDate: "2026-02-20",
    billingPeriod: "Jan 2026",
    previousBalance: 0,
    currentCharges: 800,
    taxes: 90,
    status: "overdue",
    consumerNo: "IGL-1192",
  },
  {
    id: "b004",
    category: "waste",
    amount: 150,
    dueDate: "2026-03-05",
    billingPeriod: "Jan 2026",
    previousBalance: 0,
    currentCharges: 135,
    taxes: 15,
    status: "pending",
    consumerNo: "MC-WM-990",
  },
];

// ── Complaints ─────────────────────────────────────────────────────────────────
export type ComplaintStatus =
  | "pending"
  | "in_progress"
  | "resolved"
  | "rejected";
export interface Complaint {
  id: string;
  refNo: string;
  category: string;
  description: string;
  area: string;
  status: ComplaintStatus;
  date: string;
  citizen: string;
  phone: string;
  estimatedResolution: string;
}

export const dummyComplaints: Complaint[] = [
  {
    id: "c001",
    refNo: "CMP-2026-0012",
    category: "Water Leakage",
    description:
      "Main pipeline leaking near Sector 15 market, causing road damage and water wastage.",
    area: "Sector 15, Chandigarh",
    status: "in_progress",
    date: "2026-02-10",
    citizen: "Citizen User",
    phone: "+919876545678",
    estimatedResolution: "2026-02-25",
  },
  {
    id: "c002",
    refNo: "CMP-2026-0008",
    category: "Power Outage",
    description:
      "Frequent power cuts in Block B for the past 3 days, lasting 4–6 hours.",
    area: "Block B, Sector 21, Chandigarh",
    status: "resolved",
    date: "2026-02-05",
    citizen: "Rajinder Singh",
    phone: "+919812345678",
    estimatedResolution: "2026-02-12",
  },
  {
    id: "c003",
    refNo: "CMP-2026-0019",
    category: "Road Damage",
    description:
      "Large pothole on main road causing vehicle damage. Needs immediate repair.",
    area: "Phase 3B2, Mohali",
    status: "pending",
    date: "2026-02-14",
    citizen: "Priya Sharma",
    phone: "+919988776655",
    estimatedResolution: "2026-03-01",
  },
  {
    id: "c004",
    refNo: "CMP-2026-0022",
    category: "Garbage Collection",
    description:
      "Garbage not collected for 5 days. Overflowing bins near residential area.",
    area: "Sector 8, Chandigarh",
    status: "pending",
    date: "2026-02-16",
    citizen: "Gurpreet Kaur",
    phone: "+919876000011",
    estimatedResolution: "2026-02-22",
  },
  {
    id: "c005",
    refNo: "CMP-2026-0003",
    category: "Streetlight",
    description:
      "4 streetlights not working on the main road, causing safety issues at night.",
    area: "Sector 44, Chandigarh",
    status: "resolved",
    date: "2026-01-28",
    citizen: "Amit Verma",
    phone: "+919712345600",
    estimatedResolution: "2026-02-03",
  },
  {
    id: "c006",
    refNo: "CMP-2026-0027",
    category: "Water Leakage",
    description:
      "Sewer overflow on street near market. Foul smell and health hazard.",
    area: "Sector 22, Chandigarh",
    status: "in_progress",
    date: "2026-02-18",
    citizen: "Harpreet Singh",
    phone: "+919887654321",
    estimatedResolution: "2026-02-26",
  },
  {
    id: "c007",
    refNo: "CMP-2026-0031",
    category: "Power Outage",
    description:
      "Transformer damaged after last night storm. Entire colony without power.",
    area: "Kharar, Punjab",
    status: "rejected",
    date: "2026-02-19",
    citizen: "Neha Arora",
    phone: "+919765432100",
    estimatedResolution: "-",
  },
  {
    id: "c008",
    refNo: "CMP-2026-0033",
    category: "Road Damage",
    description: "Road blocked due to construction work without prior notice.",
    area: "Zirakpur, Punjab",
    status: "pending",
    date: "2026-02-20",
    citizen: "Sandeep Kumar",
    phone: "+919855554444",
    estimatedResolution: "2026-03-05",
  },
];

// ── Service Requests ──────────────────────────────────────────────────────────
export type SRStatus = "pending" | "under_review" | "approved" | "rejected";
export interface ServiceRequest {
  id: string;
  refNo: string;
  serviceType: "electricity" | "water" | "gas";
  applicantName: string;
  phone: string;
  address: string;
  status: SRStatus;
  date: string;
  estimatedCompletion: string;
}

export const dummyServiceRequests: ServiceRequest[] = [
  {
    id: "sr001",
    refNo: "SR-2026-0045",
    serviceType: "electricity",
    applicantName: "Citizen User",
    phone: "+919876545678",
    address: "12, Sector 15, Chandigarh",
    status: "under_review",
    date: "2026-02-01",
    estimatedCompletion: "2026-02-28",
  },
  {
    id: "sr002",
    refNo: "SR-2026-0038",
    serviceType: "water",
    applicantName: "Manpreet Kaur",
    phone: "+919823456789",
    address: "55, Phase 7, Mohali",
    status: "approved",
    date: "2026-01-20",
    estimatedCompletion: "2026-02-15",
  },
  {
    id: "sr003",
    refNo: "SR-2026-0051",
    serviceType: "gas",
    applicantName: "Rakesh Gill",
    phone: "+919712344321",
    address: "3rd Floor, Sector 34-A, Chandigarh",
    status: "pending",
    date: "2026-02-17",
    estimatedCompletion: "2026-03-10",
  },
];

// ── Notifications ─────────────────────────────────────────────────────────────
export type NotifType = "announcement" | "outage" | "reminder" | "emergency";
export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  date: string;
  read: boolean;
}

export const dummyNotifications: Notification[] = [
  {
    id: "n001",
    type: "outage",
    title: "Planned Power Outage – Sector 15",
    body: "Power supply will be shut down on 25 Feb 2026 from 10:00 AM to 2:00 PM for maintenance work. Inconvenience regretted.",
    date: "2026-02-20",
    read: false,
  },
  {
    id: "n002",
    type: "reminder",
    title: "Electricity Bill Due in 3 Days",
    body: "Your electricity bill of ₹1,245 is due on 15 Feb 2026. Please pay to avoid late fees.",
    date: "2026-02-19",
    read: false,
  },
  {
    id: "n003",
    type: "announcement",
    title: "New Water Conservation Drive",
    body: "Municipal Corporation launches water conservation awareness drive. Reduced tariff for households using < 10KL per month.",
    date: "2026-02-17",
    read: true,
  },
  {
    id: "n004",
    type: "emergency",
    title: "🚨 Flash Flood Alert – Low-lying Areas",
    body: "Heavy rainfall expected. Residents of low-lying areas in Kharar and Zirakpur are advised to move to safer locations.",
    date: "2026-02-16",
    read: true,
  },
  {
    id: "n005",
    type: "announcement",
    title: "CivicSync Kiosk Hours Extended",
    body: "Kiosk service hours now extended to 8:00 AM – 9:00 PM on all working days. Weekend access also available.",
    date: "2026-02-14",
    read: true,
  },
];

// ── Map Data ──────────────────────────────────────────────────────────────────
export interface MapPoint {
  city: string;
  lat: number;
  lng: number;
  complaints: number;
  topCategory: string;
}

export const dummyMapData: MapPoint[] = [
  {
    city: "Chandigarh",
    lat: 30.7333,
    lng: 76.7794,
    complaints: 47,
    topCategory: "Water Leakage",
  },
  {
    city: "Mohali",
    lat: 30.7046,
    lng: 76.7179,
    complaints: 32,
    topCategory: "Road Damage",
  },
  {
    city: "Ludhiana",
    lat: 30.901,
    lng: 75.8573,
    complaints: 58,
    topCategory: "Power Outage",
  },
  {
    city: "Amritsar",
    lat: 31.634,
    lng: 74.8723,
    complaints: 41,
    topCategory: "Garbage Collection",
  },
  {
    city: "Jalandhar",
    lat: 31.326,
    lng: 75.5762,
    complaints: 29,
    topCategory: "Streetlight",
  },
  {
    city: "Patiala",
    lat: 30.3398,
    lng: 76.3869,
    complaints: 22,
    topCategory: "Water Leakage",
  },
  {
    city: "Bathinda",
    lat: 30.211,
    lng: 74.9455,
    complaints: 18,
    topCategory: "Road Damage",
  },
  {
    city: "Zirakpur",
    lat: 30.6457,
    lng: 76.8177,
    complaints: 15,
    topCategory: "Power Outage",
  },
  {
    city: "Kharar",
    lat: 30.7479,
    lng: 76.6475,
    complaints: 12,
    topCategory: "Garbage Collection",
  },
  {
    city: "Ropar",
    lat: 30.9628,
    lng: 76.5187,
    complaints: 9,
    topCategory: "Streetlight",
  },
];

// ── Recent Activity ───────────────────────────────────────────────────────────
export const dummyRecentActivity = [
  {
    id: "ra1",
    icon: "electricity",
    label: "Electricity Bill",
    sub: "Due: 15 Feb 2026",
    amount: "₹1,245",
    type: "bill",
  },
  {
    id: "ra2",
    icon: "complaint",
    label: "Water Leakage Complaint",
    sub: "Filed: 10 Feb 2026",
    amount: "CMP-2026-0012",
    type: "complaint",
  },
  {
    id: "ra3",
    icon: "gas",
    label: "Gas Bill",
    sub: "Due: 20 Feb 2026",
    amount: "₹890",
    type: "bill",
  },
  {
    id: "ra4",
    icon: "service",
    label: "New Electricity Connection",
    sub: "Applied: 01 Feb 2026",
    amount: "SR-2026-0045",
    type: "service",
  },
];

// ── Emergency Contacts ────────────────────────────────────────────────────────
export const emergencyContacts = [
  {
    id: "ec1",
    name: "Police",
    number: "100",
    icon: "shield",
    color: "bg-blue-600",
  },
  {
    id: "ec2",
    name: "Ambulance",
    number: "108",
    icon: "help-circle",
    color: "bg-red-600",
  },
  {
    id: "ec3",
    name: "Fire Service",
    number: "101",
    icon: "help-circle",
    color: "bg-orange-600",
  },
];

export const importantContacts = [
  {
    id: "ic1",
    name: "Electricity Board (PSPCL)",
    number: "1912",
    email: "pspcl@punjab.gov.in",
  },
  {
    id: "ic2",
    name: "Water Supply",
    number: "1916",
    email: "water@chandigarh.gov.in",
  },
  {
    id: "ic3",
    name: "Municipal Office",
    number: "1800-11-3377",
    email: "mc@chandigarh.gov.in",
  },
  {
    id: "ic4",
    name: "Citizen Helpline",
    number: "1800-11-1000",
    email: "help@civicsync.gov.in",
  },
  {
    id: "ic5",
    name: "Gas Emergency (IGL)",
    number: "1906",
    email: "igl@indraprastha.gov.in",
  },
];

// ── AI Assistant Responses (route-aware) ──────────────────────────────────────
export const aiResponses: Record<string, string[]> = {
  default: [
    "Hello! I'm your CivicSync AI assistant. How can I help you today?",
    "You can ask me about paying bills, registering complaints, or tracking your services.",
  ],
  "/citizen": [
    "Welcome to your dashboard! You can see all your pending bills up top.",
    "Tap 'Register Complaint' to file a new civic issue, or 'Pay Bills' to clear dues.",
  ],
  "/citizen/bills": [
    "Here are all your pending utility bills. Tap any bill to see the full breakdown.",
    "You can pay via UPI, Debit/Credit Card, or Net Banking.",
  ],
  "/citizen/complaint/new": [
    "To register a complaint, first select the issue category, then describe the problem.",
    "You can also upload a photo to help us understand the issue better.",
  ],
  "/citizen/track": [
    "Here you can track all your submitted complaints and service requests.",
    "Green badge means resolved, blue means in progress, yellow means pending.",
  ],
  "/citizen/help": [
    "In an emergency, use the red or blue buttons to contact police or ambulance instantly.",
    "For civic issues, contact the Municipal Office at 1800-11-3377.",
  ],
};
