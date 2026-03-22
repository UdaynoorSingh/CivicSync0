import { create } from "zustand";
import * as api from "../lib/api";
import { useSessionStore } from "./sessionStore";

export interface Notification {
  id: string;
  type: string; // "announcement" | "outage" | "reminder" | "emergency" | string
  title: string;
  body: string;
  date: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  
  // For admins
  addNotification: (n: Omit<Notification, "id" | "read" | "date">) => Promise<void>;
}

const mapApiNotification = (n: api.ApiNotification, userId?: string): Notification => ({
  id: n._id,
  type: n.type,
  title: n.title,
  body: n.body,
  date: new Date(n.createdAt).toISOString().split("T")[0],
  read: userId ? n.readBy.some(r => r.userId === userId) : false,
});

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { role, user } = useSessionStore.getState();
      const userId = user?.id;
      
      let res;
      if (role === "admin" || role === "superadmin" || role === "head_admin") {
         res = await api.getAdminNotifications();
      } else {
         res = await api.getNotifications();
      }
      
      const mapped = res.notifications.map(n => mapApiNotification(n, userId));
      set({
        notifications: mapped,
        unreadCount: mapped.filter((n) => !n.read).length,
      });
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      set({ loading: false });
    }
  },

  markRead: async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      const updated = get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      set({
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      });
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  },

  markAllRead: async () => {
    try {
      await api.markAllNotificationsAsRead();
      set({
        notifications: get().notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      });
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  },
  
  deleteNotification: async (id: string) => {
    try {
      await api.deleteNotification(id);
      const updated = get().notifications.filter((n) => n.id !== id);
      set({
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      });
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  },
  
  deleteAllNotifications: async () => {
    try {
      await api.deleteAllNotifications();
      set({
        notifications: [],
        unreadCount: 0,
      });
    } catch (err) {
      console.error("Failed to delete all notifications", err);
    }
  },

  addNotification: async (n) => {
    try {
      const res = await api.pushNotification({
        title: n.title,
        body: n.body,
        type: n.type,
      });
      const { user } = useSessionStore.getState();
      const newN = mapApiNotification(res.notification, user?.id);
      
      const updated = [newN, ...get().notifications];
      set({
        notifications: updated,
        unreadCount: updated.filter((x) => !x.read).length,
      });
    } catch (err) {
      console.error("Failed to push notification", err);
    }
  },
}));
