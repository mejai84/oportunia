import test from "node:test";
import assert from "node:assert/strict";
import { followupMetrics, unreadNotificationCount } from "../src/lib/operations";

test("empty follow-up agenda starts at zero, never invents customer debt",()=>{
  const metrics=followupMetrics([], "2026-11-13");
  assert.deepEqual(metrics,{pending:0,overdue:0,today:0,completed:0,cancelled:0});
});
test("only pending tasks count as overdue; completed and cancelled preserve history",()=>{
  const items=[
    {status:"pending" as const,due_date:"2026-11-12"},
    {status:"pending" as const,due_date:"2026-11-13"},
    {status:"pending" as const,due_date:"2026-11-14"},
    {status:"done" as const,due_date:"2026-11-01"},
    {status:"cancelled" as const,due_date:"2026-11-01"},
  ];
  assert.deepEqual(followupMetrics(items,"2026-11-13"),{
    pending:3,overdue:1,today:1,completed:1,cancelled:1,
  });
});
test("read and unread notifications are counted independently of delivery channels",()=>{
  assert.equal(unreadNotificationCount([]),0);
  assert.equal(unreadNotificationCount([{read_at:null},{read_at:"2026-11-13T20:00:00Z"},{read_at:null}]),2);
});
