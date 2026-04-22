// ── Voice Navigation Route Configuration ─────────────────────────────────────
// Each route maps to a spoken greeting (page name + available features)
// and the valid voice actions a user can take from that page.

export interface VoiceAction {
  intent: string;
  description: string;
  target_route: string;
}

export interface VoiceFormField {
  key: string;              // State key to set (e.g. "department", "category")
  label: string;            // Human label for display / LLM context
  tts_prompt: string;       // Hindi TTS question read to the user
  type: "select" | "text" | "radio";
  options?: string[];        // Static options (for select/radio)
  depends_on?: string;       // e.g. "category" depends on "department"
  step: number;             // Which form step this field appears on (1, 2, 3)
  skip_if_prefilled?: boolean;
  required?: boolean;
}

export interface VoiceRouteConfig {
  page_name: string;
  tts_greeting: string;
  valid_actions: VoiceAction[];
  form_fields?: VoiceFormField[];  // Present only on form pages
}

// ── Department → Category mapping (mirrors RegisterComplaintPage.tsx) ─────────
export const DEPT_CATEGORIES: Record<string, string[]> = {
  "Electricity": ["Power Outage", "Streetlight Fault", "Meter Issue", "Voltage Fluctuation", "Other"],
  "Water Supply": ["Water Leakage", "Water Contamination", "Low Pressure", "No Water Supply", "Other"],
  "Gas Supply": ["Gas Leak", "Low Gas Pressure", "Pipeline Damage", "Other"],
  "Sanitation": ["Sewage Overflow", "Blocked Drain", "Public Toilet Issue", "Other"],
  "Waste Management": ["Garbage Not Collected", "Illegal Dumping", "Road Cleaning", "Other"],
};

/**
 * Maps route paths to their voice navigation context.
 * Greetings tell the user: (1) which page they're on, (2) what features are available.
 */
export const voiceNavConfig: Record<string, VoiceRouteConfig> = {
  "/citizen": {
    page_name: "Citizen Dashboard",
    tts_greeting:
      "आप नागरिक डैशबोर्ड पर हैं। यहाँ आप अपने बिल देख सकते हैं, शिकायत दर्ज कर सकते हैं, नई सेवा के लिए आवेदन कर सकते हैं, अपनी शिकायत या सेवा की स्थिति ट्रैक कर सकते हैं, शिकायत मैप देख सकते हैं, सूचनाएं देख सकते हैं, सहायता प्राप्त कर सकते हैं, या अपनी प्रोफाइल देख सकते हैं। आप क्या करना चाहेंगे?",
    valid_actions: [
      { intent: "pay_bills", description: "Pay utility bills", target_route: "/citizen/bills" },
      { intent: "register_complaint", description: "Register a new complaint", target_route: "/citizen/complaint/new" },
      { intent: "new_service", description: "Apply for a new service connection", target_route: "/citizen/service/new" },
      { intent: "track_status", description: "Track complaint or service request status", target_route: "/citizen/track" },
      { intent: "view_map", description: "View complaint map", target_route: "/citizen/map" },
      { intent: "notifications", description: "View notifications", target_route: "/citizen/notifications" },
      { intent: "help", description: "Get help and support", target_route: "/citizen/help" },
      { intent: "profile", description: "View my profile", target_route: "/citizen/profile" },
      { intent: "logout", description: "Logout from the kiosk", target_route: "/" },
    ],
  },

  "/citizen/bills": {
    page_name: "Pay Bills",
    tts_greeting:
      "आप बिल भुगतान पेज पर हैं। यहाँ आप अपने बिजली, पानी, गैस और कचरा प्रबंधन के सभी लंबित बिल देख सकते हैं। किसी भी बिल पर टैप करके पूरा विवरण देखें और भुगतान करें। आप वापस डैशबोर्ड पर भी जा सकते हैं।",
    valid_actions: [
      { intent: "view_bill_detail", description: "View details of a specific bill", target_route: "/citizen/bills/:id" },
      { intent: "go_back", description: "Go back to dashboard", target_route: "/citizen" },
    ],
  },

  "/citizen/bills/:id": {
    page_name: "Bill Detail",
    tts_greeting:
      "आप बिल विवरण पेज पर हैं। यहाँ आप इस बिल का पूरा ब्रेकडाउन देख सकते हैं और UPI, डेबिट कार्ड, क्रेडिट कार्ड या नेट बैंकिंग से भुगतान कर सकते हैं। आप वापस बिल सूची पर भी जा सकते हैं।",
    valid_actions: [
      { intent: "pay_bill", description: "Pay this bill", target_route: "/citizen/bills/success" },
      { intent: "go_back", description: "Go back to bills list", target_route: "/citizen/bills" },
    ],
  },

  "/citizen/bills/success": {
    page_name: "Payment Success",
    tts_greeting:
      "आपका भुगतान सफलतापूर्वक हो गया है! आप मुख्य डैशबोर्ड पर वापस जा सकते हैं या अपने अन्य बिल देख सकते हैं।",
    valid_actions: [
      { intent: "go_dashboard", description: "Go to dashboard", target_route: "/citizen" },
      { intent: "view_bills", description: "View more bills", target_route: "/citizen/bills" },
    ],
  },

  "/citizen/complaint/new": {
    page_name: "Register Complaint",
    tts_greeting:
      "आप शिकायत दर्ज करने के पेज पर हैं। मैं आपकी मदद करूँगा एक-एक करके फॉर्म भरने में। चलिए शुरू करते हैं।",
    valid_actions: [
      { intent: "go_back", description: "Go back to dashboard", target_route: "/citizen" },
    ],
    form_fields: [
      // ── Step 1: Department ──
      {
        key: "department",
        label: "Department",
        tts_prompt: "कृपया विभाग चुनें। विकल्प हैं: बिजली, पानी, गैस, स्वच्छता, या कचरा प्रबंधन।",
        type: "select",
        options: ["Electricity", "Water Supply", "Gas Supply", "Sanitation", "Waste Management"],
        step: 1,
        required: true,
      },
      // ── Step 2: Issue Details ──
      {
        key: "scope",
        label: "Complaint Scope",
        tts_prompt: "यह समस्या आपकी व्यक्तिगत है या पूरे इलाके की? कृपया बताएं: पर्सनल या लोकैलिटी।",
        type: "radio",
        options: ["personal", "locality"],
        step: 2,
        required: true,
      },
      {
        key: "category",
        label: "Issue Category",
        tts_prompt: "कृपया समस्या की श्रेणी चुनें।",
        type: "select",
        depends_on: "department",
        step: 2,
        required: true,
      },
      {
        key: "description",
        label: "Description",
        tts_prompt: "कृपया अपनी समस्या का विस्तार से वर्णन करें। कम से कम दस शब्दों में बताएं।",
        type: "text",
        step: 2,
        required: true,
      },
      {
        key: "urgency",
        label: "Urgency Level",
        tts_prompt: "समस्या कितनी जरूरी है? विकल्प हैं: कम, मध्यम, या अधिक।",
        type: "radio",
        options: ["Low", "Medium", "High"],
        step: 2,
        required: true,
      },
      // Note: Photo upload is skipped in voice mode — handled manually
      // ── Step 3: Location ──
      {
        key: "state",
        label: "State",
        tts_prompt: "कृपया अपना राज्य बताएं।",
        type: "text",
        step: 3,
        skip_if_prefilled: true,
        required: true,
      },
      {
        key: "district",
        label: "City / District",
        tts_prompt: "कृपया अपना शहर या जिला बताएं।",
        type: "text",
        step: 3,
        skip_if_prefilled: true,
        required: true,
      },
      {
        key: "pincode",
        label: "Pincode",
        tts_prompt: "कृपया अपना छह अंकों का पिनकोड बताएं।",
        type: "text",
        step: 3,
        skip_if_prefilled: true,
        required: true,
      },
      {
        key: "streetAddress",
        label: "Street / Area",
        tts_prompt: "कृपया अपना पूरा पता बताएं, जैसे मकान नंबर, गली, मोहल्ला।",
        type: "text",
        step: 3,
        skip_if_prefilled: true,
        required: true,
      },
    ],
  },

  "/citizen/complaint/confirm": {
    page_name: "Complaint Confirmation",
    tts_greeting:
      "आपकी शिकायत सफलतापूर्वक दर्ज हो गई है! आपका शिकायत नंबर स्क्रीन पर दिखाया गया है। आप डैशबोर्ड पर वापस जा सकते हैं या अपनी शिकायत की स्थिति ट्रैक कर सकते हैं।",
    valid_actions: [
      { intent: "go_dashboard", description: "Go to dashboard", target_route: "/citizen" },
      { intent: "track_status", description: "Track complaint status", target_route: "/citizen/track" },
    ],
  },

  "/citizen/service/new": {
    page_name: "New Service Request",
    tts_greeting:
      "आप नई सेवा कनेक्शन के आवेदन पेज पर हैं। मैं आपकी मदद करूँगा एक-एक करके फॉर्म भरने में। चलिए शुरू करते हैं।",
    valid_actions: [
      { intent: "go_back", description: "Go back to dashboard", target_route: "/citizen" },
    ],
    form_fields: [
      // ── Step 1: Service Type ──
      {
        key: "serviceType",
        label: "Service Type",
        tts_prompt: "कृपया सेवा का प्रकार चुनें। विकल्प हैं: बिजली कनेक्शन, पानी कनेक्शन, या गैस कनेक्शन।",
        type: "select",
        options: ["Electricity Connection", "Water Connection", "Gas Connection"],
        step: 1,
        required: true,
      },
      // ── Step 2: Personal Details ──
      {
        key: "applicantName",
        label: "Full Name",
        tts_prompt: "कृपया अपना पूरा नाम बताएं।",
        type: "text",
        step: 2,
        skip_if_prefilled: true,
        required: true,
      },
      {
        key: "contactPhone",
        label: "Contact Phone",
        tts_prompt: "कृपया अपना दस अंकों का मोबाइल नंबर बताएं।",
        type: "text",
        step: 2,
        skip_if_prefilled: true,
        required: true,
      },
      {
        key: "streetAddress",
        label: "Street Address",
        tts_prompt: "कृपया अपना पूरा पता बताएं, जैसे मकान नंबर, गली, मोहल्ला।",
        type: "text",
        step: 2,
        skip_if_prefilled: true,
        required: true,
      },
      {
        key: "state",
        label: "State",
        tts_prompt: "कृपया अपना राज्य बताएं।",
        type: "text",
        step: 2,
        skip_if_prefilled: true,
        required: true,
      },
      {
        key: "district",
        label: "City / District",
        tts_prompt: "कृपया अपना शहर या जिला बताएं।",
        type: "text",
        step: 2,
        skip_if_prefilled: true,
        required: true,
      },
      {
        key: "pincode",
        label: "Pincode",
        tts_prompt: "कृपया अपना छह अंकों का पिनकोड बताएं।",
        type: "text",
        step: 2,
        skip_if_prefilled: true,
        required: true,
      },
      // Step 3 (Upload Documents) is skipped in voice mode
      // Step 4 (Review) is handled by the voice loop finishing
    ],
  },

  "/citizen/service/confirm": {
    page_name: "Service Request Confirmation",
    tts_greeting:
      "आपका सेवा अनुरोध सफलतापूर्वक जमा हो गया है! संदर्भ नंबर स्क्रीन पर दिखाया गया है। आप डैशबोर्ड पर वापस जा सकते हैं या स्थिति ट्रैक कर सकते हैं।",
    valid_actions: [
      { intent: "go_dashboard", description: "Go to dashboard", target_route: "/citizen" },
      { intent: "track_status", description: "Track request status", target_route: "/citizen/track" },
    ],
  },

  "/citizen/track": {
    page_name: "Track Status",
    tts_greeting:
      "आप स्थिति ट्रैकिंग पेज पर हैं। यहाँ आप अपनी सभी शिकायतों और सेवा अनुरोधों की वर्तमान स्थिति देख सकते हैं। हरा बैज का मतलब है समाधान हो गया, नीला मतलब प्रगति पर है, और पीला मतलब लंबित है। आप वापस डैशबोर्ड पर भी जा सकते हैं।",
    valid_actions: [
      { intent: "go_dashboard", description: "Go to dashboard", target_route: "/citizen" },
      { intent: "register_complaint", description: "Register a new complaint", target_route: "/citizen/complaint/new" },
    ],
  },

  "/citizen/map": {
    page_name: "Complaint Map",
    tts_greeting:
      "आप शिकायत मैप पेज पर हैं। यहाँ आप भारत के विभिन्न क्षेत्रों में शिकायतों का वितरण देख सकते हैं। मैप पर किसी भी शहर पर क्लिक करके विवरण देखें। आप वापस डैशबोर्ड पर भी जा सकते हैं।",
    valid_actions: [
      { intent: "go_dashboard", description: "Go to dashboard", target_route: "/citizen" },
    ],
  },

  "/citizen/help": {
    page_name: "Help & Support",
    tts_greeting:
      "आप सहायता और समर्थन पेज पर हैं। यहाँ आप आपातकालीन संपर्क नंबर देख सकते हैं जैसे पुलिस, एम्बुलेंस और फायर सर्विस। आप नगरपालिका कार्यालय और अन्य सरकारी कार्यालयों के संपर्क विवरण भी देख सकते हैं। आप वापस डैशबोर्ड पर भी जा सकते हैं।",
    valid_actions: [
      { intent: "go_dashboard", description: "Go to dashboard", target_route: "/citizen" },
    ],
  },

  "/citizen/notifications": {
    page_name: "Notifications",
    tts_greeting:
      "आप सूचना पेज पर हैं। यहाँ आप सेवा अधिसूचनाएं, आउटेज नोटिस, सरकारी घोषणाएं और आपातकालीन अलर्ट देख सकते हैं। आप वापस डैशबोर्ड पर भी जा सकते हैं।",
    valid_actions: [
      { intent: "go_dashboard", description: "Go to dashboard", target_route: "/citizen" },
    ],
  },

  "/citizen/profile": {
    page_name: "My Profile",
    tts_greeting:
      "आप अपनी प्रोफाइल पेज पर हैं। यहाँ आप अपना नाम, फोन नंबर, ईमेल और पता देख सकते हैं। आप वापस डैशबोर्ड पर भी जा सकते हैं।",
    valid_actions: [
      { intent: "go_dashboard", description: "Go to dashboard", target_route: "/citizen" },
    ],
  },
};

/**
 * Fallback config for unknown routes.
 */
export const fallbackVoiceConfig: VoiceRouteConfig = {
  page_name: "Unknown Page",
  tts_greeting:
    "माफ़ कीजिए, मैं इस पेज को पहचान नहीं पाया। आप 'डैशबोर्ड' कहकर मुख्य पेज पर वापस जा सकते हैं।",
  valid_actions: [
    { intent: "go_dashboard", description: "Go to dashboard", target_route: "/citizen" },
  ],
};

/**
 * Look up the config for a given route path.
 * Handles dynamic segments like /citizen/bills/:id by falling back to the pattern.
 */
export function getVoiceConfig(pathname: string): VoiceRouteConfig {
  // Exact match first
  if (voiceNavConfig[pathname]) return voiceNavConfig[pathname];

  // Try matching dynamic bill detail route: /citizen/bills/<anything>
  if (/^\/citizen\/bills\/[^/]+$/.test(pathname) && pathname !== "/citizen/bills/success") {
    return voiceNavConfig["/citizen/bills/:id"];
  }

  return fallbackVoiceConfig;
}
