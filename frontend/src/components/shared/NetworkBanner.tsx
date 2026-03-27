import { useState, useEffect, useRef } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useOfflineSync } from "../../hooks/useOfflineSync";

export default function NetworkBanner() {
  const isOnline = useOnlineStatus();
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const wasOffline = useRef(false);

  useOfflineSync();

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
    } else if (wasOffline.current) {
      wasOffline.current = false;
      setShowOnlineBanner(true);
      const timer = setTimeout(() => setShowOnlineBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 z-50 text-sm font-bold shadow-md">
        You are offline. Features are running in offline mode. Requests will be saved and synced automatically when internet is restored.
      </div>
    );
  }

  if (showOnlineBanner) {
    return (
      <div className="fixed top-0 left-0 w-full bg-green-600 text-white text-center py-2 z-50 text-sm font-bold shadow-md animate-pulse">
        ✅ You're back online! Your requests are being synced.
      </div>
    );
  }

  return null;
}