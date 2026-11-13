/**
 * Reglas del prototipo Oportunia. No ejecutar sorteos ni pagos reales con
 * este módulo de navegador: en producción deben validarse transaccionalmente
 * en PostgreSQL y estar sujetos al reglamento autorizado.
 */
export const PRICE = 50_000;
export const MAX_OPPORTUNITIES = 200;
export const CUSTOM_NUMBERS = 10;
export const RANDOM_NUMBERS = 40;
export const TOTAL_NUMBERS = 10_000;
export const COP_PER_NUMBER = 1_000;

export type Plan = "contado" | "dos-cuotas" | "tres-cuotas";
export type Method = "Bre-B" | "Nequi" | "PSE" | "Efectivo";
export type PaymentStatus = "pendiente" | "aprobado" | "rechazado";
export type OpportunityStatus = "pendiente" | "financiada" | "pagada";
export type Phase = "venta" | "cobranza" | "revision" | "listo";

export type Customer = {
  name: string;
  phone: string;
  email: string;
};

export type Opportunity = {
  id: string;
  customer: Customer;
  selected: string[];
  random: string[];
  paid: number;
  plan: Plan;
  status: OpportunityStatus;
  createdAt: string;
};

export type PaymentReport = {
  id: string;
  orderId: string;
  amount: number;
  method: Method;
  reference: string;
  status: PaymentStatus;
  createdAt: string;
  reviewedAt?: string;
};

export type DemoState = {
  opportunities: Opportunity[];
  reports: PaymentReport[];
  soldOutAt: string | null;
  deadlineAt: string | null;
  drawDate: string | null;
};

export const EMPTY_STATE: DemoState = {
  opportunities: [],
  reports: [],
  soldOutAt: null,
  deadlineAt: null,
  drawDate: null,
};

export function normalizeNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[0-9]{1,4}$/.test(trimmed)) return null;
  return trimmed.padStart(4, "0");
}

export function reservedNumbers(state: DemoState): Set<string> {
  return new Set(state.opportunities.flatMap((o) => [...o.selected, ...o.random]));
}

export function isEligible(order: Opportunity): boolean {
  return order.status === "pagada" &&
    order.paid === PRICE &&
    order.selected.length === CUSTOM_NUMBERS &&
    order.random.length === RANDOM_NUMBERS;
}

export function assignedCount(order: Opportunity): number {
  return order.paid >= 10_000 ? CUSTOM_NUMBERS + order.random.length : 0;
}

export function phaseOf(state: DemoState, now = new Date()): Phase {
  if (state.opportunities.length < MAX_OPPORTUNITIES) return "venta";
  if (state.opportunities.every(isEligible)) return "listo";
  if (state.deadlineAt && now.getTime() > new Date(state.deadlineAt).getTime()) return "revision";
  return "cobranza";
}

export function createOpportunity(
  state: DemoState,
  input: { customer: Customer; selected: string[]; plan: Plan },
  id: string,
  now = new Date(),
): DemoState {
  if (state.opportunities.length >= MAX_OPPORTUNITIES) throw new Error("No quedan oportunidades disponibles.");
  const name = input.customer.name.trim();
  const phone = input.customer.phone.replace(/\s/g, "");
  if (name.length < 3 || !/^\+?[0-9]{7,15}$/.test(phone)) {
    throw new Error("Ingresa nombre y celular válidos.");
  }
  if (input.selected.length !== CUSTOM_NUMBERS) throw new Error("Debes elegir exactamente 10 números.");
  const normalized = input.selected.map(normalizeNumber);
  if (normalized.some((n) => n === null)) throw new Error("Los números deben tener de una a cuatro cifras.");
  const selected = normalized as string[];
  if (new Set(selected).size !== CUSTOM_NUMBERS) throw new Error("No puedes repetir números.");
  const taken = reservedNumbers(state);
  if (selected.some((n) => taken.has(n))) throw new Error("Alguno de tus números ya está reservado.");
  if (!["contado", "dos-cuotas", "tres-cuotas"].includes(input.plan)) throw new Error("Plan no válido.");
  const opportunity: Opportunity = {
    id, customer: { name, phone, email: input.customer.email.trim() },
    selected, random: [], paid: 0, plan: input.plan, status: "pendiente",
    createdAt: now.toISOString(),
  };
  const opportunities = [...state.opportunities, opportunity];
  const soldOutAt = opportunities.length === MAX_OPPORTUNITIES ? now.toISOString() : state.soldOutAt;
  const deadlineAt = opportunities.length === MAX_OPPORTUNITIES
    ? new Date(now.getTime() + 7 * 86_400_000).toISOString()
    : state.deadlineAt;
  return { ...state, opportunities, soldOutAt, deadlineAt };
}

export function reportPayment(
  state: DemoState,
  input: { orderId: string; amount: number; method: Method; reference: string },
  id: string,
  now = new Date(),
): DemoState {
  const order = state.opportunities.find((o) => o.id === input.orderId);
  if (!order) throw new Error("No se encontró la oportunidad.");
  if (order.paid >= PRICE) throw new Error("Esta oportunidad ya está completamente pagada.");
  if (!Number.isInteger(input.amount) || input.amount < COP_PER_NUMBER || input.amount % COP_PER_NUMBER !== 0) {
    throw new Error("El abono debe ser múltiplo de $1.000.");
  }
  if (order.paid === 0 && input.amount < 10_000) throw new Error("El primer abono mínimo es de $10.000.");
  const pending = state.reports
    .filter((r) => r.orderId === order.id && r.status === "pendiente")
    .reduce((sum, r) => sum + r.amount, 0);
  if (order.paid + pending + input.amount > PRICE) throw new Error("El abono supera el saldo disponible.");
  if (!input.reference.trim()) throw new Error("Indica una referencia de pago de prueba.");
  if (!["Bre-B", "Nequi", "PSE", "Efectivo"].includes(input.method)) throw new Error("Método no válido.");
  return {
    ...state,
    reports: [...state.reports, {
      id, orderId: order.id, amount: input.amount, method: input.method,
      reference: input.reference.trim(), status: "pendiente", createdAt: now.toISOString(),
    }],
  };
}

export function approvePayment(
  state: DemoState,
  reportId: string,
  rng: () => number = Math.random,
  now = new Date(),
): DemoState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report || report.status !== "pendiente") throw new Error("Reporte inexistente o ya procesado.");
  const order = state.opportunities.find((o) => o.id === report.orderId);
  if (!order) throw new Error("Oportunidad no encontrada.");
  const paid = order.paid + report.amount;
  if (paid > PRICE) throw new Error("El abono excede el valor de la oportunidad.");
  const targetRandom = Math.max(0, Math.min(RANDOM_NUMBERS, Math.floor(paid / COP_PER_NUMBER) - CUSTOM_NUMBERS));
  const required = targetRandom - order.random.length;
  if (required < 0) throw new Error("Inconsistencia en asignaciones anteriores.");
  const taken = reservedNumbers(state);
  const available: string[] = [];
  for (let i = 0; i < TOTAL_NUMBERS; i++) {
    const n = String(i).padStart(4, "0");
    if (!taken.has(n)) available.push(n);
  }
  if (available.length < required) throw new Error("No quedan suficientes números únicos para completar el abono.");
  const newRandom: string[] = [];
  for (let i = 0; i < required; i++) {
    const index = Math.min(available.length - 1, Math.max(0, Math.floor(rng() * available.length)));
    newRandom.push(available[index]);
    available.splice(index, 1);
  }
  const opportunities = state.opportunities.map((o) => o.id !== order.id ? o : {
    ...o,
    paid,
    random: [...o.random, ...newRandom],
    status: (paid === PRICE ? "pagada" : "financiada") as OpportunityStatus,
  });
  return {
    ...state,
    opportunities,
    reports: state.reports.map((r) => r.id !== reportId ? r : {
      ...r, status: "aprobado" as PaymentStatus, reviewedAt: now.toISOString(),
    }),
  };
}

export function rejectPayment(state: DemoState, reportId: string, now = new Date()): DemoState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report || report.status !== "pendiente") throw new Error("Reporte inexistente o ya procesado.");
  return {
    ...state,
    reports: state.reports.map((r) => r.id !== reportId ? r : {
      ...r, status: "rechazado" as PaymentStatus, reviewedAt: now.toISOString(),
    }),
  };
}

export function setDrawDate(state: DemoState, value: string): DemoState {
  if (phaseOf(state) !== "listo") throw new Error("El sorteo no está listo: faltan oportunidades completamente pagadas.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(value + "T12:00:00").getTime())) {
    throw new Error("Fecha no válida.");
  }
  // Fecha informativa. La fecha oficial debe validarse con la Lotería de Medellín.
  return { ...state, drawDate: value };
}

export function money(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
