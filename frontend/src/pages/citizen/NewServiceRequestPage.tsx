import { useState } from "react";
import { INDIAN_STATES } from "../../lib/indianStates";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MascotGuide from "../../components/shared/MascotGuide";
import type { MascotEmotion } from "../../components/shared/MascotGuide";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import { useSessionStore } from "../../store/sessionStore";
import * as api from "../../lib/api";

import { v4 as uuidv4 } from 'uuid';
import { addPendingRequest } from '../../lib/db';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const SERVICES = [
  {
    type: "electricity",
    label: "Electricity Connection",
    icon: "⚡",
    desc: "New domestic/commercial electricity connection",
  },
  {
    type: "water",
    label: "Water Connection",
    icon: "💧",
    desc: "New residential water supply connection",
  },
  {
    type: "gas",
    label: "Gas Connection",
    icon: "🔥",
    desc: "PNG/LPG gas pipeline connection",
  },
];

const REQUEST_TYPES: Record<string, { value: string; label: string }[]> = {
  electricity: [
    { value: "new_connection", label: "New Connection" },
    { value: "reconnection", label: "Reconnection" },
    { value: "meter_replacement", label: "Meter Replacement" },
    { value: "load_change", label: "Load Change" },
  ],
  water: [
    { value: "new_connection", label: "New Connection" },
    { value: "reconnection", label: "Reconnection" },
  ],
  gas: [
    { value: "new_connection", label: "New Connection" },
    { value: "reconnection", label: "Reconnection" },
  ],
};



function FileZone({
  label,
  file,
  onChange,
  required,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-600 block mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {file ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-sm text-green-700 truncate max-w-[75%]">
            {file.name}
          </span>
          <button
            onClick={() => onChange(null)}
            className="text-gray-400 hover:text-red-500"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-3 bg-white border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-300">
          <Upload size={20} className="text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500">
            Tap to upload (PDF / Image, max 10 MB)
          </span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}

export default function NewServiceRequestPage() {
  const { user } = useSessionStore();
  const isOnline = useOnlineStatus();
  const [step, setStep] = useState(1);

  const [serviceType, setServiceType] = useState("");
  const [requestType, setRequestType] = useState("new_connection");

  // Step 2 — pre-fill from profile where available
  const [applicantName, setApplicantName] = useState(() => user?.name ?? "");
  const [contactPhone, setContactPhone] = useState(() =>
    (user?.mobile ?? "").replace(/^\+91/, "").slice(-10),
  );
  const [streetAddress, setStreetAddress] = useState(
    () => user?.address?.street ?? "",
  );
  const [state, setState] = useState(() => {
    const s = (user?.address?.state ?? "").trim();
    return INDIAN_STATES.includes(s) ? s : "";
  });
  const [district, setDistrict] = useState(() => {
    return (user?.districtName ?? "").trim();
  });
  const [pincode, setPincode] = useState(() => user?.address?.pincode ?? "");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [idProof, setIdProof] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched2, setTouched2] = useState(false);

  const { t } = useTranslation();
  const navigate = useNavigate();



  const step2Valid =
    applicantName.trim().length > 0 &&
    contactPhone.trim().length === 10 &&
    streetAddress.trim().length > 0 &&
    state !== "" &&
    district.trim().length > 0 &&
    pincode.length === 6 &&
    /^\d{6}$/.test(pincode);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      if (!isOnline) {
        const idempotencyKey = uuidv4();
        
        await addPendingRequest({
          id: idempotencyKey,
          url: `${import.meta.env.VITE_API_URL || '/api'}/service-requests`,
          method: 'POST',
          body: {
            serviceType,
            requestType,
            applicantName,
            contactPhone,
            streetAddress,
            city: district,
            state,
            pincode,
            districtName: district,
            additionalNotes: additionalNotes || undefined,
            id_proof: idProof,
            address_proof: addressProof
          },
          timestamp: Date.now(),
          type: 'service'
        });

        navigate("/citizen/service/confirm", { 
          state: {
            id: `offline-${idempotencyKey}`,
            referenceNumber: `OFFLINE-QUEUED-${idempotencyKey.substring(0, 6).toUpperCase()}`,
            status: "submitted",
            serviceType: serviceType,
            requestType: requestType,
            department: "Pending Sync",
            district: district,
            createdAt: new Date().toISOString()
          } 
        });
        return;
      }

      const res = await api.submitServiceRequest({
        serviceType,
        requestType,
        applicantName,
        contactPhone,
        streetAddress,
        city: district,
        state,
        pincode,
        districtName: district,
        additionalNotes: additionalNotes || undefined,
        idProof,
        addressProof,
      });
      navigate("/citizen/service/confirm", { state: res.serviceRequest });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = [
    t("selectService"),
    t("personalDetails"),
    t("uploadDocuments"),
    t("reviewSubmit"),
  ];

  return (
    <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate(-1))}
          className="text-gray-600"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {t("newConnectionRequest")}
        </h1>
      </div>

      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-[#1E3A5F]" : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        {t("step")} {step} {t("of")} 4: {stepLabels[step - 1]}
      </p>

      {/* ── Animated Mascot Guide ──────────────────────────────────── */}
      {(() => {
        let emotion: MascotEmotion = "happy";
        let msg = "";
        if (step === 1) {
          emotion = "happy";
          msg = t("mascotWhatService");
        } else if (step === 2) {
          if (touched2 && !step2Valid) {
            emotion = "sorry";
            msg = t("mascotFieldsError");
          } else {
            emotion = "pointing";
            msg = t("mascotFillDetails");
          }
        } else if (step === 3) {
          emotion = "neutral";
          msg = t("mascotUploadDocs");
        } else if (step === 4) {
          if (loading) {
            emotion = "loading";
            msg = t("mascotSubmitting");
          } else if (error) {
            emotion = "sorry";
            msg = t("mascotSomethingWrong");
          } else {
            emotion = "celebration";
            msg = t("mascotReviewSubmit");
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

      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          {SERVICES.map(({ type, label, icon, desc }) => (
            <button
              key={type}
              onClick={() => {
                setServiceType(type);
                setRequestType("new_connection");
              }}
              className={`w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border-2 transition-all ${serviceType === type ? "border-[#1E3A5F] bg-blue-50" : "border-transparent hover:border-gray-200"}`}
            >
              <span className="text-3xl">{icon}</span>
              <div className="text-left">
                <p className="font-bold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </button>
          ))}

          {serviceType && (
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">
                Request Type
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {(REQUEST_TYPES[serviceType] ?? []).map(
                  ({ value, label: rl }) => (
                    <option key={value} value={value}>
                      {rl}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}

          <button
            disabled={!serviceType}
            onClick={() => setStep(2)}
            className="w-full py-3.5 rounded-xl bg-[#1E3A5F] text-white font-bold disabled:opacity-50 btn-touch mt-2"
          >
            {t("next")}
          </button>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {[
            {
              label: "Full Name *",
              value: applicantName,
              setter: setApplicantName,
              ph: "Your full legal name",
              valid: applicantName.trim().length > 0,
            },
            {
              label: "Contact Phone *",
              value: contactPhone,
              setter: setContactPhone,
              ph: "10-digit mobile number",
              valid: contactPhone.trim().length === 10,
              type: "tel",
            },
            {
              label: "Street Address *",
              value: streetAddress,
              setter: setStreetAddress,
              ph: "House no, street, landmark",
              valid: streetAddress.trim().length > 0,
            },
          ].map(({ label, value, setter, ph, valid, type }) => (
            <div key={label}>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">
                {label}
              </label>
              <input
                type={type ?? "text"}
                value={value}
                maxLength={type === "tel" ? 10 : undefined}
                onChange={(e) => setter(e.target.value)}
                placeholder={ph}
                className={`w-full border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${touched2 && !valid ? "border-red-300" : "border-gray-200"}`}
              />
            </div>
          ))}

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">
              State *
            </label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setDistrict("");
                setPincode("");
              }}
              className={`w-full border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none ${touched2 && !state ? "border-red-300" : "border-gray-200"}`}
            >
              <option value="">-- Select State --</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">
              City / District *
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Jalandhar, Ludhiana, Noida"
              className={`w-full border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${touched2 && !district.trim() ? "border-red-300" : "border-gray-200"}`}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">
              Pincode *
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
              className={`w-full border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${touched2 && (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) ? "border-red-300" : "border-gray-200"}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">
              Additional Notes (optional)
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={2}
              placeholder="Any additional information for the department"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          {touched2 && !step2Valid && (
            <p className="text-xs text-red-500">
              Please fill all required fields with valid data.
            </p>
          )}

          <button
            onClick={() => {
              setTouched2(true);
              if (step2Valid) setStep(3);
            }}
            className="w-full py-3.5 rounded-xl bg-[#1E3A5F] text-white font-bold btn-touch"
          >
            {t("next")}
          </button>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <p className="text-sm text-gray-500 bg-white rounded-xl p-3 shadow-sm">
            📋 Upload clear, legible documents. Accepted formats: PDF, JPEG,
            PNG, WebP (max 10 MB each).
          </p>
          <FileZone
            label="ID Proof (Aadhaar / PAN / Voter ID)"
            file={idProof}
            onChange={setIdProof}
            required
          />
          <FileZone
            label="Address Proof"
            file={addressProof}
            onChange={setAddressProof}
            required
          />

          <button
            onClick={() => setStep(4)}
            className="w-full py-3.5 rounded-xl bg-[#1E3A5F] text-white font-bold btn-touch"
          >
            {t("next")}
          </button>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-5 space-y-3 text-sm">
            {[
              ["Service", SERVICES.find((s) => s.type === serviceType)?.label],
              ["Request Type", requestType.replace("_", " ")],
              ["Applicant", applicantName],
              ["Phone", contactPhone],
              [
                "Address",
                `${streetAddress}, ${district}, ${state} - ${pincode}`,
              ],
              ["ID Proof", idProof?.name ?? "Not uploaded"],
              ["Addr. Proof", addressProof?.name ?? "Not uploaded"],
            ].map(([label, val]) => (
              <div
                key={String(label)}
                className="flex justify-between border-b border-gray-50 pb-2 last:border-0"
              >
                <span className="text-gray-500">{String(label)}</span>
                <span className="font-semibold text-gray-800 text-right max-w-[60%] truncate capitalize">
                  {String(val ?? "—")}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-3">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#16A34A] text-white font-bold btn-touch flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Submitting…
              </>
            ) : (
              `${t("submit")} Application`
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}