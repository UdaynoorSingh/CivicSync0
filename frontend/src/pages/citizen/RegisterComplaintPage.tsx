import { useState, useRef, useEffect } from "react";
import { INDIAN_STATES } from "../../lib/indianStates";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { v4 as uuidv4 } from 'uuid';
import { addPendingRequest } from '../../lib/db';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  ChevronDown,
  User,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import { useSessionStore } from "../../store/sessionStore";
import * as api from "../../lib/api";
import MascotGuide from "../../components/shared/MascotGuide";
import type { MascotEmotion } from "../../components/shared/MascotGuide";

// ── Department config — `code` must match backend seed codes ──────────────────
type Urgency = "low" | "medium" | "high";

interface Department {
  key: string;
  code: string; // ← exact code stored in DB (ELEC, WATER, GAS, SANITATION, WASTE)
  name: string;
  icon: string;
  color: string;
  description: string;
  categories: string[];
}

const DEPARTMENTS: Department[] = [
  {
    key: "electricity",
    code: "ELEC",
    name: "Electricity",
    icon: "⚡",
    color: "bg-yellow-50 border-yellow-300",
    description: "Power outages, streetlights, meter issues",
    categories: [
      "Power Outage",
      "Streetlight Fault",
      "Meter Issue",
      "Voltage Fluctuation",
      "Other",
    ],
  },
  {
    key: "water",
    code: "WATER",
    name: "Water Supply",
    icon: "💧",
    color: "bg-blue-50 border-blue-300",
    description: "Leakage, contamination, low pressure",
    categories: [
      "Water Leakage",
      "Water Contamination",
      "Low Pressure",
      "No Water Supply",
      "Other",
    ],
  },
  {
    key: "gas",
    code: "GAS",
    name: "Gas Supply",
    icon: "🔥",
    color: "bg-orange-50 border-orange-300",
    description: "Gas leaks, pressure issues, pipeline faults",
    categories: ["Gas Leak", "Low Gas Pressure", "Pipeline Damage", "Other"],
  },
  {
    key: "sanitation",
    code: "SANITATION",
    name: "Sanitation",
    icon: "🚿",
    color: "bg-green-50 border-green-300",
    description: "Sewage overflow, blocked drains",
    categories: [
      "Sewage Overflow",
      "Blocked Drain",
      "Public Toilet Issue",
      "Other",
    ],
  },
  {
    key: "waste",
    code: "WASTE",
    name: "Waste Management",
    icon: "♻️",
    color: "bg-emerald-50 border-emerald-300",
    description: "Garbage collection, illegal dumping",
    categories: [
      "Garbage Not Collected",
      "Illegal Dumping",
      "Road Cleaning",
      "Other",
    ],
  },
];

const URGENCY_OPTIONS: { value: Urgency; label: string; color: string }[] = [
  {
    value: "low",
    label: "Low",
    color: "bg-green-100 text-green-700 border-green-300",
  },
  {
    value: "medium",
    label: "Medium",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  {
    value: "high",
    label: "High",
    color: "bg-red-100 text-red-700 border-red-300",
  },
];



// ── Validation helpers ────────────────────────────────────────────────────────
const step2Valid = (
  category: string,
  description: string,
  photoFile: File | null,
) => category !== "" && description.length >= 10 && photoFile !== null;

const step3Valid = (
  streetAddress: string,
  state: string,
  district: string,
  pincode: string,
) =>
  streetAddress.trim().length > 0 &&
  state !== "" &&
  district.trim().length > 0 &&
  pincode.length === 6 &&
  /^\d{6}$/.test(pincode);

export default function RegisterComplaintPage() {
  const { user } = useSessionStore();
  const isOnline = useOnlineStatus(); // Network status hook
  const [step, setStep] = useState(1);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const [complaintScope, setComplaintScope] = useState<
    "personal" | "locality" | ""
  >("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");

  // Step 3 location fields — pre-filled from user profile where available
  const [streetAddress, setStreetAddress] = useState(
    () => user?.address?.street ?? "",
  );
  const [state, setState_] = useState(() => {
    const s = (user?.address?.state ?? "").trim();
    return INDIAN_STATES.includes(s) ? s : "";
  });
  const [district, setDistrict] = useState(() => {
    return (user?.districtName ?? "").trim();
  });
  const [pincode, setPincode] = useState(() => user?.address?.pincode ?? "");

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [touched2, setTouched2] = useState(false);
  const [touched3, setTouched3] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [showAmbiguousPopup, setShowAmbiguousPopup] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const aiBaseUrl = import.meta.env.VITE_AI_API_URL as string;

  // ── Voice Auto-Fill: read form data from route state ─────────────────────
  useEffect(() => {
    const voiceData = (
      location.state as { voiceFormData?: Record<string, string> }
    )?.voiceFormData;
    if (!voiceData) return;

    // Auto-select department
    if (voiceData.department) {
      const dept = DEPARTMENTS.find(
        (d) =>
          d.key === voiceData.department ||
          d.code.toLowerCase() === voiceData.department?.toLowerCase(),
      );
      if (dept) {
        setSelectedDept(dept);
        // Auto-select category if available
        if (voiceData.category) {
          const matchedCat = dept.categories.find(
            (c) => c.toLowerCase() === voiceData.category?.toLowerCase(),
          );
          if (matchedCat) setCategory(matchedCat);
          else setCategory(voiceData.category); // use raw value as fallback
        }
        setStep(2); // Skip to step 2 since department is selected
      }
    }

    if (voiceData.description) setDescription(voiceData.description);
    if (
      voiceData.urgency &&
      ["low", "medium", "high"].includes(voiceData.urgency)
    ) {
      setUrgency(voiceData.urgency as Urgency);
    }
    if (voiceData.scope && ["personal", "locality"].includes(voiceData.scope)) {
      setComplaintScope(voiceData.scope as "personal" | "locality");
    }
    if (voiceData.state) {
      const matchedState = INDIAN_STATES.find(
        (s) => s.toLowerCase() === voiceData.state?.toLowerCase(),
      );
      if (matchedState) {
        setState_(matchedState);
      }
    }
    if (voiceData.district) setDistrict(voiceData.district);
    if (voiceData.pincode) setPincode(voiceData.pincode);
    if (voiceData.streetAddress) setStreetAddress(voiceData.streetAddress);

    // Clear the route state so it doesn't re-apply on re-render
    window.history.replaceState({}, document.title);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStateChange = (s: string) => {
    setState_(s);
    setDistrict("");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoName(file?.name ?? "");
  };

  const goToStep2 = async () => {
    setTouched2(true);
    setVerifyError("");

    if (complaintScope !== "" && step2Valid(category, description, photoFile)) {
      if (!isOnline) {
        setStep(3);
        return;
      }

      setIsVerifying(true);

      try {
        const reader = new FileReader();
        reader.readAsDataURL(photoFile!);
        reader.onerror = () => {
          setVerifyError("Failed to read the image file. Please try again.");
          setIsVerifying(false);
        };
        reader.onloadend = async () => {
          const base64Image = reader.result as string;

          try {
            const res = await fetch(
              `${aiBaseUrl}/verify_complaint`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  complaint_text: description,
                  image: base64Image,
                }),
              }
            );

            if (!res.ok) throw new Error("Verification service unavailable. Please try again later.");

            const data = await res.json();

            if (data.status === "true complaint") {
              setStep(3);
            } else if (data.status === "unambiguous complaint") {
              setShowAmbiguousPopup(true);
            } else if (
              data.status === "Ai_Generated" ||
              data.status === "fake complaint"
            ) {
              setVerifyError(
                `Cannot proceed: This issue has been flagged as a ${data.status.replace("_", " ")}.`
              );
            } else if (data.status === "irrelevant image") {
              setVerifyError(
                "Cannot proceed: The uploaded image does not appear to be related to any civic issue. Please upload a photo that shows the actual problem."
              );
            } else if (data.status === "error") {
              setVerifyError(
                data.message || "Verification failed. Please try again."
              );
            } else {
              // Unknown status — don't silently proceed, show a warning
              setVerifyError(
                "Could not verify the complaint image. Please try uploading a clearer photo of the issue."
              );
            }
          } catch (err) {
            console.error(err);
            setVerifyError(
              err instanceof Error ? err.message : "Verification failed. Please check your connection and try again."
            );
          } finally {
            setIsVerifying(false);
          }
        };
      } catch (err) {
        setIsVerifying(false);
        setVerifyError(
          "Failed to process the image. Please try again."
        );
      }
    }
  };

  const goBack = () => (step > 1 ? setStep((s) => s - 1) : navigate(-1));

  const handleSubmit = async () => {
    setTouched3(true);
    if (!step3Valid(streetAddress, state, district, pincode)) return;
    if (!selectedDept || !complaintScope) return;

    setLoading(true);
    setSubmitError("");

    try {
      if (!isOnline) {
        const idempotencyKey = uuidv4();
        
        await addPendingRequest({
          id: idempotencyKey,
          url: `${import.meta.env.VITE_API_URL || '/api'}/complaints`, 
          method: 'POST',
          body: {
            departmentCode: selectedDept.code,
            category,
            description,
            urgency,
            streetAddress,
            city: district,
            state,
            pincode,
            districtName: district,
            photo: photoFile, 
          },
          timestamp: Date.now(),
          type: 'complaint'
        });

        navigate("/citizen/complaint/confirm", {
          state: {
            refNo: `OFFLINE-QUEUED-${idempotencyKey.substring(0, 6).toUpperCase()}`,
            category: `${selectedDept.icon} ${selectedDept.name} – ${category}`,
            location: `${district}, ${state} ${pincode}`,
            department: { name: selectedDept.name },
            urgency: urgency,
            offlineQueued: true
          },
        });
        return;
      }

      if (complaintScope === "locality") {
        try {
          const prevCompsRes = await api.getDistrictComplaints(state);
          const prevComplaints = prevCompsRes.success
            ? prevCompsRes.descriptions
            : [];

          const checkRes = await fetch(
            `${aiBaseUrl}/similar-complaint`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prev_complaint: prevComplaints,
                complaint: description,
              }),
            }
          );

          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.is_duplicate) {
              setSubmitError(
                `This complaint appears to be a duplicate: ${checkData.result}`
              );
              setLoading(false);
              return; 
            }
          }
        } catch (checkErr) {
          console.error("Duplicate check failed, proceeding anyway", checkErr);
        }
      }

      const res = await api.submitComplaint({
        departmentCode: selectedDept.code, 
        category,
        description,
        urgency,
        streetAddress,
        city: district,
        state,
        pincode,
        districtName: district,
        photo: photoFile,
      });

      navigate("/citizen/complaint/confirm", {
        state: {
          refNo: res.complaint.referenceNumber,
          category: `${selectedDept.icon} ${selectedDept.name} – ${category}`,
          location: `${district}, ${state} ${pincode}`,
          department: res.complaint.department,
          urgency: res.complaint.urgency,
        },
      });
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit complaint."
      );
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = ["Select Department", "Issue Details", "Location & Submit"];

  const FieldError = ({ msg }: { msg: string }) => (
    <p className="text-red-500 text-xs mt-1">{msg}</p>
  );

  return (
    <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goBack} className="text-gray-600">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {t("registerNewComplaint")}
        </h1>
      </div>

      <div className="flex gap-1.5 mb-1">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              s <= step ? "bg-[#1E3A5F]" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Step {step} of 3 — {stepLabel[step - 1]}
      </p>

      {/* ── Animated Mascot Guide ──────────────────────────────────── */}
      {(() => {
        let emotion: MascotEmotion = "happy";
        let msg = "";
        if (step === 1) {
          emotion = "happy";
          msg = "Hi! Which department can I help with?";
        } else if (step === 2) {
          if (isVerifying) {
            emotion = "thinking_ai";
            msg = "Let me verify your image…";
          } else if (verifyError) {
            emotion = "sorry";
            msg = "Oops! Please check the issue above.";
          } else {
            emotion = "pointing";
            msg = "Fill in the details below!";
          }
        } else if (step === 3) {
          if (loading) {
            emotion = "loading";
            msg = "Submitting your complaint…";
          } else {
            emotion = "neutral";
            msg = "Almost done! Add your location.";
          }
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

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-sm font-semibold text-gray-500 mb-3">
              Which department does this issue belong to?
            </h2>
            <div className="flex flex-col gap-3">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept.key}
                  onClick={() => setSelectedDept(dept)}
                  className={`w-full flex items-center gap-4 bg-white rounded-2xl p-4 border-2 text-left shadow-sm transition-all ${
                    selectedDept?.key === dept.key
                      ? dept.color + " shadow-md"
                      : "border-transparent hover:border-gray-200"
                  }`}
                >
                  <span className="text-3xl w-10 text-center">{dept.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">
                      {dept.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                      {dept.description}
                    </p>
                  </div>
                  {selectedDept?.key === dept.key && (
                    <CheckCircle2
                      size={20}
                      className="text-[#1E3A5F] shrink-0"
                    />
                  )}
                </button>
              ))}
            </div>
            <button
              disabled={!selectedDept}
              onClick={() => {
                setCategory("");
                setStep(2);
              }}
              className="w-full mt-5 py-3.5 rounded-xl bg-[#1E3A5F] text-white font-bold disabled:opacity-40 btn-touch"
            >
              {t("next")}
            </button>
          </motion.div>
        )}

        {step === 2 && selectedDept && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1.5 text-xs font-semibold text-[#1E3A5F] shadow-sm mb-5">
              <span>{selectedDept.icon}</span>
              <span>{selectedDept.name}</span>
            </div>

            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Is this a personal or locality issue?{" "}
              <span className="text-red-400">*</span>
            </h2>
            <div className="flex gap-3 mb-1">
              <button
                onClick={() => setComplaintScope("personal")}
                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  complaintScope === "personal"
                    ? "border-[#1E3A5F] bg-[#1E3A5F]/5 text-[#1E3A5F]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                <User size={20} className="mb-1.5" />
                <span className="text-sm font-semibold">Personal</span>
                <span className="text-[10px] text-center mt-0.5 opacity-70">
                  Specific to me/my property
                </span>
              </button>
              <button
                onClick={() => setComplaintScope("locality")}
                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  complaintScope === "locality"
                    ? "border-[#1E3A5F] bg-[#1E3A5F]/5 text-[#1E3A5F]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                <Users size={20} className="mb-1.5" />
                <span className="text-sm font-semibold">Locality</span>
                <span className="text-[10px] text-center mt-0.5 opacity-70">
                  Affects the community
                </span>
              </button>
            </div>
            {touched2 && !complaintScope && (
              <FieldError msg="Please select whether this is a personal or locality issue." />
            )}
            <div className="mb-4" />

            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Issue Category <span className="text-red-400">*</span>
            </h2>
            <div className="flex flex-wrap gap-2 mb-1">
              {selectedDept.categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    category === cat
                      ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {touched2 && !category && (
              <FieldError msg="Please select a category." />
            )}
            <div className="mb-4" />

            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              {t("describeIssue")} <span className="text-red-400">*</span>
              <span className="text-xs text-gray-400 font-normal ml-1">
                (min 10 characters)
              </span>
            </h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue in detail…"
              rows={4}
              className={`w-full bg-white border rounded-2xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none mb-1 ${
                touched2 && description.length < 10
                  ? "border-red-300"
                  : "border-gray-200"
              }`}
            />
            <div className="flex justify-between mb-4">
              {touched2 && description.length < 10 ? (
                <FieldError msg="Description must be at least 10 characters." />
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">
                {description.length}/10+
              </span>
            </div>

            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              {t("uploadPhoto")} <span className="text-red-400">*</span>
            </h2>
            <label
              className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-2xl p-5 cursor-pointer transition-colors mb-1 ${
                photoName
                  ? "bg-green-50 border-green-300"
                  : touched2 && !photoFile
                    ? "bg-red-50 border-red-300"
                    : "bg-white border-gray-200 hover:border-blue-300"
              }`}
            >
              <Camera
                size={26}
                className={photoName ? "text-green-500" : "text-gray-400"}
              />
              <span className="text-sm text-center text-gray-400">
                {photoName ? (
                  <span className="text-green-600 font-semibold">
                    ✓ {photoName}
                  </span>
                ) : (
                  "Tap to upload a photo"
                )}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
            {touched2 && !photoFile && (
              <FieldError msg="A photo of the issue is required." />
            )}
            <div className="mb-4" />

            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Urgency Level
            </h2>
            <div className="flex gap-2 mb-5">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setUrgency(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    urgency === opt.value
                      ? opt.color
                      : "bg-white text-gray-400 border-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {verifyError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-sm mb-3">
                <AlertTriangle size={16} className="inline mr-2 mb-0.5" />
                {verifyError}
              </div>
            )}

            <button
              onClick={goToStep2}
              disabled={isVerifying && isOnline} 
              className="w-full py-3.5 rounded-xl bg-[#1E3A5F] text-white font-bold btn-touch disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Verifying…
                </>
              ) : (
                t("next")
              )}
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-sm font-semibold text-gray-500 mb-3">
              Location Details <span className="text-red-400">*</span>
            </h2>

            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  State <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className={`w-full appearance-none bg-gray-50 border rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 pr-8 ${
                      touched3 && !state ? "border-red-300" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select state…</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
                {touched3 && !state && (
                  <FieldError msg="Please select a state." />
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  City / District <span className="text-red-400">*</span>
                </label>
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Jalandhar, Ludhiana, Noida"
                  className={`w-full bg-gray-50 border rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    touched3 && !district.trim()
                      ? "border-red-300"
                      : "border-gray-200"
                  }`}
                />
                {touched3 && !district.trim() && (
                  <FieldError msg="Please enter your city or district." />
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  Pincode <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPincode(val);
                  }}
                  placeholder="e.g. 110001"
                  className={`w-full text-sm text-gray-800 bg-gray-50 border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    touched3 && (pincode.length !== 6 || !/^\d{6}$/.test(pincode))
                      ? "border-red-300"
                      : "border-gray-200"
                  }`}
                />
                {touched3 && (pincode.trim().length !== 6 || !/^\d{6}$/.test(pincode)) && (
                  <FieldError msg="Please enter a valid 6-digit pincode." />
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  Street / Area <span className="text-red-400">*</span>
                </label>
                <input
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. Sector 12, Model Town"
                  className={`w-full text-sm text-gray-800 bg-gray-50 border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    touched3 && !streetAddress.trim()
                      ? "border-red-300"
                      : "border-gray-200"
                  }`}
                />
                {touched3 && !streetAddress.trim() && (
                  <FieldError msg="Please enter your street / area." />
                )}
              </div>
            </div>

            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Review Summary
            </h2>
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-5 space-y-2.5 text-sm">
              {(
                [
                  ["Department", `${selectedDept?.icon} ${selectedDept?.name}`],
                  [
                    "Scope",
                    complaintScope.charAt(0).toUpperCase() +
                      complaintScope.slice(1),
                  ],
                  ["Category", category],
                  [
                    "Urgency",
                    urgency.charAt(0).toUpperCase() + urgency.slice(1),
                  ],
                  ["District", district || "—"],
                  ["State", state || "—"],
                  ["Filed by", user?.name ?? "Citizen"],
                  ["Photo", photoName ? "✓ Attached" : "—"],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-400">{label}</span>
                  <span
                    className={`font-semibold text-right max-w-[55%] ${label === "Photo" && photoName ? "text-green-600" : "text-gray-800"}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-sm mb-3">
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#16A34A] text-white font-bold btn-touch disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Submitting…
                </>
              ) : (
                t("submit")
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAmbiguousPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAmbiguousPopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm z-50 bg-white rounded-2xl p-5 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <MascotGuide
                  emotion="thinking"
                  size="sm"
                  className="justify-center mb-2"
                />
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  Ambiguous Complaint
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your complaint has been detected as ambiguous by the system.
                  Do you still want to proceed with registering the complaint?
                </p>
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 mb-5 text-left w-full">
                  <strong>Warning:</strong> Appropriate action will be taken in
                  case the complaint is found to be fake.
                </div>

                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setShowAmbiguousPopup(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowAmbiguousPopup(false);
                      setStep(3);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors text-sm shadow-sm"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}