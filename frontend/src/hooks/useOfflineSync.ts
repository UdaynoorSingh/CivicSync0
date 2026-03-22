import { useEffect } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { syncPendingRequests } from '../lib/syncQueue';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (isOnline) {
      syncPendingRequests();
    }
  }, [isOnline]);
}