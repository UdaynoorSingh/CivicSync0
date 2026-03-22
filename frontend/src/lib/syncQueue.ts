import { getPendingRequests, removePendingRequest } from './db';

let isSyncing = false;

export const syncPendingRequests = async () => {
  if (isSyncing || !navigator.onLine) return;
  
  isSyncing = true;
  const requests = await getPendingRequests();

  for (const req of requests) {
    try {
      const token = window.localStorage.getItem("authToken") || '';

      const headers: Record<string, string> = {
        ...req.headers,
        'x-idempotency-key': req.id,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let body: BodyInit;

      if (req.type === 'complaint' || req.type === 'service') {
        const formData = new FormData();
        
        for (const key in req.body) {
          if (req.body[key] !== undefined && req.body[key] !== null) {
            formData.append(key, req.body[key]);
          }
        }
        body = formData;
        
        delete headers['Content-Type']; 
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(req.body);
      }

      const response = await fetch(req.url, {
        method: req.method,
        headers,
        body,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error(`Backend rejected sync for ${req.id}:`, errData);
        throw new Error(`HTTP Error: ${response.status}`);
      }

      await removePendingRequest(req.id);
      console.log(`✅ Successfully synced offline request: ${req.id}`);

    } catch (error) {
      console.error(`❌ Failed to sync request ${req.id}:`, error);
      break; 
    }
  }
  isSyncing = false;
};