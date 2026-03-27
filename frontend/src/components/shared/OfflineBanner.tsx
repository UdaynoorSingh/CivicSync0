import { useState, useEffect, useRef } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useOfflineSync } from "../../hooks/useOfflineSync";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const wasOffline = useRef(false);

  useOfflineSync();

  useEffect(() => {
    if (!isOnline) {
      // User went offline — remember this so we can show banner on reconnect
      wasOffline.current = true;
    } else if (wasOffline.current) {
      // User just came back online from an offline state
      wasOffline.current = false;
      setShowOnlineBanner(true);
      const timer = setTimeout(() => setShowOnlineBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="bg-red-600 text-white text-center py-2 px-4 z-50 text-xs font-bold shadow-md w-full">
        You are currently offline. Requests will be saved and synced automatically when internet is restored.
      </div>
    );
  }

  if (showOnlineBanner) {
    return (
      <div className="bg-green-600 text-white text-center py-2 px-4 z-50 text-xs font-bold shadow-md w-full animate-pulse">
        ✅ You're back online! Your requests are being synced.
      </div>
    );
  }

  return null;
}