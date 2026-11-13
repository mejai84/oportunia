/** Read-only calculations: there is no real debt or scheduled external delivery here. */
export type FollowupStatus = "pending" | "done" | "cancelled";
export type FollowupSummaryItem = { status: FollowupStatus; due_date: string };
export type NotificationSummaryItem = { read_at: string | null };

export function followupMetrics<T extends FollowupSummaryItem>(items: readonly T[], today: string) {
  const pending=items.filter(item=>item.status==="pending");
  return {
    pending:pending.length,
    overdue:pending.filter(item=>item.due_date<today).length,
    today:pending.filter(item=>item.due_date===today).length,
    completed:items.filter(item=>item.status==="done").length,
    cancelled:items.filter(item=>item.status==="cancelled").length,
  };
}
export function unreadNotificationCount<T extends NotificationSummaryItem>(items: readonly T[]) {
  return items.filter(item=>item.read_at===null).length;
}
