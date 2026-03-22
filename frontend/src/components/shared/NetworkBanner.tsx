import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export default function NetworkBanner() {
  const isOnline = useOnlineStatus();
  useOfflineSync();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 z-50 text-sm font-bold shadow-md">
      You are offline. Features are running in offline mode. Requests will be saved and synced automatically when internet is restored.
    </div>
  );
}