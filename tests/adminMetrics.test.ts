import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_STATE, createOpportunity, reportPayment, approvePayment,
  createDraw, setDrawEnabled,
} from "../src/lib/domain";
import { summarizeAdminDemo } from "../src/lib/adminMetrics";

const date = new Date("2026-11-13T18:00:00.000Z");
const customer = { name: "Cliente demo", phone: "3001234567", email: "" };
const selected = Array.from({ length: 10 }, (_, i) => String(i).padStart(4, "0"));

test("dashboard starts at zero and never fabricates transactions", () => {
  const view = summarizeAdminDemo(EMPTY_STATE, "principal", 7, date);
  assert.equal(view.occupied, 0);
  assert.equal(view.available, 200);
  assert.equal(view.simulatedApprovedAmount, 0);
  assert.equal(view.pendingAmount, 0);
  assert.equal(view.reportsCount, 0);
  assert.equal(view.trend.length, 7);
  assert.equal(view.potential, 10_000_000);
});

test("dashboard distinguishes simulated approvals and pending references", () => {
  let state = createOpportunity(EMPTY_STATE, { customer, selected, plan: "tres-cuotas", termsAccepted: true }, "orden-a", date);
  state = reportPayment(state, { orderId: "orden-a", method: "Nequi", amount: 20_000, reference: "p1" }, "p1", date);
  state = approvePayment(state, "p1", () => 0.5, date);
  state = reportPayment(state, { orderId: "orden-a", method: "Bancolombia", amount: 15_000, reference: "p2" }, "p2", date);
  const view = summarizeAdminDemo(state, "principal", 14, date);
  assert.equal(view.simulatedApprovedAmount, 20_000);
  assert.equal(view.pendingAmount, 15_000);
  assert.deepEqual(view.statuses, { pending: 1, approved: 1, rejected: 0 });
  assert.equal(view.byMethod.find(row => row.name === "Nequi")?.count, 1);
  assert.equal(view.byMethod.find(row => row.name === "Bancolombia")?.count, 1);
  assert.equal(view.trend.at(-1)?.reported, 35_000);
  assert.equal(view.trend.at(-1)?.approved, 20_000);
});

test("dashboard scopes reports and opportunities by selected draw", () => {
  let state = createDraw(EMPTY_STATE, { title: "Segundo sorteo demo", prize: "Teléfono", description: "" }, "segundo", date);
  state = setDrawEnabled(state, "segundo", true);
  state = createOpportunity(state, { customer, selected, plan: "contado", drawId: "segundo", termsAccepted: true }, "orden-b", date);
  state = reportPayment(state, { orderId: "orden-b", method: "Bre-B", amount: 50_000, reference: "ref-b" }, "ref-b", date);
  assert.equal(summarizeAdminDemo(state, "principal", 7, date).reportsCount, 0);
  assert.equal(summarizeAdminDemo(state, "segundo", 7, date).pendingAmount, 50_000);
});
