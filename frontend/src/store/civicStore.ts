import { create } from "zustand";
import {
  dummyComplaints,
  type Complaint,
  type ComplaintStatus,
} from "../data/dummyData";
import {
  dummyServiceRequests,
  type ServiceRequest,
  type SRStatus,
} from "../data/dummyData";

interface CivicState {
  complaints: Complaint[];
  serviceRequests: ServiceRequest[];
  updateComplaintStatus: (id: string, status: ComplaintStatus) => void;
  addComplaint: (
    c: Omit<
      Complaint,
      | "id"
      | "refNo"
      | "date"
      | "citizen"
      | "phone"
      | "estimatedResolution"
      | "status"
    >,
  ) => string;
  updateSRStatus: (id: string, status: SRStatus) => void;
  addServiceRequest: (
    sr: Omit<
      ServiceRequest,
      "id" | "refNo" | "date" | "status" | "estimatedCompletion"
    >,
  ) => string;
}

export const useCivicStore = create<CivicState>((set, get) => ({
  complaints: dummyComplaints,
  serviceRequests: dummyServiceRequests,

  updateComplaintStatus: (id, status) =>
    set({
      complaints: get().complaints.map((c) =>
        c.id === id ? { ...c, status } : c,
      ),
    }),

  addComplaint: (c) => {
    const refNo = `CMP-2026-${String(Math.floor(Math.random() * 900) + 100).padStart(4, "0")}`;
    const newC: Complaint = {
      ...c,
      id: `c${Date.now()}`,
      refNo,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      citizen: "Citizen User",
      phone: "+919876545678",
      estimatedResolution: new Date(Date.now() + 14 * 86400000)
        .toISOString()
        .split("T")[0],
    };
    set({ complaints: [newC, ...get().complaints] });
    return refNo;
  },

  updateSRStatus: (id, status) =>
    set({
      serviceRequests: get().serviceRequests.map((sr) =>
        sr.id === id ? { ...sr, status } : sr,
      ),
    }),

  addServiceRequest: (sr) => {
    const refNo = `SR-2026-${String(Math.floor(Math.random() * 900) + 100).padStart(4, "0")}`;
    const newSR: ServiceRequest = {
      ...sr,
      id: `sr${Date.now()}`,
      refNo,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      estimatedCompletion: new Date(Date.now() + 21 * 86400000)
        .toISOString()
        .split("T")[0],
    };
    set({ serviceRequests: [newSR, ...get().serviceRequests] });
    return refNo;
  },
}));
