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
export const RESERVATION_HOURS = 24;
export const TERMS_VERSION = "2026-11-13-v2";
export const DEFAULT_DRAW_ID = "principal";

export type Plan = "contado" | "dos-cuotas" | "tres-cuotas";
export type SelectionMode = "manual" | "automatic";
export type Method = "Bre-B" | "Nequi" | "Bancolombia" | "DaviPlata" | "PSE" | "Efectivo";
export type PaymentStatus = "pendiente" | "aprobado" | "rechazado";
export type OpportunityStatus = "pendiente" | "financiada" | "pagada" | "vencida";
export type Draw = { id: string; title: string; prize: string; description: string; enabled: boolean; createdAt: string };
export const DEFAULT_DRAW: Draw = { id: DEFAULT_DRAW_ID, title: "Edición iPhone 18", prize: "iPhone 18", description: "Una oportunidad, cincuenta números.", enabled: true, createdAt: "2026-11-13T00:00:00.000Z" };
export type DrawMilestone = { soldOutAt: string | null; deadlineAt: string | null; drawDate: string | null };
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
  drawId?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
  reservationExpiresAt?: string;
  expiredAt?: string;
  previousSelected?: string[];
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
  draws?: Draw[];
  drawMilestones?: Record<string, DrawMilestone>;
};

export const EMPTY_STATE: DemoState = {
  opportunities: [],
  reports: [],
  soldOutAt: null,
  deadlineAt: null,
  drawDate: null,
  draws: [DEFAULT_DRAW],
  drawMilestones: {},
};

export function normalizeNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[0-9]{1,4}$/.test(trimmed)) return null;
  return trimmed.padStart(4, "0");
}

export function drawCatalog(state: DemoState): Draw[] {
  return state.draws?.length ? state.draws : [DEFAULT_DRAW];
}
export function findDraw(state: DemoState, id: string): Draw | undefined {
  return drawCatalog(state).find((draw) => draw.id === id);
}
export function drawIdOf(order: Opportunity): string {
  return order.drawId || DEFAULT_DRAW_ID;
}
export function isReservationExpired(order: Opportunity, now = new Date()): boolean {
  if (order.paid > 0 || order.status === "pagada" || order.status === "financiada") return false;
  if (order.status === "vencida" || order.expiredAt) return true;
  const expiresAt = order.reservationExpiresAt ||
    new Date(new Date(order.createdAt).getTime() + RESERVATION_HOURS * 3_600_000).toISOString();
  return Number.isFinite(new Date(expiresAt).getTime()) && now.getTime() >= new Date(expiresAt).getTime();
}
export function activeOrders(state: DemoState, drawId = DEFAULT_DRAW_ID, now = new Date()): Opportunity[] {
  return state.opportunities.filter((order) => drawIdOf(order) === drawId && !isReservationExpired(order, now));
}
export function reservedNumbers(state: DemoState, drawId = DEFAULT_DRAW_ID, now = new Date()): Set<string> {
  return new Set(activeOrders(state, drawId, now).flatMap((o) => [...o.selected, ...o.random]));
}
export function previousNumberAvailability(state: DemoState, orderId: string, now = new Date()): { available: string[]; taken: string[] } {
  const order = state.opportunities.find((o) => o.id === orderId);
  if (!order || !isReservationExpired(order, now)) throw new Error("La reserva no está vencida.");
  const taken = reservedNumbers(state, drawIdOf(order), now);
  return { available: order.selected.filter((n) => !taken.has(n)), taken: order.selected.filter((n) => taken.has(n)) };
}
export function createDraw(state: DemoState, input: { title: string; prize: string; description: string }, id: string, now = new Date()): DemoState {
  const title = input.title.trim(), prize = input.prize.trim(), description = input.description.trim();
  if (title.length < 5 || title.length > 90 || prize.length < 2 || prize.length > 90 || description.length > 200) {
    throw new Error("Revisa el nombre, premio y descripción de la edición.");
  }
  if (findDraw(state, id)) throw new Error("Ya existe esa edición.");
  return { ...state, draws: [...drawCatalog(state), { id, title, prize, description, enabled: false, createdAt: now.toISOString() }] };
}
/** Solo edita textos del catálogo local; la identidad del sorteo y sus órdenes permanecen intactas. */
export function updateDrawDetails(
  state: DemoState, id: string, input: { title: string; prize: string; description: string },
): DemoState {
  if (!findDraw(state, id)) throw new Error("Edición no encontrada.");
  const title = input.title.trim(), prize = input.prize.trim(), description = input.description.trim();
  if (title.length < 5 || title.length > 90 || prize.length < 2 || prize.length > 90 || description.length > 200) {
    throw new Error("Revisa el nombre, premio y descripción de la edición.");
  }
  return { ...state, draws: drawCatalog(state).map((draw) =>
    draw.id === id ? { ...draw, title, prize, description } : draw) };
}
export function setDrawEnabled(state: DemoState, id: string, enabled: boolean): DemoState {
  if (!findDraw(state, id)) throw new Error("Edición no encontrada.");
  return { ...state, draws: drawCatalog(state).map((draw) => draw.id === id ? { ...draw, enabled } : draw) };
}

/** Selección sin duplicados dentro de un mismo sorteo de prueba. */
function drawAvailableNumbers(state: DemoState, count: number, rng: () => number, drawId = DEFAULT_DRAW_ID, now = new Date()): string[] {
  const taken = reservedNumbers(state, drawId, now);
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
  return !isReservationExpired(order) && order.status === "pagada" &&
    order.paid === PRICE &&
    order.selected.length === CUSTOM_NUMBERS &&
    order.random.length === RANDOM_NUMBERS;
}

export function assignedCount(order: Opportunity): number {
  if (isReservationExpired(order)) return 0;
  return order.paid >= 10_000 ? CUSTOM_NUMBERS + order.random.length : 0;
}

export function milestoneOf(state: DemoState, drawId = DEFAULT_DRAW_ID): DrawMilestone {
  if (drawId === DEFAULT_DRAW_ID) return { soldOutAt: state.soldOutAt, deadlineAt: state.deadlineAt, drawDate: state.drawDate };
  return state.drawMilestones?.[drawId] ?? { soldOutAt: null, deadlineAt: null, drawDate: null };
}
function updateMilestone(state: DemoState, drawId: string, milestone: DrawMilestone): DemoState {
  if (drawId === DEFAULT_DRAW_ID) return { ...state, ...milestone };
  return { ...state, drawMilestones: { ...state.drawMilestones, [drawId]: milestone } };
}
export function phaseOf(state: DemoState, now = new Date(), drawId = DEFAULT_DRAW_ID): Phase {
  const orders = activeOrders(state, drawId, now);
  if (orders.length < MAX_OPPORTUNITIES) return "venta";
  if (orders.every(isEligible)) return "listo";
  const { deadlineAt } = milestoneOf(state, drawId);
  if (deadlineAt && now.getTime() > new Date(deadlineAt).getTime()) return "revision";
  return "cobranza";
}
/** Libera reservas iniciales sin abonos aprobados. Los abonos parciales confirmados NO caducan automáticamente. */
export function expireUnpaidReservations(state: DemoState, now = new Date()): DemoState {
  const expiredIds = new Set(state.opportunities.filter((o) => isReservationExpired(o, now) && o.status !== "vencida").map((o) => o.id));
  if (expiredIds.size === 0) return state;
  let next: DemoState = {
    ...state,
    opportunities: state.opportunities.map((o) => expiredIds.has(o.id) ? { ...o, status: "vencida" as OpportunityStatus, expiredAt: now.toISOString() } : o),
    reports: state.reports.map((r) => expiredIds.has(r.orderId) && r.status === "pendiente"
      ? { ...r, status: "rechazado" as PaymentStatus, reviewedAt: now.toISOString() } : r),
  };
  for (const drawId of new Set(next.opportunities.filter((o) => expiredIds.has(o.id)).map(drawIdOf))) {
    if (activeOrders(next, drawId, now).length < MAX_OPPORTUNITIES) {
      next = updateMilestone(next, drawId, { soldOutAt: null, deadlineAt: null, drawDate: null });
    }
  }
  return next;
}
export function renewExpiredOpportunity(
  state: DemoState, orderId: string, selected: string[], termsAccepted: boolean, now = new Date(),
): DemoState {
  const order = state.opportunities.find((o) => o.id === orderId);
  if (!order || !isReservationExpired(order, now) || order.paid !== 0) throw new Error("Solo puedes renovar una reserva vencida sin abonos aprobados.");
  if (!findDraw(state, drawIdOf(order))?.enabled) throw new Error("Esta edición no está habilitada.");
  if (!termsAccepted) throw new Error("Debes aceptar las reglas antes de renovar.");
  const normalized = selected.map(normalizeNumber);
  if (normalized.length !== CUSTOM_NUMBERS || normalized.some((n) => n === null) || new Set(normalized).size !== CUSTOM_NUMBERS) {
    throw new Error("Debes completar diez números distintos.");
  }
  const taken = reservedNumbers(state, drawIdOf(order), now);
  if (normalized.some((n) => taken.has(n!))) throw new Error("Algunos números ya están ocupados. Escoge reemplazos.");
  if (activeOrders(state, drawIdOf(order), now).length >= MAX_OPPORTUNITIES) throw new Error("El cupo de la edición ya está completo.");
  const opportunities = state.opportunities.map((o) => o.id !== orderId ? o : ({
    ...o, previousSelected: [...o.selected], selected: normalized as string[], selectionMode: "manual" as SelectionMode,
    status: "pendiente" as OpportunityStatus, expiredAt: undefined,
    createdAt: now.toISOString(), reservationExpiresAt: new Date(now.getTime() + RESERVATION_HOURS * 3_600_000).toISOString(),
    termsAcceptedAt: now.toISOString(), termsVersion: TERMS_VERSION,
  }));
  return { ...state, opportunities };
}

/**
 * Porcentaje de oportunidades COLOCADAS, no de pagos completados.
 * Solo cuenta órdenes de este navegador en la demo; no son ventas globales.
 */
/** Conteos separados, auditables y sin avance ficticio. "Separadas" incluye las que tienen abonos parciales. */
export function drawProgress(state: DemoState, drawId = DEFAULT_DRAW_ID, now = new Date()) {
  const orders = activeOrders(state, drawId, now);
  const paid = orders.filter((order) => isEligible(order)).length;
  const withPartialPayment = orders.filter((order) => order.paid > 0 && !isEligible(order)).length;
  const reservedWithoutPayment = orders.length - paid - withPartialPayment;
  return {
    total: MAX_OPPORTUNITIES,
    occupied: orders.length,
    paid,
    withPartialPayment,
    reservedWithoutPayment,
    separated: orders.length - paid,
    occupiedPercent: Math.min(100, orders.length / MAX_OPPORTUNITIES * 100),
    paidPercent: Math.min(100, paid / MAX_OPPORTUNITIES * 100),
  };
}

export function salesProgressPercent(state: DemoState, drawId = DEFAULT_DRAW_ID, now = new Date()): number {
  return drawProgress(state, drawId, now).occupiedPercent;
}

export type SalesUpdate = { threshold: number; title: string; message: string };
export const SALES_MILESTONES: readonly SalesUpdate[] = [
  { threshold: 25, title: "Primer avance importante", message: "La colocación simulada llegó al 25 %. El proceso continúa." },
  { threshold: 50, title: "Mitad del recorrido", message: "La colocación simulada llegó al 50 %. Sigue pendiente completar el cupo." },
  { threshold: 75, title: "Entramos en la recta final", message: "La colocación simulada llegó al 75 %. Sigue atento a las próximas novedades." },
  { threshold: 90, title: "Cerca de completar la colocación", message: "La colocación simulada llegó al 90 %. La fecha del sorteo todavía no está confirmada." },
  { threshold: 100, title: "Colocación completada", message: "La colocación simulada llegó al 100 %. Antes de cualquier sorteo deben revisarse los pagos y el reglamento." },
];

export function reachedSalesUpdates(state: DemoState, drawId = DEFAULT_DRAW_ID): SalesUpdate[] {
  const progress = salesProgressPercent(state, drawId);
  return SALES_MILESTONES.filter((item) => progress >= item.threshold).reverse();
}

export function salesProgressStatus(state: DemoState, now = new Date(), drawId = DEFAULT_DRAW_ID): { title: string; message: string } {
  const progress = salesProgressPercent(state, drawId, now);
  if (progress === 100) {
    const phase = phaseOf(state, now, drawId);
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
  input: { customer: Customer; selected: string[]; plan: Plan; selectionMode?: SelectionMode; drawId?: string; termsAccepted?: boolean },
  id: string,
  now = new Date(),
  rng: () => number = Math.random,
): DemoState {
  const drawId = input.drawId || DEFAULT_DRAW_ID;
  if (!findDraw(state, drawId)?.enabled) throw new Error("La edición no está habilitada.");
  if (!input.termsAccepted) throw new Error("Debes aceptar las reglas para reservar.");
  if (activeOrders(state, drawId, now).length >= MAX_OPPORTUNITIES) throw new Error("No quedan oportunidades disponibles.");
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
    selected = drawAvailableNumbers(state, CUSTOM_NUMBERS, rng, drawId, now);
  } else {
    if (input.selected.length !== CUSTOM_NUMBERS) throw new Error("Debes elegir exactamente 10 números.");
    const normalized = input.selected.map(normalizeNumber);
    if (normalized.some((n) => n === null)) throw new Error("Los números deben tener de una a cuatro cifras.");
    selected = normalized as string[];
    if (new Set(selected).size !== CUSTOM_NUMBERS) throw new Error("No puedes repetir números.");
    const taken = reservedNumbers(state, drawId, now);
    if (selected.some((n) => taken.has(n))) throw new Error("Alguno de tus números ya está reservado.");
  }
  if (!["contado", "dos-cuotas", "tres-cuotas"].includes(input.plan)) throw new Error("Plan no válido.");
  const opportunity: Opportunity = {
    id, customer: { name, phone, email: input.customer.email.trim() },
    selected, selectionMode, drawId, random: [], paid: 0, plan: input.plan, status: "pendiente",
    termsAcceptedAt: now.toISOString(), termsVersion: TERMS_VERSION,
    reservationExpiresAt: new Date(now.getTime() + RESERVATION_HOURS * 3_600_000).toISOString(),
    createdAt: now.toISOString(),
  };
  let next: DemoState = { ...state, opportunities: [...state.opportunities, opportunity] };
  if (activeOrders(next, drawId, now).length === MAX_OPPORTUNITIES) {
    next = updateMilestone(next, drawId, {
      soldOutAt: now.toISOString(), deadlineAt: new Date(now.getTime() + 7 * 86_400_000).toISOString(), drawDate: null,
    });
  }
  return next;
}

export function reportPayment(
  state: DemoState,
  input: { orderId: string; amount: number; method: Method; reference: string },
  id: string,
  now = new Date(),
): DemoState {
  const order = state.opportunities.find((o) => o.id === input.orderId);
  if (!order) throw new Error("No se encontró la oportunidad.");
  if (isReservationExpired(order, now)) throw new Error("La reserva venció. Renueva tus números antes de reportar el pago.");
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
  if (!["Bre-B", "Nequi", "Bancolombia", "DaviPlata", "PSE", "Efectivo"].includes(input.method)) throw new Error("Método no válido.");
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
  if (isReservationExpired(order, now)) throw new Error("La reserva venció. No se puede aprobar este reporte; requiere conciliación manual.");
  const paid = order.paid + report.amount;
  if (paid > PRICE) throw new Error("El abono excede el valor de la oportunidad.");
  const targetRandom = Math.max(0, Math.min(RANDOM_NUMBERS, Math.floor(paid / COP_PER_NUMBER) - CUSTOM_NUMBERS));
  const required = targetRandom - order.random.length;
  if (required < 0) throw new Error("Inconsistencia en asignaciones anteriores.");
  const newRandom = drawAvailableNumbers(state, required, rng, drawIdOf(order), now);
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

export function setDrawDate(state: DemoState, value: string, drawId = DEFAULT_DRAW_ID): DemoState {
  if (phaseOf(state, new Date(), drawId) !== "listo") throw new Error("La edición aún no está lista: faltan oportunidades completamente pagadas.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(value + "T12:00:00").getTime())) {
    throw new Error("Fecha no válida.");
  }
  // Fecha informativa. La fecha oficial debe validarse con la Lotería de Medellín.
  return updateMilestone(state, drawId, { ...milestoneOf(state, drawId), drawDate: value });
}

export function money(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
