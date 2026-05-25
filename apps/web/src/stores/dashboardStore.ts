import { create } from "zustand";
import type { DashboardPayload, RuntimeLogEntry } from "../types/taskbandit";

interface DashboardStore {
  payload: DashboardPayload | null;
  runtimeLogs: RuntimeLogEntry[];
  isLoading: boolean;
  setPayload: (payload: DashboardPayload | null) => void;
  updatePayload: (updater: (current: DashboardPayload) => DashboardPayload) => void;
  setRuntimeLogs: (logs: RuntimeLogEntry[]) => void;
  setIsLoading: (loading: boolean) => void;
  clearDashboard: () => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  payload: null,
  runtimeLogs: [],
  isLoading: false,

  setPayload: (payload) => set({ payload }),

  updatePayload: (updater) => {
    const current = get().payload;
    if (current) {
      set({ payload: updater(current) });
    }
  },

  setRuntimeLogs: (runtimeLogs) => set({ runtimeLogs }),

  setIsLoading: (isLoading) => set({ isLoading }),

  clearDashboard: () => set({ payload: null, runtimeLogs: [], isLoading: false }),
}));
