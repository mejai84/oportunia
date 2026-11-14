import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_STATE, PRICE, approvePayment, assignedCount, createOpportunity,
  isEligible, normalizeNumber, phaseOf, rejectPayment, reportPayment,
  reservedNumbers, reachedSalesUpdates, salesProgressPercent, salesProgressStatus,
  createDraw, setDrawEnabled, updateDrawDetails, expireUnpaidReservations, renewExpiredOpportunity,
  previousNumberAvailability, activeOrders, isReservationExpired, drawCatalog, drawProgress,
} from "../src/lib/domain";

const customer = { name: "Cliente de prueba", phone: "3001234567", email: "" };
const selected = Array.from({ length: 10 }, (_, i) => String(i).padStart(4, "0"));
const date = new Date("2026-11-13T18:00:00.000Z");

function setup() {
  return createOpportunity(EMPTY_STATE, { customer, selected, plan: "tres-cuotas", termsAccepted: true }, "orden-1", date);
}

test("normaliza números de cuatro cifras", () => {
  assert.equal(normalizeNumber("7"), "0007");
  assert.equal(normalizeNumber("0000"), "0000");
  assert.equal(normalizeNumber("10000"), null);
  assert.equal(normalizeNumber("-1"), null);
});

test("reserva 10 números pero no habilita sin pagar", () => {
  const state = setup();
  assert.equal(state.opportunities[0].selected.length, 10);
  assert.equal(assignedCount(state.opportunities[0]), 0);
  assert.equal(isEligible(state.opportunities[0]), false);
  assert.equal(phaseOf(state), "venta");
});

test("no permite repetir números reservados", () => {
  const state = setup();
  assert.throws(() => createOpportunity(state, { customer, selected, plan: "contado", termsAccepted: true }, "orden-2", date), /reservado/);
});

test("abonos 20k, 15k, 15k asignan 20, 35 y 50; solo último habilita", () => {
  let state = setup();
  const cuotas = [20_000, 15_000, 15_000];
  const totals = [20, 35, 50];
  for (let i = 0; i < cuotas.length; i++) {
    state = reportPayment(state, { orderId: "orden-1", amount: cuotas[i], method: "Bre-B", reference: "PRUEBA-" + i }, "p-" + i, date);
    assert.equal(state.opportunities[0].paid, i === 0 ? 0 : cuotas.slice(0, i).reduce((a, b) => a + b, 0));
    state = approvePayment(state, "p-" + i, () => 0.5, date);
    assert.equal(assignedCount(state.opportunities[0]), totals[i]);
    assert.equal(isEligible(state.opportunities[0]), i === 2);
  }
  assert.equal(state.opportunities[0].paid, PRICE);
  assert.equal(state.opportunities[0].random.length, 40);
  assert.equal(reservedNumbers(state, undefined, date).size, 50);
});

test("reportes pendientes no duplican abonos ni permiten exceder el total", () => {
  let state = setup();
  state = reportPayment(state, { orderId: "orden-1", amount: 30_000, method: "PSE", reference: "a" }, "p1", date);
  assert.throws(() => reportPayment(state, { orderId: "orden-1", amount: 30_000, method: "PSE", reference: "b" }, "p2", date), /supera/);
});

test("rechazar no asigna números", () => {
  let state = setup();
  state = reportPayment(state, { orderId: "orden-1", amount: 20_000, method: "Nequi", reference: "abc" }, "p1", date);
  state = rejectPayment(state, "p1", date);
  assert.equal(state.opportunities[0].paid, 0);
  assert.equal(state.opportunities[0].random.length, 0);
  assert.throws(() => approvePayment(state, "p1"), /procesado/);
});

test("permite asignar automáticamente los primeros 10 números sin duplicarlos", () => {
  let state = setup();
  state = createOpportunity(state, {
    customer, selected: [], plan: "dos-cuotas", termsAccepted: true, selectionMode: "automatic",
  }, "orden-2", date, () => 0.5);
  const automatic = state.opportunities[1];
  assert.equal(automatic.selectionMode, "automatic");
  assert.equal(automatic.selected.length, 10);
  assert.equal(new Set(automatic.selected).size, 10);
  assert.equal(reservedNumbers(state, undefined, date).size, 20);
  assert.equal(assignedCount(automatic), 0);
  assert.equal(isEligible(automatic), false);
});

test("en asignación automática solo participan los 50 tras pagar todo", () => {
  let state = createOpportunity(EMPTY_STATE, {
    customer, selected: [], plan: "tres-cuotas", termsAccepted: true, selectionMode: "automatic",
  }, "auto-1", date, () => 0.5);
  for (const [i, amount] of [20_000, 15_000, 15_000].entries()) {
    const id = "auto-p-" + i;
    state = reportPayment(state, { orderId: "auto-1", amount, method: "PSE", reference: id }, id, date);
    state = approvePayment(state, id, () => 0.5, date);
    assert.equal(assignedCount(state.opportunities[0]), [20, 35, 50][i]);
    assert.equal(isEligible(state.opportunities[0]), i === 2);
  }
  assert.equal(reservedNumbers(state, undefined, date).size, 50);
});

test("la elección automática rechaza números manuales y generador inválido", () => {
  assert.throws(() => createOpportunity(EMPTY_STATE, {
    customer, selected, plan: "contado", termsAccepted: true, selectionMode: "automatic",
  }, "invalid", date), /no admite/);
  assert.throws(() => createOpportunity(EMPTY_STATE, {
    customer, selected: [], plan: "contado", termsAccepted: true, selectionMode: "automatic",
  }, "invalid", date, () => 1), /Generador aleatorio/);
});

test("barra de compras muestra porcentajes y comunicaciones por hitos", () => {
  assert.equal(salesProgressPercent(EMPTY_STATE), 0);
  assert.equal(reachedSalesUpdates(EMPTY_STATE).length, 0);
  const one = setup();
  assert.equal(salesProgressPercent(one, undefined, date), 0.5);
  assert.match(salesProgressStatus(one, date).title, /comenzando/);
  const at75 = { ...EMPTY_STATE, opportunities: Array(150).fill(one.opportunities[0]) };
  assert.equal(salesProgressPercent(at75, undefined, date), 75);
  assert.deepEqual(reachedSalesUpdates(at75, undefined).map((item) => item.threshold), [75, 50, 25]);
  const all = { ...EMPTY_STATE, opportunities: Array(200).fill(one.opportunities[0]), deadlineAt: new Date("2026-11-20T18:00:00Z").toISOString() };
  assert.equal(salesProgressPercent(all, undefined, date), 100);
  assert.match(salesProgressStatus(all, date).message, /siete días/);
  assert.equal(reachedSalesUpdates(all, undefined)[0].threshold, 100);
});

test("no permite reservar sin aceptación expresa de las reglas", () => {
  assert.throws(() => createOpportunity(EMPTY_STATE, {
    customer, selected, plan: "contado", termsAccepted: false,
  }, "sin-consentimiento", date), /aceptar las reglas/);
});

test("el administrador crea, activa y pausa sorteos independientes", () => {
  let state = createDraw(EMPTY_STATE, { title: "Sorteo de prueba dos", prize: "Premio B", description: "Edición dos" }, "segundo", date);
  assert.equal(drawCatalog(state).length, 2);
  assert.equal(drawCatalog(state)[1].enabled, false);
  assert.throws(() => createOpportunity(state, {
    customer, selected, plan: "contado", termsAccepted: true, drawId: "segundo",
  }, "orden-b", date), /no está habilitad[oa]/);
  state = setDrawEnabled(state, "segundo", true);
  state = createOpportunity(state, { customer, selected, plan: "contado", termsAccepted: true }, "orden-a", date);
  state = createOpportunity(state, {
    customer, selected, plan: "contado", termsAccepted: true, drawId: "segundo",
  }, "orden-b", date);
  assert.equal(reservedNumbers(state, "principal", date).size, 10);
  assert.equal(reservedNumbers(state, "segundo", date).size, 10);
  assert.equal(salesProgressPercent(state, "segundo", date), 0.5);
  state = setDrawEnabled(state, "segundo", false);
  assert.equal(state.opportunities.length, 2);
  assert.equal(drawCatalog(state)[1].enabled, false);
});

test("reserva inicial vence en 24 horas, libera números y bloquea aprobación tardía", () => {
  let state = setup();
  const later = new Date(date.getTime() + 24 * 3_600_000 + 1000);
  assert.equal(isReservationExpired(state.opportunities[0], new Date(date.getTime() + 23 * 3_600_000)), false);
  assert.equal(isReservationExpired(state.opportunities[0], later), true);
  state = reportPayment(state, { orderId: "orden-1", amount: 20_000, method: "PSE", reference: "ref-1" }, "p-1", date);
  assert.throws(() => approvePayment(state, "p-1", () => 0.5, later), /venció/);
  state = expireUnpaidReservations(state, later);
  assert.equal(state.opportunities[0].status, "vencida");
  assert.equal(state.reports[0].status, "rechazado");
  assert.equal(reservedNumbers(state, "principal", later).size, 0);
  assert.equal(salesProgressPercent(state, "principal", later), 0);
  assert.throws(() => reportPayment(state, { orderId: "orden-1", amount: 10_000, method: "PSE", reference: "late" }, "p-late", later), /venció/);
});

test("permite recuperar números originales disponibles y reemplazar los ocupados", () => {
  const later = new Date(date.getTime() + 25 * 3_600_000);
  let state = expireUnpaidReservations(setup(), later);
  const original = previousNumberAvailability(state, "orden-1", later);
  assert.deepEqual(original.available, selected);
  state = createOpportunity(state, {
    customer, selected: ["0000", ...Array.from({length: 9}, (_, i) => String(i+20).padStart(4,"0"))],
    plan: "contado", termsAccepted: true,
  }, "otra", later);
  const availability = previousNumberAvailability(state, "orden-1", later);
  assert.deepEqual(availability.taken, ["0000"]);
  const replacements = [...availability.available, "0030"];
  state = renewExpiredOpportunity(state, "orden-1", replacements, true, later);
  assert.equal(state.opportunities[0].selected.length, 10);
  assert.equal(state.opportunities[0].selected.includes("0000"), false);
  assert.equal(state.opportunities[0].status, "pendiente");
  assert.equal(reservedNumbers(state, "principal", later).size, 20);
  assert.throws(() => renewExpiredOpportunity(state, "orden-1", replacements, true, later), /vencida/);
});

test("abonos aprobados no se liberan automáticamente hasta definir política de cuotas", () => {
  let state = setup();
  state = reportPayment(state, { orderId: "orden-1", amount: 20_000, method: "PSE", reference: "parcial" }, "p1", date);
  state = approvePayment(state, "p1", () => 0.5, date);
  const later = new Date(date.getTime() + 48 * 3_600_000);
  state = expireUnpaidReservations(state, later);
  assert.equal(state.opportunities[0].status, "financiada");
  assert.equal(reservedNumbers(state, "principal", later).size, 20);
  assert.equal(isReservationExpired(state.opportunities[0], later), false);
});

test("avance parte en cero sin inventar porcentaje ni ventas", () => {
  assert.deepEqual(drawProgress(EMPTY_STATE, "principal", date), {
    total: 200, occupied: 0, paid: 0, withPartialPayment: 0, reservedWithoutPayment: 0,
    separated: 0, occupiedPercent: 0, paidPercent: 0,
  });
});

test("el avance distingue reservas, abonos parciales y pagos completos", () => {
  let state = setup();
  assert.equal(drawProgress(state, "principal", date).reservedWithoutPayment, 1);
  state = createOpportunity(state, {
    customer, selected: Array.from({length: 10}, (_, i) => String(i+10).padStart(4,"0")),
    plan: "contado", termsAccepted: true,
  }, "orden-2", date);
  state = reportPayment(state, { orderId: "orden-2", amount: PRICE, method: "PSE", reference: "full" }, "full", date);
  state = approvePayment(state, "full", () => 0.5, date);
  const stats = drawProgress(state, "principal", date);
  assert.equal(stats.occupied, 2);
  assert.equal(stats.separated, 1);
  assert.equal(stats.reservedWithoutPayment, 1);
  assert.equal(stats.withPartialPayment, 0);
  assert.equal(stats.paid, 1);
  assert.equal(stats.occupiedPercent, 1);
  assert.equal(stats.paidPercent, 0.5);
});

test("las reservas vencidas no se presentan como avance real", () => {
  const state = setup();
  const later = new Date(date.getTime() + 25 * 3_600_000);
  assert.equal(drawProgress(state, "principal", later).occupied, 0);
  assert.equal(drawProgress(state, "principal", later).paid, 0);
});

test("el editor de contenido actualiza textos del sorteo sin cambiar su ID, estado ni órdenes", () => {
  const state = setup();
  const changed = updateDrawDetails(state, "principal", {
    title: "  Sorteo especial  ",
    prize: "  Teléfono de prueba  ",
    description: "  Edición promocional  ",
  });
  assert.equal(changed.draws?.[0].title, "Sorteo especial");
  assert.equal(changed.draws?.[0].prize, "Teléfono de prueba");
  assert.equal(changed.draws?.[0].description, "Edición promocional");
  assert.equal(changed.draws?.[0].enabled, true);
  assert.equal(changed.draws?.[0].id, "principal");
  assert.equal(changed.opportunities[0].id, state.opportunities[0].id);
  assert.equal(state.draws?.[0].title, "Edición iPhone 18");
});

test("el editor rechaza sorteos inexistentes y datos inválidos", () => {
  const input = { title: "Sorteo válido", prize: "Celular", description: "Demo" };
  assert.throws(() => updateDrawDetails(EMPTY_STATE, "inexistente", input), /no encontrad[oa]/);
  assert.throws(() => updateDrawDetails(EMPTY_STATE, "principal", { ...input, title: "No" }), /Revisa/);
  assert.throws(() => updateDrawDetails(EMPTY_STATE, "principal", { ...input, description: "x".repeat(201) }), /Revisa/);
});
