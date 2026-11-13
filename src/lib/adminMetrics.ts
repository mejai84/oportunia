import {
  MAX_OPPORTUNITIES, PRICE, activeOrders, drawIdOf, isEligible,
  type DemoState, type Method, type PaymentReport, type Plan,
} from "./domain";

/** All financial values are from local demo data, never verified bank transactions. */
export function summarizeAdminDemo(state: DemoState, drawId: string, days = 14, now = new Date()) {
  const active = activeOrders(state, drawId, now);
  const ids = new Set(state.opportunities.filter(o => drawIdOf(o) === drawId).map(o => o.id));
  const reports = state.reports.filter(report => ids.has(report.orderId));
  const pending = reports.filter(report => report.status === "pendiente");
  const approved = reports.filter(report => report.status === "aprobado");
  const rejected = reports.filter(report => report.status === "rechazado");
  const simulatedApprovedAmount = active.reduce((sum, order) => sum + order.paid, 0);
  const pendingAmount = pending.reduce((sum, report) => sum + report.amount, 0);
  const paidOrders = active.filter(isEligible).length;
  const customers = new Set(active.map(order => order.customer.phone)).size;
  const daysCount = Math.min(30, Math.max(7, Math.round(days)));
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const trend = Array.from({ length: daysCount }, (_, i) => {
    const key = new Date(dayStart - (daysCount - i - 1) * 86400000).toISOString().slice(0, 10);
    return { key, reported: 0, approved: 0 };
  });
  const byDate = new Map(trend.map(entry => [entry.key, entry]));
  for (const report of reports) {
    const onReport = byDate.get(report.createdAt.slice(0, 10));
    if (onReport) onReport.reported += report.amount;
    if (report.status === "aprobado" && report.reviewedAt) {
      const onReview = byDate.get(report.reviewedAt.slice(0, 10));
      if (onReview) onReview.approved += report.amount;
    }
  }
  const methods: Method[] = ["Bre-B", "Nequi", "Bancolombia", "DaviPlata", "PSE", "Efectivo"];
  const byMethod = methods.map(name => ({
    name, count: reports.filter(report => report.method === name).length,
    amount: reports.filter(report => report.method === name).reduce((sum, report) => sum + report.amount, 0),
  })).filter(entry => entry.count > 0);
  const plans: Plan[] = ["contado", "dos-cuotas", "tres-cuotas"];
  const byPlan = plans.map(name => ({ name, count: active.filter(order => order.plan === name).length }));
  const recent: PaymentReport[] = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  return {
    occupied: active.length, available: Math.max(0, MAX_OPPORTUNITIES - active.length),
    paidOrders, partial: active.filter(order => order.paid > 0 && !isEligible(order)).length,
    reserved: active.filter(order => order.paid === 0).length,
    customers, simulatedApprovedAmount, pendingAmount,
    potential: MAX_OPPORTUNITIES * PRICE,
    reportsCount: reports.length,
    statuses: { pending: pending.length, approved: approved.length, rejected: rejected.length },
    trend, byMethod, byPlan, recent,
  };
}
