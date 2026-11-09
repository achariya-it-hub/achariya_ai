"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Task, TaskActivityLog, TaskComment } from "@/types";
import {
  PERIOD_OPTIONS,
  PeriodFilterKey,
  getPeriodRange,
  getTaskStage,
  getTaskCode,
  getTaskDeadlineMetrics,
  getTaskPriorityDisplay,
  getTaskStatusDisplay,
  getTaskComments,
  getTaskActivities,
} from "@/lib/task-workflow";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  Link2,
  Clock,
  ArrowUpRight,
  CheckSquare,
  Inbox,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

export default function ApprovalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const tasks = useCRMStore((s) => s.tasks);
  const members = useCRMStore((s) => s.members);
  const projects = useCRMStore((s) => s.projects);
  const updateTask = useCRMStore((s) => s.updateTask);
  const load = useCRMStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const [period, setPeriod] = useState<PeriodFilterKey>("this-month");
  const [tab, setTab] = useState<"pending" | "corrections" | "approved" | "rejected">("pending");
  const [notesByTask, setNotesByTask] = useState<Record<string, string>>({});

  const role = user?.role || "trainee";
  const isElevated = role === "admin" || role === "manager";

  const periodRange = useMemo(() => getPeriodRange(period), [period]);

  // Queue Buckets
  const pendingTasks = useMemo(
    () =>
      tasks.filter((t) => {
        const st = getTaskStage(t);
        return (
          t.workflowState !== "cancelled" &&
          t.workflowState !== "rejected" &&
          (t.status === "review" ||
            st === "awaiting-approval" ||
            st === "in-review" ||
            st === "correction-submitted")
        );
      }),
    [tasks]
  );

  const correctionTasks = useMemo(
    () =>
      tasks.filter((t) => {
        const st = getTaskStage(t);
        return st === "correction-required" && t.status !== "done";
      }),
    [tasks]
  );

  const approvedTasks = useMemo(
    () =>
      tasks.filter((t) => {
        const st = getTaskStage(t);
        return t.status === "done" || st === "completed" || st === "approved";
      }),
    [tasks]
  );

  const rejectedTasks = useMemo(
    () => tasks.filter((t) => t.workflowState === "rejected"),
    [tasks]
  );

  // Approval KPIs & Charts Calculations
  const approvalStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthNameYear = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    let approvedToday = 0;
    let approvedThisWeek = 0;
    let approvedThisMonth = 0;

    approvedTasks.forEach((t) => {
      const d = new Date(t.completedAt || t.createdAt);
      if (!isNaN(d.getTime())) {
        if (d >= todayStart) approvedToday++;
        if (d >= weekStart) approvedThisWeek++;
        if (d >= monthStart) approvedThisMonth++;
      }
    });

    const totalApprovedAll = approvedTasks.length;
    const totalCorrectionsAll =
      correctionTasks.length +
      tasks.filter((t) => getTaskStage(t) === "correction-submitted").length;
    const totalRejectedAll = rejectedTasks.length;
    const totalDecisions =
      totalApprovedAll + totalCorrectionsAll + totalRejectedAll;

    const approvalRate =
      totalDecisions > 0
        ? Math.round((totalApprovedAll / totalDecisions) * 100)
        : 0;

    // Avg submission time (normalized fallback for legacy seeded tasks without completedAt)
    let subTotalDays = 0;
    let subCount = 0;
    tasks.forEach((t) => {
      if (t.finalOutputLink || t.status === "review" || t.status === "done") {
        const start = new Date(t.assignedAt || t.createdAt);
        const end = new Date(
          t.completedAt || t.dueDate || t.assignedAt || t.createdAt
        );
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const rawDays = Math.abs(end.getTime() - start.getTime()) / 86400000;
          subTotalDays += Math.min(rawDays, 30);
          subCount++;
        }
      }
    });
    const avgSubmissionDays =
      subCount > 0 ? Math.round((subTotalDays / subCount) * 10) / 10 : 0;

    // Smart anchor for Last 14 days Decisions Stacked Bar
    const build14Days = (anchorDate: Date) => {
      const list: {
        label: string;
        key: string;
        approved: number;
        correction: number;
        rejected: number;
      }[] = [];

      for (let i = 13; i >= 0; i--) {
        const d = new Date(
          anchorDate.getFullYear(),
          anchorDate.getMonth(),
          anchorDate.getDate() - i
        );
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        list.push({ label, key, approved: 0, correction: 0, rejected: 0 });
      }
      const dayMap = new Map(list.map((d) => [d.key, d]));

      tasks.forEach((t) => {
        const st = getTaskStage(t);
        if (t.status === "done" || st === "completed" || st === "approved") {
          const d = new Date(t.completedAt || t.assignedAt || t.createdAt);
          if (!isNaN(d.getTime())) {
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(d.getDate()).padStart(2, "0")}`;
            const slot = dayMap.get(k);
            if (slot) slot.approved += 1;
          }
        } else if (st === "correction-required" || st === "correction-submitted") {
          const d = new Date(t.assignedAt || t.createdAt);
          if (!isNaN(d.getTime())) {
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(d.getDate()).padStart(2, "0")}`;
            const slot = dayMap.get(k);
            if (slot) slot.correction += 1;
          }
        } else if (t.workflowState === "rejected") {
          const d = new Date(t.assignedAt || t.createdAt);
          if (!isNaN(d.getTime())) {
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(d.getDate()).padStart(2, "0")}`;
            const slot = dayMap.get(k);
            if (slot) slot.rejected += 1;
          }
        }
      });

      return list;
    };

    let days14 = build14Days(now);
    const liveSum = days14.reduce(
      (s, d) => s + d.approved + d.correction + d.rejected,
      0
    );
    if (liveSum === 0 && tasks.length > 0) {
      let latestMs = 0;
      tasks.forEach((t) => {
        const ms = new Date(
          t.completedAt || t.assignedAt || t.createdAt
        ).getTime();
        if (!isNaN(ms) && ms > latestMs) latestMs = ms;
      });
      if (latestMs > 0) {
        days14 = build14Days(new Date(latestMs));
      }
    }

    const outcomeMix =
      totalDecisions > 0
        ? [
            { name: "Approved", value: totalApprovedAll, color: "#10b981" },
            { name: "Rejected", value: totalRejectedAll, color: "#f43f5e" },
            { name: "Correction", value: totalCorrectionsAll, color: "#f59e0b" },
          ].filter((x) => x.value > 0)
        : [{ name: "Approved", value: 1, color: "#e2e8f0" }];

    return {
      awaitingCount: pendingTasks.length,
      approvedToday,
      approvedThisWeek,
      approvedThisMonth,
      monthNameYear,
      approvalRate,
      totalApprovedAll,
      totalCorrectionsAll,
      totalRejectedAll,
      totalDecisions,
      avgSubmissionDays,
      days14,
      outcomeMix,
    };
  }, [tasks, pendingTasks, approvedTasks, correctionTasks, rejectedTasks]);

  const displayed =
    tab === "pending"
      ? pendingTasks
      : tab === "corrections"
      ? correctionTasks
      : tab === "approved"
      ? approvedTasks
      : rejectedTasks;

  const setNote = (taskId: string, val: string) => {
    setNotesByTask((prev) => ({ ...prev, [taskId]: val }));
  };

  const buildAuditPayload = (
    task: Task,
    actionDesc: string,
    commentBody?: string
  ) => {
    const nowIso = new Date().toISOString();
    const prevAct = getTaskActivities(task);
    const nextAct: TaskActivityLog[] = [
      {
        id: `act-${Date.now()}`,
        actorName: user?.name || "Admin",
        action: actionDesc,
        createdAt: nowIso,
      },
      ...prevAct,
    ];

    const prevComments = getTaskComments(task);
    const nextComments: TaskComment[] = commentBody
      ? [
          ...prevComments,
          {
            id: `cmt-${Date.now()}`,
            authorId: user?.id || "admin",
            authorName: user?.name || "Admin",
            content: commentBody,
            createdAt: nowIso,
          },
        ]
      : prevComments;

    return {
      nowIso,
      activityLog: nextAct,
      activityJson: JSON.stringify(nextAct),
      comments: nextComments,
      commentsJson: JSON.stringify(nextComments),
    };
  };

  const handleApprove = async (task: Task) => {
    const note = (notesByTask[task.id] || "").trim();
    const audit = buildAuditPayload(
      task,
      note
        ? `Approved & completed task — "${note}"`
        : "Approved & completed task",
      note ? `Approved: ${note}` : undefined
    );

    await updateTask(task.id, {
      status: "done",
      workflowState: "completed",
      isPaused: false,
      completedAt: audit.nowIso,
      payoutStatus: "approved",
      reviewFeedback: null,
      activityLog: audit.activityLog,
      activityJson: audit.activityJson,
      comments: audit.comments,
      commentsJson: audit.commentsJson,
    });

    setNote(task.id, "");
    toast.success(`Approved ${getTaskCode(task)}!`);
  };

  const handleReturn = async (task: Task) => {
    const note = (notesByTask[task.id] || "").trim();
    if (!note) {
      toast.error(
        "Review notes are required to return a task for correction."
      );
      return;
    }

    const audit = buildAuditPayload(
      task,
      `Returned for correction: "${note}"`,
      `Correction required: ${note}`
    );

    await updateTask(task.id, {
      status: "in-progress",
      workflowState: "correction-required",
      reviewFeedback: note,
      activityLog: audit.activityLog,
      activityJson: audit.activityJson,
      comments: audit.comments,
      commentsJson: audit.commentsJson,
    });

    setNote(task.id, "");
    toast.warning(`Returned ${getTaskCode(task)} for correction.`);
  };

  const handleReject = async (task: Task) => {
    const note = (notesByTask[task.id] || "").trim();
    if (!note) {
      toast.error("Review notes are required to reject a task.");
      return;
    }

    const audit = buildAuditPayload(
      task,
      `Rejected task: "${note}"`,
      `Rejected: ${note}`
    );

    await updateTask(task.id, {
      status: "backlog",
      workflowState: "rejected",
      reviewFeedback: note,
      activityLog: audit.activityLog,
      activityJson: audit.activityJson,
      comments: audit.comments,
      commentsJson: audit.commentsJson,
    });

    setNote(task.id, "");
    toast.error(`Rejected ${getTaskCode(task)}.`);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* HERO COMMAND BANNER */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A3A5C] via-[#1f3e68] to-[#2b2a5a] p-6 sm:p-7 text-white shadow-xl shadow-slate-900/10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/3 -bottom-24 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-indigo-500 text-white shadow-lg shadow-pink-500/25 ring-1 ring-white/25 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Approvals &amp; Reviews
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  Approval workflow
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/70 mt-1">
                Review submitted work, track every decision, and monitor
                approval health.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodFilterKey)}
                className="h-9 appearance-none rounded-xl border border-white/15 bg-white/10 backdrop-blur-md pl-8 pr-8 text-xs font-semibold text-white outline-none hover:bg-white/15 focus:border-pink-400 cursor-pointer transition-colors"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-slate-900 text-white"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60" />
            </div>

            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 font-medium">
              {periodRange.rangeLabel}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 8 BENTO KPI SUMMARY CARDS (2 ROWS x 4 COLS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Awaiting approval */}
        <button
          type="button"
          onClick={() => setTab("pending")}
          className="group relative overflow-hidden text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Awaiting approval
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20">
              <Inbox className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {approvalStats.awaitingCount}
          </p>
          <p className="text-[11px] font-medium text-indigo-600 mt-1.5">
            tasks queued for your decision
          </p>
        </button>

        {/* 2. Approved today */}
        <button
          type="button"
          onClick={() => setTab("approved")}
          className="group relative overflow-hidden text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Approved today
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
              <ThumbsUp className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {approvalStats.approvedToday}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {approvalStats.approvedThisWeek} this week ·{" "}
            {approvalStats.approvedThisMonth} this month
          </p>
        </button>

        {/* 3. Approval rate */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Approval rate
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 ring-1 ring-pink-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {approvalStats.approvalRate}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {approvalStats.totalApprovedAll} approved of{" "}
            {approvalStats.totalDecisions} decisions
          </p>
        </div>

        {/* 4. Avg submission time */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Avg submission time
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/20">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {approvalStats.avgSubmissionDays}d
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            from task assignment to submission
          </p>
        </div>

        {/* 5. Returned for correction */}
        <button
          type="button"
          onClick={() => setTab("corrections")}
          className="group relative overflow-hidden text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Returned for correction
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
              <RotateCcw className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {approvalStats.totalCorrectionsAll}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            submissions returned
          </p>
        </button>

        {/* 6. Rejected */}
        <button
          type="button"
          onClick={() => setTab("rejected")}
          className="group relative overflow-hidden text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Rejected
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20">
              <ThumbsDown className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {approvalStats.totalRejectedAll}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            submissions rejected
          </p>
        </button>

        {/* 7. Approved this month */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Approved this month
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {approvalStats.approvedThisMonth}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {approvalStats.monthNameYear}
          </p>
        </div>

        {/* 8. Total decisions */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A3A5C] to-indigo-600" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Total decisions
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/10 text-[#1A3A5C] ring-1 ring-slate-800/15">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {approvalStats.totalDecisions}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            approvals · corrections · rejects
          </p>
        </div>
      </div>

      {/* CHARTS ROW: DECISIONS LAST 14 DAYS + OUTCOME MIX DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Decisions — last 14 days
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Approved, rejected, and correction requests over time.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Approved
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-600">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Correction
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-600">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Rejected
              </span>
            </div>
          </div>

          <div className="h-[240px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={approvalStats.days14}
                margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px -5px rgba(15,23,42,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="approved"
                  name="Approved"
                  stackId="dec"
                  fill="#10b981"
                  barSize={24}
                />
                <Bar
                  dataKey="correction"
                  name="Correction"
                  stackId="dec"
                  fill="#f59e0b"
                  barSize={24}
                />
                <Bar
                  dataKey="rejected"
                  name="Rejected"
                  stackId="dec"
                  fill="#f43f5e"
                  radius={[5, 5, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-900">Outcome mix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            All-time decision split.
          </p>

          <div className="relative h-[215px] mt-3 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={approvalStats.outcomeMix}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={3}
                  cornerRadius={6}
                  dataKey="value"
                  stroke="none"
                >
                  {approvalStats.outcomeMix.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-extrabold text-slate-900">
                {approvalStats.approvalRate}%
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                approval rate
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-auto pt-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Approved
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-600">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Rejected
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-600">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Correction
            </span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DECISION QUEUE SECTION */}
      <div className="pt-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Submission Review Queue
            </h2>
            <p className="text-xs text-slate-500">
              Inspect submitted deliverables and record instant review actions.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-2xs text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => setTab("pending")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                tab === "pending"
                  ? "bg-[#1A3A5C] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Awaiting Approval ({pendingTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("corrections")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                tab === "corrections"
                  ? "bg-[#1A3A5C] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Correction Required ({correctionTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("approved")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                tab === "approved"
                  ? "bg-[#1A3A5C] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Approved ({approvedTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("rejected")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                tab === "rejected"
                  ? "bg-[#1A3A5C] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Rejected ({rejectedTasks.length})
            </button>
          </div>
        </div>

        {displayed.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-14 text-center space-y-2.5 shadow-2xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/15">
              <CheckSquare className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {tab === "pending"
                ? "All caught up — no tasks awaiting approval!"
                : "No tasks in this queue."}
            </p>
            <p className="text-xs text-slate-400">
              Submitted deliverables will appear here automatically for review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((task, idx) => {
              const code = getTaskCode(task, 2595 - idx);
              const assignee = members.find((m) => m.id === task.assigneeId);
              const proj = projects.find((p) => p.id === task.projectId);
              const sbuLabel = task.sbu || proj?.business || "Achariya";
              const statusMeta = getTaskStatusDisplay(task);
              const priorityMeta = getTaskPriorityDisplay(task.priority);
              const metrics = getTaskDeadlineMetrics(task);

              return (
                <div
                  key={task.id}
                  className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs hover:shadow-md transition-all space-y-4"
                >
                  <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A3A5C] via-indigo-500 to-pink-500" />

                  {/* Card Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-indigo-50 border border-indigo-200/70 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700">
                          {code}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityMeta.className}`}
                        >
                          {priorityMeta.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#1A3A5C]">
                          • {sbuLabel}
                        </span>
                      </div>

                      <Link
                        href={`/dashboard/tasks/${task.id}`}
                        className="text-lg font-bold text-slate-900 hover:text-indigo-600 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span>{task.title}</span>
                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
                      </Link>

                      <p className="text-xs text-slate-500">
                        Assignee:{" "}
                        <strong className="text-slate-800">
                          {assignee?.name || "Unassigned"}
                        </strong>{" "}
                        · Assigned by {task.assignedByName || "Admin"} ·{" "}
                        <span className="inline-flex items-center gap-1 text-indigo-700 font-medium">
                          <Clock className="h-3 w-3 inline" /> Working time:{" "}
                          {metrics.workedLabel}
                        </span>
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                      className="rounded-xl border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 text-xs h-9 font-semibold"
                    >
                      Open full screen
                    </Button>
                  </div>

                  {/* Remarks / Review Feedback */}
                  {(task.remarks || task.submissionRemarks || task.reviewFeedback) && (
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs space-y-1">
                      <span className="font-semibold text-slate-500">
                        {task.reviewFeedback ? "Review Notes" : "Remarks"}
                      </span>
                      <p className="text-slate-800">
                        {task.reviewFeedback ||
                          task.submissionRemarks ||
                          task.remarks}
                      </p>
                    </div>
                  )}

                  {/* Final Output Deliverable Box */}
                  {task.finalOutputLink && (
                    <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/60 via-violet-50/40 to-pink-50/30 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#1A3A5C]">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Final output submitted</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Submitted Google Drive deliverable — permanently stored
                        and available before and after approval.
                      </p>
                      <a
                        href={task.finalOutputLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-indigo-200/80 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 hover:border-indigo-400 hover:text-indigo-700 transition-colors shadow-2xs"
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <Link2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span>Final output</span>
                          <span className="text-slate-400 font-normal truncate hidden sm:inline">
                            — {task.finalOutputLink}
                          </span>
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Workflow Approval Controls */}
                  {tab === "pending" && isElevated && (
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                          type="button"
                          onClick={() => handleApprove(task)}
                          className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-emerald-500/20 border-0"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve &amp; complete
                        </Button>

                        <Button
                          type="button"
                          onClick={() => handleReturn(task)}
                          className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-amber-500/20 border-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Return for correction
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleReject(task)}
                          className="h-9 px-4 rounded-xl border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold gap-1.5"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Review notes (required to return or reject)
                        </label>
                        <Textarea
                          value={notesByTask[task.id] || ""}
                          onChange={(e) => setNote(task.id, e.target.value)}
                          rows={2}
                          placeholder="Add optional approval feedback or required revision details..."
                          className="bg-white border-slate-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
