import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, Mail, Shield, HelpCircle } from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import {
  getHelpContacts,
  type EmergencyContact,
  type ImportantContact,
} from "../../lib/api";

export default function HelpSupportPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(
    [],
  );
  const [importantContacts, setImportantContacts] = useState<ImportantContact[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getHelpContacts();
        setEmergencyContacts(res.emergencyContacts);
        setImportantContacts(res.importantContacts);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load contact details.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="text-gray-600">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">{t("helpSupport")}</h1>
      </div>

      {loading && <p className="text-sm text-gray-500 mb-4">{t("loading")}</p>}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Emergency Contacts */}
      <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
        {t("emergencyContacts")}
      </h2>
      <div className="space-y-3 mb-6">
        {emergencyContacts.map((ec, i) => (
          <motion.div
            key={ec.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${ec.color} rounded-2xl p-4 text-white`}
          >
            <div className="flex items-center gap-3 mb-3">
              {ec.icon === "shield" ? (
                <Shield size={24} className="text-white/80" />
              ) : (
                <HelpCircle size={24} className="text-white/80" />
              )}
              <div>
                <p className="font-bold text-base">{ec.name}</p>
                <p className="text-white/80 text-sm">{ec.number}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${ec.number}`}
                className="flex-1 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone size={15} /> {t("callNow")}
              </a>
              <a
                href={`mailto:${ec.email}`}
                className="flex-1 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Mail size={15} /> {t("sendEmail")}
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Important Contacts */}
      <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
        {t("importantContacts")}
      </h2>
      <div className="space-y-2">
        {importantContacts.map((ic, i) => (
          <motion.div
            key={ic.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.07 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <p className="font-semibold text-gray-800 text-sm mb-0.5">
              {ic.name}
            </p>
            <p className="text-xs text-gray-400 mb-3">{ic.number}</p>
            <div className="flex gap-2">
              <a
                href={`tel:${ic.number}`}
                className="flex-1 py-2 rounded-xl bg-[#1E3A5F] text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#163050] transition-colors"
              >
                <Phone size={13} /> {t("callNow")}
              </a>
              <a
                href={`mailto:${ic.email}`}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors"
              >
                <Mail size={13} /> {t("sendEmail")}
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
