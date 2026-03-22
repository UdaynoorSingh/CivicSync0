import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Calendar,
  LogOut,
  Pencil,
  X,
  Check,
  Loader2,
  Home,
  ChevronDown,
  Search,
  Languages,
} from "lucide-react";
import { useSessionStore } from "../../store/sessionStore";
import { useTranslation } from "../../lib/i18n";
import { INDIAN_STATES } from "../../lib/indianStates";
import * as api from "../../lib/api";
import type { DistrictOption, UserAddress } from "../../lib/api";

// ── Language options ───────────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "as", label: "অসমীয়া" },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function fmtMemberSince(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── District picker sub-component ─────────────────────────────────────────────
function DistrictPicker({
  value,
  districts,
  loading,
  onChange,
}: {
  value: string;
  districts: DistrictOption[];
  loading: boolean;
  onChange: (id: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = districts.find((d) => d.id === value);

  const filtered = query.trim()
    ? districts.filter(
        (d) =>
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.state.toLowerCase().includes(query.toLowerCase()),
      )
    : districts;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
      >
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {loading
            ? t("loadingDistricts")
            : selected
              ? `${selected.name}, ${selected.state}`
              : t("selectDistrict2")}
        </span>
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-2" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Search */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-gray-50">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchDistricts")}
                className="flex-1 text-sm text-gray-800 bg-transparent outline-none"
              />
            </div>
            {/* List */}
            <ul className="max-h-48 overflow-y-auto divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-400 text-center">
                  {t("noResults")}
                </li>
              ) : (
                filtered.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(d.id, d.name);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                        d.id === value
                          ? "text-[#1E3A5F] font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {d.name}
                      <span className="text-gray-400 text-xs ml-1.5">
                        {d.state}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Address row (view) ─────────────────────────────────────────────────────────
function AddressView({ address }: { address?: UserAddress }) {
  if (!address) return <p className="text-sm text-gray-400">—</p>;
  const parts = [
    address.houseNo,
    address.street,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ]
    .map((p) => p?.trim())
    .filter(Boolean);

  if (parts.length === 0) return <p className="text-sm text-gray-400">—</p>;
  return (
    <p className="text-sm font-medium text-gray-800 leading-snug">
      {parts.join(", ")}
    </p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout, updateUser } = useSessionStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [formName, setFormName] = useState(user?.name ?? "");
  const [formLang, setFormLang] = useState(user?.preferredLanguage ?? "en");
  const [formDistrictId, setFormDistrictId] = useState(user?.district ?? "");
  const [formDistrictName, setFormDistrictName] = useState(
    user?.districtName ?? "",
  );
  const [formAddress, setFormAddress] = useState<UserAddress>(
    user?.address ?? {},
  );

  // Districts for picker - use complete Indian states list
  const districts: DistrictOption[] = INDIAN_STATES.map((state) => ({ id: state, name: state, state: state }));
  const loadingDistricts = false;

  const handleLogout = () => {
    void logout();
    navigate("/", { replace: true });
  };

  // Reset form fields when entering edit mode (to always reflect latest values)
  const enterEdit = () => {
    setFormName(user?.name ?? "");
    setFormLang(user?.preferredLanguage ?? "en");
    setFormDistrictId(user?.district ?? "");
    setFormDistrictName(user?.districtName ?? "");
    setFormAddress(user?.address ?? {});
    setSaveError("");
    setSaveSuccess(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError("");
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setSaveError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload: api.UpdateProfilePayload = {
        name: formName.trim(),
        preferredLanguage: formLang,
        ...(formDistrictName ? { districtName: formDistrictName } : {}),
        address: formAddress,
      };
      const res = await api.updateProfile(payload);
      // Patch session store
      const updatedUser = res.user;
      const districtObj =
        typeof updatedUser.district === "object" &&
        updatedUser.district !== null
          ? updatedUser.district
          : null;
      updateUser({
        name: updatedUser.name,
        preferredLanguage: updatedUser.preferredLanguage,
        district: districtObj?._id ?? formDistrictId,
        districtName: districtObj?.name ?? formDistrictName,
        address: updatedUser.address,
        createdAt: updatedUser.createdAt,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setEditing(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const addrField = (key: keyof UserAddress, placeholder: string) => (
    <input
      value={formAddress[key] ?? ""}
      onChange={(e) =>
        setFormAddress((prev) => ({ ...prev, [key]: e.target.value }))
      }
      placeholder={placeholder}
      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
    />
  );

  return (
    <div className="min-h-screen bg-[#EEF0FB] px-4 py-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-600">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">{t("myProfile")}</h1>
        </div>
        {!editing && (
          <button
            onClick={enterEdit}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A5F] bg-white px-3 py-2 rounded-xl shadow-sm"
          >
            <Pencil size={13} />
            {t("edit")}
          </button>
        )}
      </div>

      {/* Avatar + Name hero */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-[#1E3A5F] flex items-center justify-center mx-auto mb-3 shadow-lg">
          <span className="text-white text-2xl font-bold tracking-wide">
            {initials(user?.name ?? "C")}
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-800">
          {user?.name ?? "Citizen"}
        </h2>
        <p className="text-sm text-gray-500">{user?.mobile ?? ""}</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {editing ? (
          /* ── EDIT MODE ─────────────────────────────────────────────────── */
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Personal */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <User size={11} /> {t("personalDetails")}
                </p>
              </div>
              <div className="px-4 py-4 space-y-3">
                {/* Name */}
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1 block">
                    {t("fullNameRequired")}
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t("yourFullName")}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                  />
                </div>
                {/* Mobile (read-only) */}
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1 block">
                    {t("mobileNonEditable")}
                  </label>
                  <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-500">
                    <Phone size={13} className="mr-2 shrink-0" />
                    {user?.mobile ?? "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-2xl shadow-sm h-fit">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Languages size={11} /> {t("preferences")}
                </p>
              </div>
              <div className="px-4 py-4 space-y-3">
                {/* Language picker */}
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2 block">
                    {t("preferredLanguage")}
                  </label>
                  <div className="flex gap-2">
                    {LANG_OPTIONS.map((lang) => (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => setFormLang(lang.value)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          formLang === lang.value
                            ? "bg-[#1E3A5F] text-white border-[#1E3A5F] shadow"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* District picker */}
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1 block">
                    {t("districtPicker")}
                  </label>
                  <DistrictPicker
                    value={formDistrictId}
                    districts={districts}
                    loading={loadingDistricts}
                    onChange={(id, name) => {
                      setFormDistrictId(id);
                      setFormDistrictName(name);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Home size={11} /> {t("addressSection")}
                </p>
              </div>
              <div className="px-4 py-4 grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="text-[11px] text-gray-400 mb-1 block">
                    {t("houseNo")}
                  </label>
                  {addrField("houseNo", t("houseNoHint"))}
                </div>
                <div className="col-span-1">
                  <label className="text-[11px] text-gray-400 mb-1 block">
                    {t("pincode")}
                  </label>
                  {addrField("pincode", t("pincodeAddr"))}
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-gray-400 mb-1 block">
                    {t("streetColony")}
                  </label>
                  {addrField("street", t("streetColonyHint"))}
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-gray-400 mb-1 block">
                    {t("landmark")}
                  </label>
                  {addrField("landmark", t("landmarkHint"))}
                </div>
                <div className="col-span-1">
                  <label className="text-[11px] text-gray-400 mb-1 block">
                    {t("cityLabel")}
                  </label>
                  {addrField("city", t("cityHint"))}
                </div>
                <div className="col-span-1">
                  <label className="text-[11px] text-gray-400 mb-1 block">
                    {t("stateProfile")}
                  </label>
                  {addrField("state", t("statePh"))}
                </div>
              </div>
            </div>

            {/* Error */}
            {saveError && (
              <p className="text-sm text-red-500 text-center px-2">
                {saveError}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={cancelEdit}
                className="flex-1 py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || saveSuccess}
                className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-70 transition-all ${
                  saveSuccess
                    ? "bg-green-600 text-white"
                    : "bg-[#1E3A5F] text-white"
                }`}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : saveSuccess ? (
                  <Check size={16} />
                ) : (
                  <Check size={16} />
                )}
                {saving ? "Saving…" : saveSuccess ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── VIEW MODE ─────────────────────────────────────────────────── */
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Account Details */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  {t("accountDetails")}
                </p>
              </div>
              {[
                {
                  Icon: User,
                  label: "Full Name",
                  val: user?.name,
                },
                {
                  Icon: Phone,
                  label: "Mobile",
                  val: user?.mobile,
                },
                {
                  Icon: MapPin,
                  label: "State",
                  val: user?.districtName
                    ? user.districtName
                    : (user?.district ?? undefined),
                },
                {
                  Icon: Languages,
                  label: "Language",
                  val:
                    LANG_OPTIONS.find(
                      (l) => l.value === (user?.preferredLanguage ?? "en"),
                    )?.label ?? "English",
                },
                {
                  Icon: Calendar,
                  label: "Member Since",
                  val: fmtMemberSince(user?.createdAt),
                },
              ].map(({ Icon, label, val }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                >
                  <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-800">
                      {val ?? "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Address */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Address
                </p>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <Home size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <AddressView address={user?.address} />
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                {t("sessionInfo")}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("sessionStarted")}</span>
                  <span className="font-medium text-gray-800">
                    {new Date().toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("sessionTimeout")}</span>
                  <span className="font-medium text-gray-800">
                    {t("sessionTimeoutValue")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("roleLabel")}</span>
                  <span className="font-medium text-green-600 capitalize">
                    {t("citizenRole")}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3.5 rounded-xl bg-red-50 text-red-600 font-bold text-base flex items-center gap-2 justify-center border-2 border-red-100 hover:bg-red-100 transition-colors btn-touch"
            >
              <LogOut size={18} /> {t("logout")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
