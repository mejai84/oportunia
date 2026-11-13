"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { EMPTY_STATE, approvePayment, createOpportunity, rejectPayment, reportPayment, setDrawDate, type Customer, type DemoState, type Method, type Plan } from "@/lib/domain";

const KEY = "oportunia-demo-v1";
type Context = {
  state: DemoState; hydrated: boolean;
  createOrder: (input: { customer: Customer; selected: string[]; plan: Plan }) => string;
  sendPayment: (input: { orderId: string; amount: number; method: Method; reference: string }) => void;
  approve: (id: string) => void; reject: (id: string) => void;
  schedule: (date: string) => void; reset: () => void;
};
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (data && typeof data === "object" && "opportunities" in data && Array.isArray(data.opportunities)
          && "reports" in data && Array.isArray(data.reports)) setState(data as DemoState);
      }
    } catch { /* localStorage corrupto */ }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, hydrated]);
  const createOrder: Context["createOrder"] = (input) => {
    const id = crypto.randomUUID();
    setState(createOpportunity(state, input, id));
    return id;
  };
  const sendPayment: Context["sendPayment"] = (input) => setState(reportPayment(state, input, crypto.randomUUID()));
  const approve = (id: string) => setState(approvePayment(state, id));
  const reject = (id: string) => setState(rejectPayment(state, id));
  const schedule = (date: string) => setState(setDrawDate(state, date));
  const reset = () => setState(EMPTY_STATE);
  return <AppContext.Provider value={{ state, hydrated, createOrder, sendPayment, approve, reject, schedule, reset }}>{children}</AppContext.Provider>;
}
export function useApp(): Context {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppProvider no disponible");
  return ctx;
}
