import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_STATE, PRICE, approvePayment, assignedCount, createOpportunity,
  isEligible, normalizeNumber, phaseOf, rejectPayment, reportPayment,
  reservedNumbers,
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
