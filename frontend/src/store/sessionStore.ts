import { create } from "zustand";
import * as api from "../lib/api";

export type Language = "en" | "hi" | "as";
export type UserRole =
  | "citizen"
  | "admin"
  | "superadmin"
  | "head_admin"
  | "guest";

interface SessionUser {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  username?: string;
  role?: UserRole;
  district?: string;
  districtName?: string;
  department?: unknown;
  preferredLanguage?: string;
  address?: {
    houseNo?: string;
    street?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  createdAt?: string;
}

interface SessionState {
  isAuthenticated: boolean;
  sessionReady: boolean;
  role: UserRole;
  user: SessionUser | null;
  language: Language;

  setCitizenSession: (user: SessionUser) => void;
  setAdminSession: (user: SessionUser) => void;
  setHeadAdminSession: (user: SessionUser) => void;

  loginGuest: () => void;
  initializeSession: () => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: Language) => void;
  updateUser: (patch: Partial<SessionUser>) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isAuthenticated: false,
  sessionReady: false,
  role: "guest",
  user: null,
  language: "en",

  setCitizenSession: (user: SessionUser) => {
    set({ isAuthenticated: true, role: "citizen", user });
  },

  setAdminSession: (user: SessionUser) => {
    set({
      isAuthenticated: true,
      role: user.role === "superadmin" ? "superadmin" : "admin",
      user,
    });
  },

  setHeadAdminSession: (user: SessionUser) => {
    set({ isAuthenticated: true, role: "head_admin", user });
  },

  loginGuest: () => {
    set({
      isAuthenticated: true,
      sessionReady: true,
      role: "guest",
      user: null,
    });
  },

  initializeSession: async () => {
    if (get().sessionReady) return;

    const tryAdmin = async (): Promise<boolean> => {
      try {
        const res = await api.adminGetMe();
        const admin = res.admin;
        set({
          isAuthenticated: true,
          sessionReady: true,
          role: admin.role === "superadmin" ? "superadmin" : "admin",
          user: {
            id: admin.id ?? admin._id ?? "",
            name: admin.name,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            district:
              typeof admin.district === "string"
                ? admin.district
                : (admin.district?._id ?? admin.district?.id),
            department: admin.department,
          },
        });
        return true;
      } catch {
        return false;
      }
    };

    const tryHeadAdmin = async (): Promise<boolean> => {
      try {
        const res = await api.headAdminGetMe();
        set({
          isAuthenticated: true,
          sessionReady: true,
          role: "head_admin",
          user: {
            id: res.admin.id,
            name: res.admin.name,
            mobile: res.admin.mobile,
            role: "head_admin",
          },
        });
        return true;
      } catch {
        return false;
      }
    };

    const tryCitizen = async (): Promise<boolean> => {
      try {
        const res = await api.getMe();
        const user = res.user as {
          _id?: string;
          id?: string;
          name: string;
          mobile: string;
          preferredLanguage?: string;
          district?:
            | { _id?: string; id?: string; name?: string; state?: string }
            | string;
          address?: {
            houseNo?: string;
            street?: string;
            landmark?: string;
            city?: string;
            state?: string;
            pincode?: string;
          };
          createdAt?: string;
        };
        const districtObj =
          typeof user.district === "object" && user.district !== null
            ? user.district
            : null;
        set({
          isAuthenticated: true,
          sessionReady: true,
          role: "citizen",
          user: {
            id: user.id ?? user._id ?? "",
            name: user.name,
            mobile: user.mobile,
            preferredLanguage: user.preferredLanguage,
            district:
              typeof user.district === "string"
                ? user.district
                : (districtObj?._id ?? districtObj?.id),
            districtName: districtObj?.name,
            address: user.address,
            createdAt: user.createdAt,
          },
        });
        return true;
      } catch {
        return false;
      }
    };

    const storedToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem("authToken")
        : null;
    let roleHint: UserRole | null = null;

    if (storedToken) {
      try {
        const payloadPart = storedToken.split(".")[1];
        if (payloadPart) {
          const payloadJson = atob(
            payloadPart.replace(/-/g, "+").replace(/_/g, "/"),
          );
          const payload = JSON.parse(payloadJson) as { role?: UserRole };
          roleHint = payload.role ?? null;
        }
      } catch {
        roleHint = null;
      }
    }

    const order: Array<() => Promise<boolean>> =
      roleHint === "head_admin"
        ? [tryHeadAdmin, tryAdmin, tryCitizen]
        : roleHint === "admin" || roleHint === "superadmin"
          ? [tryAdmin, tryHeadAdmin, tryCitizen]
          : roleHint === "citizen"
            ? [tryCitizen, tryAdmin, tryHeadAdmin]
            : [tryAdmin, tryHeadAdmin, tryCitizen];

    for (const fn of order) {
      // eslint-disable-next-line no-await-in-loop
      if (await fn()) return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("authToken");
    }
    set({
      isAuthenticated: false,
      sessionReady: true,
      role: "guest",
      user: null,
    });
  },

  logout: async () => {
    try {
      const { role } = get();
      if (role === "admin" || role === "superadmin") {
        await api.adminLogout();
      } else if (role === "head_admin") {
        await api.headAdminLogout();
      } else {
        await api.logout();
      }
    } catch {
      // Always clear local state even if API call fails
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("authToken");
    }
    set({
      isAuthenticated: false,
      sessionReady: true,
      role: "guest",
      user: null,
    });
  },

  setLanguage: (lang: Language) => set({ language: lang }),

  updateUser: (patch: Partial<SessionUser>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : state.user,
      // Keep the app language in sync with preferredLanguage if it changed
      ...(patch.preferredLanguage
        ? { language: patch.preferredLanguage as Language }
        : {}),
    })),
}));
