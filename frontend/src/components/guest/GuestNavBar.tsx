import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import QuickQueryPopup from "../shared/QuickQueryPopup";

export default function GuestNavBar() {
  const { t } = useTranslation();
  const [queryOpen, setQueryOpen] = useState(false);

  return (
    <>
      <header className="bg-[#1E3A5F] text-white px-4 pt-5 pb-5 mb-1 shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg text-blue-200 font-medium">{t("welcome")}</p>
            <h1 className="text-xl font-bold font-display leading-tight">
              Citizen
            </h1>
          </div>
          <div className="flex gap-2 items-center mt-1">
            <button
              onClick={() => setQueryOpen(true)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Quick Help"
            >
              <Lightbulb size={18} className="text-amber-300" />
            </button>
          </div>
        </div>
      </header>

      <QuickQueryPopup open={queryOpen} onClose={() => setQueryOpen(false)} />
    </>
  );
}
