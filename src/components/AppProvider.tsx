"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { EMPTY_STATE, DEFAULT_DRAW_ID, approvePayment, createOpportunity, createDraw, updateDrawDetails, setDrawEnabled, expireUnpaidReservations, renewExpiredOpportunity, rejectPayment, reportPayment, setDrawDate, type Customer, type DemoState, type Method, type Plan, type SelectionMode } from "@/lib/domain";

const KEY = "oportunia-demo-v1";
const DRAW_KEY = "oportunia-selected-draw-v1";
type Context = {
  state: DemoState; hydrated: boolean;
  activeDrawId: string; chooseDraw: (id: string) => void;
  createOrder: (input: { customer: Customer; selected: string[]; plan: Plan; selectionMode?: SelectionMode; drawId?: string; termsAccepted: boolean }) => string;
  addDraw: (input: { title: string; prize: string; description: string }) => void;
  toggleDraw: (id: string, enabled: boolean) => void;
  editDraw: (id: string, input: { title: string; prize: string; description: string }) => void;
  renewOrder: (id: string, selected: string[], termsAccepted: boolean) => void;
  sendPayment: (input: { orderId: string; amount: number; method: Method; reference: string }) => void;
  approve: (id: string) => void; reject: (id: string) => void;
  schedule: (date: string) => void; reset: () => void;
};
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(EMPTY_STATE);
  const [activeDrawId, chooseDraw] = useState(DEFAULT_DRAW_ID);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const storedDraw = localStorage.getItem(DRAW_KEY);
      if (storedDraw) chooseDraw(storedDraw);
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (data && typeof data === "object" && "opportunities" in data && Array.isArray(data.opportunities)
          && "reports" in data && Array.isArray(data.reports)) setState(expireUnpaidReservations(data as DemoState));
      }
    } catch { /* localStorage corrupto */ }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(DRAW_KEY, activeDrawId); }, [activeDrawId, hydrated]);
  useEffect(() => {
    const interval = window.setInterval(() => setState((prev) => expireUnpaidReservations(prev)), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const createOrder: Context["createOrder"] = (input) => {
    const id = crypto.randomUUID();
    setState(createOpportunity(expireUnpaidReservations(state), input, id));
    return id;
  };
  const addDraw: Context["addDraw"] = (input) => setState((prev) => createDraw(prev, input, crypto.randomUUID()));
  const toggleDraw: Context["toggleDraw"] = (id, enabled) => setState((prev) => setDrawEnabled(prev, id, enabled));
  const editDraw: Context["editDraw"] = (id, input) => setState((prev) => updateDrawDetails(prev, id, input));
  const renewOrder: Context["renewOrder"] = (id, selected, termsAccepted) => setState((prev) =>
    renewExpiredOpportunity(expireUnpaidReservations(prev), id, selected, termsAccepted));
  const sendPayment: Context["sendPayment"] = (input) => setState(reportPayment(state, input, crypto.randomUUID()));
  const approve = (id: string) => setState(approvePayment(state, id));
  const reject = (id: string) => setState(rejectPayment(state, id));
  const schedule = (date: string) => setState(setDrawDate(state, date, activeDrawId));
  const reset = () => { setState(EMPTY_STATE); chooseDraw(DEFAULT_DRAW_ID); };
  return <AppContext.Provider value={{ state, hydrated, activeDrawId, chooseDraw, createOrder, addDraw, toggleDraw, editDraw, renewOrder, sendPayment, approve, reject, schedule, reset }}>{children}</AppContext.Provider>;
}
export function useApp(): Context {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppProvider no disponible");
  return ctx;
}
