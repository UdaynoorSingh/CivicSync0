import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useOfflineSync } from "../../hooks/useOfflineSync"; 

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  
  useOfflineSync(); 

  if (isOnline) return null;

  return (
    <div className="bg-red-600 text-white text-center py-2 px-4 z-50 text-xs font-bold shadow-md w-full">
      You are currently offline. Requests will be saved and synced automatically when internet is restored.
    </div>
  );
}