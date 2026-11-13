import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_STATE, PRICE, approvePayment, assignedCount, createOpportunity,
  isEligible, normalizeNumber, phaseOf, rejectPayment, reportPayment,
  reservedNumbers, reachedSalesUpdates, salesProgressPercent, salesProgressStatus,
} from "../src/lib/domain";

const customer = { name: "Cliente de prueba", phone: "3001234567", email: "" };
const selected = Array.from({ length: 10 }, (_, i) => String(i).padStart(4, "0"));
const date = new Date("2026-11-13T18:00:00.000Z");

function setup() {
  return createOpportunity(EMPTY_STATE, { customer, selected, plan: "tres-cuotas" }, "orden-1", date);
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
  assert.throws(() => createOpportunity(state, { customer, selected, plan: "contado" }, "orden-2", date), /reservado/);
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
  assert.equal(reservedNumbers(state).size, 50);
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
    customer, selected: [], plan: "dos-cuotas", selectionMode: "automatic",
  }, "orden-2", date, () => 0.5);
  const automatic = state.opportunities[1];
  assert.equal(automatic.selectionMode, "automatic");
  assert.equal(automatic.selected.length, 10);
  assert.equal(new Set(automatic.selected).size, 10);
  assert.equal(reservedNumbers(state).size, 20);
  assert.equal(assignedCount(automatic), 0);
  assert.equal(isEligible(automatic), false);
});

test("en asignación automática solo participan los 50 tras pagar todo", () => {
  let state = createOpportunity(EMPTY_STATE, {
    customer, selected: [], plan: "tres-cuotas", selectionMode: "automatic",
  }, "auto-1", date, () => 0.5);
  for (const [i, amount] of [20_000, 15_000, 15_000].entries()) {
    const id = "auto-p-" + i;
    state = reportPayment(state, { orderId: "auto-1", amount, method: "PSE", reference: id }, id, date);
    state = approvePayment(state, id, () => 0.5, date);
    assert.equal(assignedCount(state.opportunities[0]), [20, 35, 50][i]);
    assert.equal(isEligible(state.opportunities[0]), i === 2);
  }
  assert.equal(reservedNumbers(state).size, 50);
});

test("la elección automática rechaza números manuales y generador inválido", () => {
  assert.throws(() => createOpportunity(EMPTY_STATE, {
    customer, selected, plan: "contado", selectionMode: "automatic",
  }, "invalid", date), /no admite/);
  assert.throws(() => createOpportunity(EMPTY_STATE, {
    customer, selected: [], plan: "contado", selectionMode: "automatic",
  }, "invalid", date, () => 1), /Generador aleatorio/);
});

test("barra de compras muestra porcentajes y comunicaciones por hitos", () => {
  assert.equal(salesProgressPercent(EMPTY_STATE), 0);
  assert.equal(reachedSalesUpdates(EMPTY_STATE).length, 0);
  const one = setup();
  assert.equal(salesProgressPercent(one), 0.5);
  assert.match(salesProgressStatus(one).title, /comenzando/);
  const at75 = { ...EMPTY_STATE, opportunities: Array(150).fill(one.opportunities[0]) };
  assert.equal(salesProgressPercent(at75), 75);
  assert.deepEqual(reachedSalesUpdates(at75).map((item) => item.threshold), [75, 50, 25]);
  const all = { ...EMPTY_STATE, opportunities: Array(200).fill(one.opportunities[0]), deadlineAt: new Date("2026-11-20T18:00:00Z").toISOString() };
  assert.equal(salesProgressPercent(all), 100);
  assert.match(salesProgressStatus(all, date).message, /siete días/);
  assert.equal(reachedSalesUpdates(all)[0].threshold, 100);
});
