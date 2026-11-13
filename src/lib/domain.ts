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
export type SelectionMode = "manual" | "automatic";
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
  selectionMode?: SelectionMode; // Opcional para conservar órdenes demo antiguas.
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

/** Selección sin duplicados dentro de una sola simulación local. */
function drawAvailableNumbers(state: DemoState, count: number, rng: () => number): string[] {
  const taken = reservedNumbers(state);
  const available: string[] = [];
  for (let i = 0; i < TOTAL_NUMBERS; i++) {
    const number = String(i).padStart(4, "0");
    if (!taken.has(number)) available.push(number);
  }
  if (available.length < count) throw new Error("No quedan suficientes números únicos disponibles.");
  const drawn: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomValue = rng();
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
      throw new Error("Generador aleatorio no válido.");
    }
    const index = Math.floor(randomValue * available.length);
    drawn.push(available[index]);
    available.splice(index, 1);
  }
  return drawn;
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

/**
 * Porcentaje de oportunidades COLOCADAS, no de pagos completados.
 * Solo cuenta órdenes de este navegador en la demo; no son ventas globales.
 */
export function salesProgressPercent(state: DemoState): number {
  return Math.min(100, Math.max(0, state.opportunities.length / MAX_OPPORTUNITIES * 100));
}

export type SalesUpdate = { threshold: number; title: string; message: string };
export const SALES_MILESTONES: readonly SalesUpdate[] = [
  { threshold: 25, title: "Primer avance importante", message: "La colocación simulada llegó al 25 %. El proceso continúa." },
  { threshold: 50, title: "Mitad del recorrido", message: "La colocación simulada llegó al 50 %. Sigue pendiente completar el cupo." },
  { threshold: 75, title: "Entramos en la recta final", message: "La colocación simulada llegó al 75 %. Sigue atento a las próximas novedades." },
  { threshold: 90, title: "Cerca de completar la colocación", message: "La colocación simulada llegó al 90 %. La fecha del sorteo todavía no está confirmada." },
  { threshold: 100, title: "Colocación completada", message: "La colocación simulada llegó al 100 %. Antes de cualquier sorteo deben revisarse los pagos y el reglamento." },
];

export function reachedSalesUpdates(state: DemoState): SalesUpdate[] {
  const progress = salesProgressPercent(state);
  return SALES_MILESTONES.filter((item) => progress >= item.threshold).reverse();
}

export function salesProgressStatus(state: DemoState, now = new Date()): { title: string; message: string } {
  const progress = salesProgressPercent(state);
  if (progress === 100) {
    const phase = phaseOf(state, now);
    if (phase === "listo") return {
      title: "Colocación y pagos completados en la demo",
      message: "La fecha y las condiciones del sorteo requieren confirmación y autorización. No hay sorteo real programado.",
    };
    if (phase === "revision") return {
      title: "Cierre en revisión",
      message: "Terminó el plazo simulado de cobranza con saldos pendientes. No se anunciará un sorteo sin resolverlos.",
    };
    return {
      title: "Colocación completada; faltan pagos",
      message: "Se abrió el plazo simulado de hasta siete días para completar abonos. El sorteo aún no tiene fecha confirmada.",
    };
  }
  if (progress >= 90) return { title: "Muy cerca de completar la colocación", message: "El avance es alto, pero aún faltan oportunidades y no hay fecha de sorteo confirmada." };
  if (progress >= 75) return { title: "Estamos en la recta final", message: "La colocación sigue avanzando. Revisa tus abonos para mantener tu oportunidad al día." };
  if (progress >= 50) return { title: "Ya se alcanzó la mitad", message: "Continúa el proceso de colocación. El sorteo solo podrá definirse según las condiciones autorizadas." };
  if (progress >= 25) return { title: "La colocación está avanzando", message: "Aquí verás nuevas actualizaciones conforme aumente el porcentaje." };
  return { title: "La colocación está comenzando", message: "Aquí aparecerán novedades al alcanzar nuevos porcentajes de avance." };
}

export function createOpportunity(
  state: DemoState,
  input: { customer: Customer; selected: string[]; plan: Plan; selectionMode?: SelectionMode },
  id: string,
  now = new Date(),
  rng: () => number = Math.random,
): DemoState {
  if (state.opportunities.length >= MAX_OPPORTUNITIES) throw new Error("No quedan oportunidades disponibles.");
  const name = input.customer.name.trim();
  const phone = input.customer.phone.replace(/\s/g, "");
  if (name.length < 3 || !/^\+?[0-9]{7,15}$/.test(phone)) {
    throw new Error("Ingresa nombre y celular válidos.");
  }
  const selectionMode = input.selectionMode ?? "manual";
  if (selectionMode !== "manual" && selectionMode !== "automatic") throw new Error("Modo de selección no válido.");
  let selected: string[];
  if (selectionMode === "automatic") {
    if (input.selected.length > 0) throw new Error("La asignación automática no admite números escogidos manualmente.");
    selected = drawAvailableNumbers(state, CUSTOM_NUMBERS, rng);
  } else {
    if (input.selected.length !== CUSTOM_NUMBERS) throw new Error("Debes elegir exactamente 10 números.");
    const normalized = input.selected.map(normalizeNumber);
    if (normalized.some((n) => n === null)) throw new Error("Los números deben tener de una a cuatro cifras.");
    selected = normalized as string[];
    if (new Set(selected).size !== CUSTOM_NUMBERS) throw new Error("No puedes repetir números.");
    const taken = reservedNumbers(state);
    if (selected.some((n) => taken.has(n))) throw new Error("Alguno de tus números ya está reservado.");
  }
  if (!["contado", "dos-cuotas", "tres-cuotas"].includes(input.plan)) throw new Error("Plan no válido.");
  const opportunity: Opportunity = {
    id, customer: { name, phone, email: input.customer.email.trim() },
    selected, selectionMode, random: [], paid: 0, plan: input.plan, status: "pendiente",
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
  const newRandom = drawAvailableNumbers(state, required, rng);
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
