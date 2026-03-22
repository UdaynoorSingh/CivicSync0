import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

export interface PendingRequest {
  id: string; 
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body: any;
  timestamp: number;
  type: 'complaint' | 'service' | 'bill_payment';
}

interface KioskDB extends DBSchema {
  pendingRequests: {
    key: string;
    value: PendingRequest;
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<KioskDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<KioskDB>('kiosk-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('pendingRequests', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
};

export const addPendingRequest = async (request: PendingRequest) => {
  const db = await initDB();
  await db.put('pendingRequests', request);
};

export const getPendingRequests = async () => {
  const db = await initDB();
  return db.getAllFromIndex('pendingRequests', 'by-timestamp');
};

export const removePendingRequest = async (id: string) => {
  const db = await initDB();
  await db.delete('pendingRequests', id);
};