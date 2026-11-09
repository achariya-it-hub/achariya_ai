import { Priority, Task, TaskActivityLog, TaskComment, TaskStage } from "@/types";

/**
 * Official SBU / Business names as per workspace specification
 */
export const SBU_OPTIONS = [
  "Achariya",
  "AGOC",
  "Miway",
  "Q School",
  "WIN Real Estate",
  "WOW",
] as const;

/**
 * Official 11 ACMS Task Lifecycle Stages (in exact filter dropdown order)
 */
export const TASK_STAGE_LIST: {
  value: TaskStage;
  label: string;
  badgeClass: string;
}[] = [
  { value: "created", label: "Created", badgeClass: "bg-slate-100 text-slate-700 border border-slate-200/80" },
  { value: "assigned", label: "Assigned", badgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-200/80" },
  { value: "accepted", label: "Accepted", badgeClass: "bg-cyan-50 text-cyan-700 border border-cyan-200/80" },
  { value: "in-progress", label: "In Progress", badgeClass: "bg-amber-50 text-amber-800 border border-amber-200/80" },
  { value: "in-review", label: "In Review", badgeClass: "bg-violet-50 text-violet-700 border border-violet-200/80" },
  { value: "approved", label: "Approved", badgeClass: "bg-teal-50 text-teal-700 border border-teal-200/80" },
  { value: "completed", label: "Completed", badgeClass: "bg-emerald-600 text-white shadow-2xs" },
  {
    value: "correction-required",
    label: "Correction Required",
    badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/80",
  },
  {
    value: "correction-submitted",
    label: "Correction Submitted",
    badgeClass: "bg-pink-50 text-pink-700 border border-pink-200/80",
  },
  {
    value: "awaiting-approval",
    label: "Awaiting Approval",
    badgeClass: "bg-purple-50 text-purple-700 border border-purple-200/80",
  },
  { value: "cancelled", label: "Cancelled", badgeClass: "bg-slate-200/80 text-slate-600" },
];

const VALID_STAGE_SET = new Set<string>(TASK_STAGE_LIST.map((s) => s.value));

export function getTaskStage(task: Task): TaskStage {
  const wf = (task.workflowState || "").toLowerCase();
  if (VALID_STAGE_SET.has(wf)) {
    return wf as TaskStage;
  }
  if (wf === "returned") {
    return "correction-required";
  }
  if (task.status === "done") {
    return "completed";
  }
  if (task.status === "review") {
    return "awaiting-approval";
  }
  if (task.reviewFeedback && wf !== "rejected") {
    return "correction-required";
  }
  if (task.status === "in-progress") {
    return "in-progress";
  }
  return task.assigneeId ? "assigned" : "created";
}

export function buildStageUpdate(stage: TaskStage): Partial<Task> {
  const nowIso = new Date().toISOString();
  switch (stage) {
    case "created":
      return { status: "todo", workflowState: "created", isPaused: false, completedAt: null };
    case "assigned":
      return { status: "todo", workflowState: "assigned", isPaused: false, completedAt: null };
    case "accepted":
      return { status: "in-progress", workflowState: "accepted", isPaused: false, completedAt: null };
    case "in-progress":
      return { status: "in-progress", workflowState: "in-progress", isPaused: false, completedAt: null };
    case "in-review":
      return { status: "review", workflowState: "in-review", isPaused: false };
    case "awaiting-approval":
      return { status: "review", workflowState: "awaiting-approval", isPaused: false };
    case "correction-submitted":
      return { status: "review", workflowState: "correction-submitted", isPaused: false };
    case "correction-required":
      return { status: "in-progress", workflowState: "correction-required", isPaused: false, completedAt: null };
    case "approved":
      return {
        status: "done",
        workflowState: "approved",
        isPaused: false,
        completedAt: nowIso,
        payoutStatus: "approved",
      };
    case "completed":
      return {
        status: "done",
        workflowState: "completed",
        isPaused: false,
        completedAt: nowIso,
        payoutStatus: "approved",
      };
    case "cancelled":
      return { status: "backlog", workflowState: "cancelled", isPaused: false };
  }
}

export type PeriodFilterKey =
  | "this-month"
  | "last-30d"
  | "last-7d"
  | "last-90d"
  | "all-time";

export const PERIOD_OPTIONS: { value: PeriodFilterKey; label: string }[] = [
  { value: "this-month", label: "This Month" },
  { value: "last-30d", label: "Last 30 Days" },
  { value: "last-7d", label: "Last 7 Days" },
  { value: "last-90d", label: "Last 3 Months" },
  { value: "all-time", label: "All Time" },
];

export function getPeriodRange(period: PeriodFilterKey, now = new Date()): {
  start: Date | null;
  end: Date;
  rangeLabel: string;
} {
  const fmt = (d: Date, includeYear = false) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      ...(includeYear ? { year: "numeric" } : {}),
    });

  if (period === "this-month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return {
      start,
      end,
      rangeLabel: `${fmt(start)} – ${fmt(end, true)}`,
    };
  }
  if (period === "last-7d") {
    const start = new Date(now.getTime() - 6 * 86400000);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, rangeLabel: `${fmt(start)} – ${fmt(now, true)}` };
  }
  if (period === "last-30d") {
    const start = new Date(now.getTime() - 29 * 86400000);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, rangeLabel: `${fmt(start)} – ${fmt(now, true)}` };
  }
  if (period === "last-90d") {
    const start = new Date(now.getTime() - 89 * 86400000);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, rangeLabel: `${fmt(start)} – ${fmt(now, true)}` };
  }
  return { start: null, end: now, rangeLabel: "All workspace records" };
}

export const OFFICE_START_MINUTES = 9 * 60; // 09:00
export const OFFICE_END_MINUTES = 17 * 60 + 30; // 17:30
export const OFFICE_MINUTES_PER_DAY = OFFICE_END_MINUTES - OFFICE_START_MINUTES; // 510 mins (8.5h)

/**
 * Calculates working office minutes between two dates:
 * Monday–Saturday (day !== 0), 09:00–17:30.
 */
export function calculateOfficeMinutesBetween(start: Date, end: Date): number {
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return 0;
  }

  let totalMinutes = 0;
  const curDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  // Cap iteration for extreme ranges by computing full weeks mathematically
  const diffDays = Math.floor((endDay.getTime() - curDay.getTime()) / 86400000);
  if (diffDays > 60) {
    const fullWeeks = Math.floor((diffDays - 14) / 7);
    if (fullWeeks > 0) {
      totalMinutes += fullWeeks * 6 * OFFICE_MINUTES_PER_DAY;
      curDay.setDate(curDay.getDate() + fullWeeks * 7);
    }
  }

  while (curDay <= endDay) {
    const dow = curDay.getDay(); // 0 = Sunday
    if (dow !== 0) {
      const workStart = new Date(
        curDay.getFullYear(),
        curDay.getMonth(),
        curDay.getDate(),
        9,
        0,
        0
      );
      const workEnd = new Date(
        curDay.getFullYear(),
        curDay.getMonth(),
        curDay.getDate(),
        17,
        30,
        0
      );

      const segStart = start > workStart ? start : workStart;
      const segEnd = end < workEnd ? end : workEnd;

      if (segEnd > segStart) {
        totalMinutes += Math.round((segEnd.getTime() - segStart.getTime()) / 60000);
      }
    }
    curDay.setDate(curDay.getDate() + 1);
  }

  return Math.max(0, totalMinutes);
}

export function formatMinutesHM(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDaysHours(msDiff: number): string {
  const absMins = Math.max(0, Math.floor(Math.abs(msDiff) / 60000));
  const days = Math.floor(absMins / (60 * 24));
  const hours = Math.floor((absMins % (60 * 24)) / 60);
  const mins = absMins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function getTaskCode(task: Task, fallbackNum = 2500): string {
  if (task.taskCode) return task.taskCode;
  if (task.assetCode) return task.assetCode;
  const digits = task.id.replace(/\D/g, "");
  const suffix = digits ? (2500 + (Number(digits.slice(-4)) % 499)) : fallbackNum;
  return `CWMS-${suffix}`;
}

export function parseTaskDeadline(task: Task): Date | null {
  if (task.officialDeadline) {
    const d = new Date(task.officialDeadline);
    if (!isNaN(d.getTime())) return d;
  }
  if (!task.dueDate) return null;

  const datePart = task.dueDate.slice(0, 10);
  const [yyyy, mm, dd] = datePart.split("-").map(Number);
  if (!yyyy || !mm || !dd) {
    const fallback = new Date(task.dueDate);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  const timePart = task.dueTime || "17:30";
  const [hh, min] = timePart.split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, hh ?? 17, min ?? 30, 0);
}

export function getTaskDeadlineMetrics(task: Task, now = new Date()) {
  const assignedDate = new Date(task.assignedAt || task.createdAt || now);
  const stage = getTaskStage(task);
  const isFinished =
    task.status === "done" ||
    stage === "completed" ||
    stage === "approved" ||
    stage === "cancelled" ||
    task.workflowState === "rejected";
  const endRef = task.completedAt ? new Date(task.completedAt) : now;
  const officeWorkedMins =
    task.actualHours !== undefined && task.actualHours > 0
      ? Math.round(task.actualHours * 60)
      : calculateOfficeMinutesBetween(assignedDate, endRef);

  const workedLabel = formatMinutesHM(officeWorkedMins);
  const executionTimeLabel = formatDaysHours(
    Math.max(0, endRef.getTime() - assignedDate.getTime())
  );

  const deadline = parseTaskDeadline(task);
  if (!deadline) {
    return {
      assignedDate,
      deadline: null,
      dueColumnLabel: "—",
      officialDeadlineLabel: "—",
      workedMinutes: officeWorkedMins,
      workedLabel,
      executionTimeLabel,
      remainingShortLabel: "",
      remainingDetailLabel: "No deadline set",
      isOverdue: false,
      escalation: "On Track" as "On Track" | "Warning" | "Critical",
    };
  }

  const dueMonthDay = deadline.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const dueTimeStr = deadline.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dueColumnLabel = `${dueMonthDay}, ${dueTimeStr}`;

  const officialDay = deadline.getDate();
  const officialMon = deadline.toLocaleString("en-GB", { month: "short" });
  const officialYear = deadline.getFullYear();
  const officialHH = String(deadline.getHours()).padStart(2, "0");
  const officialMM = String(deadline.getMinutes()).padStart(2, "0");
  const officialDeadlineLabel = `${officialDay} ${officialMon} ${officialYear}, ${officialHH}:${officialMM}`;

  const compareTime = isFinished && task.completedAt ? new Date(task.completedAt) : now;
  const diffMs = deadline.getTime() - compareTime.getTime();
  const isOverdue = !isFinished && diffMs < 0;

  let escalation: "On Track" | "Warning" | "Critical" = "On Track";
  if (!isFinished) {
    if (diffMs < -24 * 3600 * 1000) {
      escalation = "Critical";
    } else if (diffMs < 0) {
      escalation = "Warning";
    }
  }

  let remainingShortLabel = "";
  let remainingDetailLabel = stage === "cancelled" ? "Cancelled" : "Completed";

  const isInReviewQueue =
    task.status === "review" ||
    stage === "awaiting-approval" ||
    stage === "in-review" ||
    stage === "correction-submitted";

  if (!isFinished && !isInReviewQueue) {
    if (diffMs >= 0) {
      const remOfficeMins = calculateOfficeMinutesBetween(now, deadline);
      const disp = remOfficeMins > 0 ? formatMinutesHM(remOfficeMins) : formatDaysHours(diffMs);
      remainingShortLabel = `${disp} remaining`;
      remainingDetailLabel = `${disp} remaining`;
    } else {
      const overdueDur = formatDaysHours(Math.abs(diffMs));
      remainingShortLabel = `Overdue by ${overdueDur}`;
      remainingDetailLabel = `Overdue by ${overdueDur}`;
    }
  } else if (isInReviewQueue) {
    remainingDetailLabel =
      diffMs < 0 ? `Overdue by ${formatDaysHours(Math.abs(diffMs))}` : "Awaiting review";
  }

  return {
    assignedDate,
    deadline,
    dueColumnLabel,
    officialDeadlineLabel,
    workedMinutes: officeWorkedMins,
    workedLabel,
    executionTimeLabel,
    remainingShortLabel,
    remainingDetailLabel,
    isOverdue,
    escalation,
  };
}

export function getTaskStatusDisplay(task: Task): {
  label: string;
  className: string;
  workflowKey: string;
} {
  if (task.workflowState === "rejected") {
    return {
      label: "Rejected",
      className: "bg-rose-100 text-rose-700",
      workflowKey: "rejected",
    };
  }
  if (task.isPaused || task.workflowState === "paused") {
    return {
      label: "Paused",
      className: "bg-slate-200 text-slate-700",
      workflowKey: "paused",
    };
  }
  const stage = getTaskStage(task);
  const found = TASK_STAGE_LIST.find((s) => s.value === stage);
  if (found) {
    return {
      label: found.label,
      className: found.badgeClass,
      workflowKey: found.value,
    };
  }
  return {
    label: "In Progress",
    className: "bg-amber-300/80 text-amber-950",
    workflowKey: "in-progress",
  };
}

export function getTaskPriorityDisplay(priority: Priority): {
  label: string;
  className: string;
} {
  switch (priority) {
    case "urgent":
      return { label: "Critical", className: "bg-rose-600 text-white" };
    case "high":
      return { label: "High", className: "bg-amber-300/85 text-amber-950" };
    case "medium":
      return { label: "Medium", className: "bg-sky-100 text-sky-800" };
    case "low":
    default:
      return { label: "Low", className: "bg-slate-100 text-slate-700" };
  }
}

export function getTaskComments(task: Task): TaskComment[] {
  if (Array.isArray(task.comments) && task.comments.length > 0) {
    return task.comments;
  }
  if (task.commentsJson) {
    try {
      const parsed = JSON.parse(task.commentsJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function getTaskActivities(task: Task): TaskActivityLog[] {
  if (Array.isArray(task.activityLog) && task.activityLog.length > 0) {
    return task.activityLog;
  }
  if (task.activityJson) {
    try {
      const parsed = JSON.parse(task.activityJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [
    {
      id: `act-init-${task.id}`,
      actorName: task.assignedByName || "Workspace Admin",
      action: "Created & assigned task",
      createdAt: task.assignedAt || task.createdAt,
    },
  ];
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "less than a minute ago";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
