"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { Task } from "@/types";
import {
  PERIOD_OPTIONS,
  PeriodFilterKey,
  formatMinutesHM,
  getPeriodRange,
  getTaskDeadlineMetrics,
  getTaskStage,
} from "@/lib/task-workflow";
import { creativeTypeMeta } from "@/components/tasks/acms-creative-badges";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  Gauge,
  Flame,
  CheckCircle2,
  TrendingDown,
  Clock,
  Calendar,
  ChevronDown,
  Users,
  UserPlus,
  X,
} from "lucide-react";

const WEEKLY_CAPACITY_MINS = 41 * 60 + 30; // 41h 30m = 2,490 mins
const DAILY_CAPACITY_MINS = 7 * 60 + 30; // 7h 30m = 450 mins

type SortMode = "load" | "active" | "name";
type BandFilter = "all" | "available" | "busy" | "overloaded";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

function getTaskEstimatedMinutes(task: Task): number {
  if (task.estimatedHours && task.estimatedHours > 0) {
    return Math.round(task.estimatedHours * 60);
  }
  if (task.workloadPercent && task.workloadPercent > 0) {
    return Math.round((task.workloadPercent / 100) * DAILY_CAPACITY_MINS);
  }
  if (task.creativeType && creativeTypeMeta[task.creativeType]) {
    const pct = creativeTypeMeta[task.creativeType].defaultWorkloadPct;
    return Math.round((pct / 100) * DAILY_CAPACITY_MINS);
  }
  return 150; // 2h 30m sensible fallback
}

export default function WorkloadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const members = useCRMStore((s) => s.members);
  const tasks = useCRMStore((s) => s.tasks);
  const load = useCRMStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const [period, setPeriod] = useState<PeriodFilterKey>("this-month");
  const [sortBy, setSortBy] = useState<SortMode>("load");
  const [bandFilter, setBandFilter] = useState<BandFilter>("all");

  const role = user?.role || "trainee";
  const isElevated = role === "admin" || role === "manager";

  const periodRange = useMemo(() => getPeriodRange(period), [period]);

  const activeMembers = useMemo(() => {
    const list = members.filter((m) => m.status !== "inactive");
    if (isElevated) return list;
    return list.filter((m) => m.id === user?.id);
  }, [members, isElevated, user?.id]);

  // Period tasks (fallback to all tasks if current month has 0 so live seeded workspace tasks always show)
  const periodTasks = useMemo(() => {
    if (!periodRange.start) return tasks;
    const inRange = tasks.filter((t) => {
      const d = new Date(t.assignedAt || t.createdAt);
      if (isNaN(d.getTime())) return true;
      return d >= periodRange.start! && d <= periodRange.end;
    });
    return inRange.length > 0 || period !== "this-month" ? inRange : tasks;
  }, [tasks, periodRange, period]);

  // Per-Member Workload Matrix Calculation
  const memberRows = useMemo(() => {
    const now = new Date();

    return activeMembers.map((m) => {
      const mTasks = periodTasks.filter((t) => t.assigneeId === m.id);

      let activeCount = 0;
      let pendingCount = 0;
      let correctionsCount = 0;
      let completedCount = 0;
      let overdueCount = 0;

      let activeEstimatedMins = 0;
      let allPeriodEstimatedMins = 0;
      let actualWorkedMins = 0;

      mTasks.forEach((t) => {
        const stage = getTaskStage(t);
        const metrics = getTaskDeadlineMetrics(t, now);
        const estMins = getTaskEstimatedMinutes(t);

        if (stage === "cancelled" || t.workflowState === "rejected") {
          return;
        }

        allPeriodEstimatedMins += estMins;
        actualWorkedMins += metrics.workedMinutes;

        if (stage === "completed" || stage === "approved" || t.status === "done") {
          completedCount++;
        } else if (stage === "created" || stage === "assigned") {
          pendingCount++;
          activeEstimatedMins += estMins;
          if (metrics.isOverdue) overdueCount++;
        } else {
          activeCount++;
          activeEstimatedMins += estMins;
          if (stage === "correction-required") {
            correctionsCount++;
          }
          if (metrics.isOverdue) overdueCount++;
        }
      });

      // Active workload against 41h 30m weekly capacity
      const estimatedMins = activeEstimatedMins;
      const capacityMins = WEEKLY_CAPACITY_MINS;
      const remainingMins = Math.max(0, capacityMins - estimatedMins);
      const utilizationPct =
        capacityMins > 0 ? Math.round((estimatedMins / capacityMins) * 100) : 0;

      let band: "available" | "busy" | "overloaded" = "available";
      let statusLabel = "Available";
      let barColor = "#10b981";
      let badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200/70";

      if (utilizationPct >= 100) {
        band = "overloaded";
        statusLabel = "Overloaded";
        barColor = "#f43f5e";
        badgeClass = "bg-rose-50 text-rose-700 border border-rose-200/70";
      } else if (utilizationPct >= 70) {
        band = "busy";
        statusLabel = "Busy";
        barColor = "#f59e0b";
        badgeClass = "bg-amber-50 text-amber-800 border border-amber-200/70";
      }

      return {
        member: m,
        id: m.id,
        name: m.name,
        shortName: m.name.split(" ")[0],
        estimatedMins,
        allPeriodEstimatedMins,
        actualMins: actualWorkedMins,
        remainingMins,
        capacityMins,
        utilizationPct,
        band,
        statusLabel,
        barColor,
        badgeClass,
        activeCount,
        pendingCount,
        correctionsCount,
        completedCount,
        overdueCount,
      };
    });
  }, [activeMembers, periodTasks]);

  // Aggregate Team Summary (Top 4 KPI Cards + Team Utilization Donut)
  const teamSummary = useMemo(() => {
    const memberCount = memberRows.length || 1;
    const totalCapacityMins = memberCount * WEEKLY_CAPACITY_MINS;
    const totalEstimatedMins = memberRows.reduce(
      (s, r) => s + r.estimatedMins,
      0
    );
    const totalActualMins = memberRows.reduce((s, r) => s + r.actualMins, 0);

    const utilizationPct =
      totalCapacityMins > 0
        ? Math.round((totalEstimatedMins / totalCapacityMins) * 100)
        : 0;

    const overloadedCount = memberRows.filter(
      (r) => r.utilizationPct >= 100
    ).length;
    const busyCount = memberRows.filter(
      (r) => r.utilizationPct >= 70 && r.utilizationPct < 100
    ).length;
    const availableCount = memberRows.filter(
      (r) => r.utilizationPct < 70
    ).length;

    return {
      totalCapacityMins,
      totalEstimatedMins,
      totalActualMins,
      utilizationPct,
      overloadedCount,
      busyCount,
      availableCount,
    };
  }, [memberRows]);

  // Today's Workload Card Metrics
  const todayStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayPillLabel = now.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const availableTodayCount = memberRows.filter(
      (r) => r.band !== "overloaded"
    ).length;
    const memberCountForCap = activeMembers.length;
    const todayCapacityMins = memberCountForCap * DAILY_CAPACITY_MINS;

    // Tasks active today or due today / assigned today
    const relevantTodayTasks = tasks.filter((t) => {
      if (!isElevated && t.assigneeId !== user?.id) return false;
      const st = getTaskStage(t);
      if (st === "cancelled" || t.workflowState === "rejected") return false;
      const dueDay = t.dueDate?.slice(0, 10);
      const assignedDay = (t.assignedAt || t.createdAt || "").slice(0, 10);
      const completedDay = (t.completedAt || "").slice(0, 10);
      const isOpen = st !== "completed" && st !== "approved" && t.status !== "done";
      return (
        isOpen ||
        dueDay === todayStr ||
        assignedDay === todayStr ||
        completedDay === todayStr
      );
    });

    let assignedMins = 0;
    let completedMins = 0;
    let completedTaskCount = 0;
    let openTaskCount = 0;

    relevantTodayTasks.forEach((t) => {
      const st = getTaskStage(t);
      const est = getTaskEstimatedMinutes(t);
      assignedMins += est;
      if (st === "completed" || st === "approved" || t.status === "done") {
        completedMins += est;
        completedTaskCount++;
      } else {
        openTaskCount++;
      }
    });

    const remainingCapacityMins = Math.max(0, todayCapacityMins - assignedMins);
    const utilizationPct =
      todayCapacityMins > 0
        ? Math.min(100, Math.round((assignedMins / todayCapacityMins) * 100))
        : 0;

    const statusText =
      utilizationPct >= 100
        ? "Overloaded"
        : utilizationPct >= 70
        ? "Busy"
        : "Available";

    const ringColor =
      utilizationPct >= 100
        ? "#f43f5e"
        : utilizationPct >= 70
        ? "#f59e0b"
        : "#6366f1";

    return {
      todayPillLabel,
      memberCountForCap,
      availableTodayCount,
      todayCapacityMins,
      assignedMins,
      assignedTaskCount: relevantTodayTasks.length,
      completedMins,
      completedTaskCount,
      remainingCapacityMins,
      openTaskCount,
      utilizationPct,
      statusText,
      ringColor,
    };
  }, [memberRows, activeMembers.length, tasks, isElevated, user?.id]);

  // Sorted & Band-Filtered Members List
  const displayedMembers = useMemo(() => {
    const filtered =
      bandFilter === "all"
        ? memberRows
        : memberRows.filter((r) => r.band === bandFilter);

    return [...filtered].sort((a, b) => {
      if (sortBy === "load") {
        return (
          b.utilizationPct - a.utilizationPct ||
          b.activeCount - a.activeCount ||
          a.name.localeCompare(b.name)
        );
      }
      if (sortBy === "active") {
        return (
          b.activeCount - a.activeCount || b.utilizationPct - a.utilizationPct
        );
      }
      return a.name.localeCompare(b.name);
    });
  }, [memberRows, bandFilter, sortBy]);

  // Hours per member chart list (sorted by estimated load desc)
  const hoursChartRows = useMemo(() => {
    const sorted = [...memberRows].sort(
      (a, b) => b.estimatedMins - a.estimatedMins || b.actualMins - a.actualMins
    );
    const maxMins = Math.max(
      WEEKLY_CAPACITY_MINS,
      ...sorted.map((r) => Math.max(r.estimatedMins, r.actualMins))
    );
    return { rows: sorted, maxMins };
  }, [memberRows]);

  const weekOfMonth = Math.max(1, Math.ceil(new Date().getDate() / 7));

  // Donut data for Team Utilization
  const teamDonutData = [
    {
      name: "Used Capacity",
      value: Math.max(0.1, Math.min(100, teamSummary.utilizationPct)),
      color:
        teamSummary.utilizationPct >= 100
          ? "#f43f5e"
          : teamSummary.utilizationPct >= 70
          ? "#f59e0b"
          : "#6366f1",
    },
    {
      name: "Available Capacity",
      value: Math.max(0, 100 - Math.min(100, teamSummary.utilizationPct)),
      color: "#f1f5f9",
    },
  ];

  // Donut data for Today's Workload Ring
  const todayDonutData = [
    {
      name: "Today Used",
      value: Math.max(0.1, todayStats.utilizationPct),
      color: todayStats.ringColor,
    },
    {
      name: "Today Remaining",
      value: Math.max(0, 100 - todayStats.utilizationPct),
      color: "#f1f5f9",
    },
  ];

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
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Workload Management
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink-200">
                  Week {weekOfMonth}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/70 mt-1">
                Week {weekOfMonth} · Capacity 41h 30m / member · auto-calculated
                from active tasks.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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

            <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 backdrop-blur-md p-1 text-xs text-white/85 font-medium">
              <button
                type="button"
                onClick={() =>
                  setBandFilter(bandFilter === "available" ? "all" : "available")
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 cursor-pointer transition-colors ${
                  bandFilter === "available"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "hover:bg-white/10"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>&lt; 70%</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setBandFilter(bandFilter === "busy" ? "all" : "busy")
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 cursor-pointer transition-colors ${
                  bandFilter === "busy"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "hover:bg-white/10"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>70–99%</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setBandFilter(
                    bandFilter === "overloaded" ? "all" : "overloaded"
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 cursor-pointer transition-colors ${
                  bandFilter === "overloaded"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "hover:bg-white/10"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span>≥ 100%</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ROW 1: 4 BENTO SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Team utilization */}
        <button
          type="button"
          onClick={() => setBandFilter("all")}
          className="group relative overflow-hidden text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Team utilization
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20">
              <Gauge className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {teamSummary.utilizationPct}%
          </p>
          <p className="text-[11px] font-medium text-indigo-600 mt-1.5">
            {formatMinutesHM(teamSummary.totalEstimatedMins)} of{" "}
            {formatMinutesHM(teamSummary.totalCapacityMins)}
          </p>
        </button>

        {/* 2. Overloaded */}
        <button
          type="button"
          onClick={() =>
            setBandFilter(bandFilter === "overloaded" ? "all" : "overloaded")
          }
          className="group relative overflow-hidden text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Overloaded
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {teamSummary.overloadedCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            members ≥ 100% capacity
          </p>
        </button>

        {/* 3. Available */}
        <button
          type="button"
          onClick={() =>
            setBandFilter(bandFilter === "available" ? "all" : "available")
          }
          className="group relative overflow-hidden text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Available
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {teamSummary.availableCount}
          </p>
          <p className="text-[11px] font-medium text-emerald-600 mt-1.5">
            workload &lt; 70%
          </p>
        </button>

        {/* 4. Actual vs Estimated */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Actual vs Estimated
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
              <TrendingDown className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {formatMinutesHM(teamSummary.totalActualMins)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Estimated {formatMinutesHM(teamSummary.totalEstimatedMins)}
          </p>
        </div>
      </div>

      {/* ROW 2: TODAY'S WORKLOAD CARD */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A3A5C] via-indigo-500 to-pink-500" />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Today&apos;s Workload
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              7h 30m per member × {todayStats.memberCountForCap} available
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/70 px-3 py-1 text-xs font-semibold text-indigo-800">
            <Clock className="h-3.5 w-3.5 text-indigo-600" />
            {todayStats.todayPillLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
          {/* 5 Sub-Cards */}
          <div className="xl:col-span-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 hover:border-indigo-200 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                TODAY&apos;S CAPACITY
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5">
                {formatMinutesHM(todayStats.todayCapacityMins)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {todayStats.memberCountForCap} available members
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/35 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600/80">
                ASSIGNED WORKLOAD
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5">
                {formatMinutesHM(todayStats.assignedMins)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {todayStats.assignedTaskCount} tasks
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/35 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">
                COMPLETED WORKLOAD
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5">
                {formatMinutesHM(todayStats.completedMins)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {todayStats.completedTaskCount} tasks
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/35 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700/80">
                REMAINING CAPACITY
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5">
                {formatMinutesHM(todayStats.remainingCapacityMins)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {todayStats.openTaskCount} open tasks
              </p>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-pink-50/30 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600/80">
                UTILIZATION
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5">
                {todayStats.utilizationPct}%
              </p>
              <p className="text-[11px] font-medium text-slate-600 mt-1">
                {todayStats.statusText}
              </p>
            </div>
          </div>

          {/* Right Circular Utilization Gauge */}
          <div className="xl:col-span-2 flex items-center justify-center">
            <div className="relative h-[136px] w-[136px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={todayDonutData}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={49}
                    outerRadius={62}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                  >
                    {todayDonutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pointer-events-none">
                <span className="text-xl font-extrabold text-slate-900 leading-none">
                  {todayStats.utilizationPct}%
                </span>
                <span className="text-[9px] text-slate-500 mt-1 leading-tight">
                  {formatMinutesHM(todayStats.assignedMins)} of{" "}
                  {formatMinutesHM(todayStats.todayCapacityMins)}
                </span>
                <span className="text-[8px] font-medium text-indigo-600">
                  {todayStats.availableTodayCount} available today
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: HOURS PER MEMBER + TEAM UTILIZATION DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hours per member */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Hours per member
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Estimated vs actual against 41h 30m weekly capacity. Click a bar
                to open that member&apos;s tasks.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-[#1A3A5C]">
              <Clock className="h-3 w-3 text-indigo-600" />
              41h 30m / week
            </span>
          </div>

          {/* Dual Horizontal Bar Rows (Estimated dynamic capacity band + Actual indigo) */}
          <div className="space-y-3.5 pt-1 max-h-[340px] overflow-y-auto pr-1">
            {hoursChartRows.rows.map((row) => {
              const estPct = Math.min(
                100,
                Math.round((row.estimatedMins / hoursChartRows.maxMins) * 100)
              );
              const actPct = Math.min(
                100,
                Math.round((row.actualMins / hoursChartRows.maxMins) * 100)
              );

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/tasks?assignee=${row.id}`)
                  }
                  title={`${row.name} — Estimated: ${formatMinutesHM(row.estimatedMins)} | Actual: ${formatMinutesHM(row.actualMins)}`}
                  className="w-full grid grid-cols-12 items-center gap-3 text-left group cursor-pointer hover:bg-indigo-50/40 rounded-xl py-1.5 px-2 transition-colors"
                >
                  <span className="col-span-3 sm:col-span-2 text-xs font-semibold text-slate-600 group-hover:text-indigo-700 truncate text-right pr-1">
                    {row.shortName}
                  </span>

                  <div className="col-span-9 sm:col-span-10 space-y-1.5 border-l border-dashed border-slate-200 pl-2.5">
                    {/* Estimated Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-r-full transition-all duration-300"
                          style={{
                            width: `${Math.max(row.estimatedMins > 0 ? 3 : 0, estPct)}%`,
                            backgroundColor: row.barColor,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-medium text-slate-500 w-12 text-right">
                        {formatMinutesHM(row.estimatedMins)}
                      </span>
                    </div>

                    {/* Actual Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100/70 overflow-hidden">
                        <div
                          className="h-full rounded-r-full bg-indigo-400 transition-all duration-300"
                          style={{
                            width: `${Math.max(row.actualMins > 0 ? 3 : 0, actPct)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 w-12 text-right">
                        {formatMinutesHM(row.actualMins)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-5 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-xs bg-emerald-500" />
              Estimated (by capacity band)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-xs bg-indigo-400" />
              Actual logged hours
            </span>
          </div>
        </div>

        {/* Team utilization Donut */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-900">Team utilization</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregate capacity in use. Click a segment to filter.
          </p>

          <div className="relative flex-1 min-h-[230px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={225}>
              <PieChart>
                <Pie
                  data={teamDonutData}
                  cx="50%"
                  cy="50%"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={64}
                  outerRadius={84}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={10}
                  onClick={(_, index) => {
                    if (index === 0) {
                      setBandFilter((prev) =>
                        prev === "busy" ? "all" : "busy"
                      );
                    } else {
                      setBandFilter((prev) =>
                        prev === "available" ? "all" : "available"
                      );
                    }
                  }}
                  className="cursor-pointer"
                >
                  {teamDonutData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
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

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-extrabold text-slate-900">
                {teamSummary.utilizationPct}%
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                of {formatMinutesHM(teamSummary.totalCapacityMins)} capacity
              </span>
            </div>
          </div>

          {/* Quick Band Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px]">
            <button
              type="button"
              onClick={() =>
                setBandFilter(bandFilter === "available" ? "all" : "available")
              }
              className={`rounded-full px-3 py-1 font-semibold cursor-pointer border transition-colors ${
                bandFilter === "available"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              Available ({teamSummary.availableCount})
            </button>
            <button
              type="button"
              onClick={() =>
                setBandFilter(bandFilter === "busy" ? "all" : "busy")
              }
              className={`rounded-full px-3 py-1 font-semibold cursor-pointer border transition-colors ${
                bandFilter === "busy"
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              Busy ({teamSummary.busyCount})
            </button>
            <button
              type="button"
              onClick={() =>
                setBandFilter(
                  bandFilter === "overloaded" ? "all" : "overloaded"
                )
              }
              className={`rounded-full px-3 py-1 font-semibold cursor-pointer border transition-colors ${
                bandFilter === "overloaded"
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              Overloaded ({teamSummary.overloadedCount})
            </button>
          </div>
        </div>
      </div>

      {/* ROW 4: MEMBERS WORKLOAD MATRIX */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
        {/* Matrix Header & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/15">
                <Users className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">Members</h2>
              {bandFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setBandFilter("all")}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 cursor-pointer"
                >
                  <span className="capitalize">{bandFilter}</span>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Auto-calculated workload from active tasks.
            </p>
          </div>

          {/* Sort Pill: Load | Active | Name */}
          <div className="inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-50 p-1 text-xs font-semibold">
            {(
              [
                { key: "load", label: "Load" },
                { key: "active", label: "Active" },
                { key: "name", label: "Name" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSortBy(opt.key)}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  sortBy === opt.key
                    ? "bg-[#1A3A5C] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member Workload Rows */}
        <div className="space-y-3">
          {displayedMembers.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">
              No members match the selected capacity filter.
            </p>
          ) : (
            displayedMembers.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-sm px-5 py-4 transition-all flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-6"
              >
                {/* 1. Member Avatar, Name & Status / Overdue Pills */}
                <div
                  onClick={() =>
                    router.push(`/dashboard/productivity?employee=${row.id}`)
                  }
                  className="flex items-center gap-3.5 xl:w-56 shrink-0 cursor-pointer group"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-indigo-500/15 shrink-0">
                    <AvatarImage src={row.member.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-[#1A3A5C] to-indigo-600 text-white text-xs font-bold">
                      {initials(row.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                      {row.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.badgeClass}`}
                      >
                        {row.statusLabel}
                      </span>
                      {row.overdueCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200/70 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                          {row.overdueCount} overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Workload Progress Bar & 4 Time Metrics */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Workload</span>
                    <span className="font-extrabold text-slate-900">
                      {row.utilizationPct}%
                    </span>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(row.utilizationPct > 0 ? 2 : 0, row.utilizationPct)
                        )}%`,
                        backgroundColor: row.barColor,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500 pt-0.5">
                    <span>
                      Estimated{" "}
                      <strong className="font-semibold text-slate-800">
                        {formatMinutesHM(row.estimatedMins)}
                      </strong>
                    </span>
                    <span>
                      Actual{" "}
                      <strong className="font-semibold text-indigo-700">
                        {formatMinutesHM(row.actualMins)}
                      </strong>
                    </span>
                    <span>
                      Remaining{" "}
                      <strong className="font-semibold text-slate-800">
                        {formatMinutesHM(row.remainingMins)}
                      </strong>
                    </span>
                    <span className="sm:text-right">
                      Capacity{" "}
                      <strong className="font-semibold text-slate-800">
                        {formatMinutesHM(row.capacityMins)}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* 3. Right 4 Task Counter Boxes + Assign Button */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/tasks?assignee=${row.id}`)
                    }
                    className="w-16 rounded-xl border border-indigo-100 bg-indigo-50/70 hover:bg-indigo-100/80 py-2 px-2 text-center transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-extrabold text-indigo-950 leading-none">
                      {row.activeCount}
                    </p>
                    <p className="text-[10px] font-medium text-indigo-600 mt-1">
                      Active
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/tasks?assignee=${row.id}&stage=assigned`
                      )
                    }
                    className="w-16 rounded-xl border border-amber-100 bg-amber-50/70 hover:bg-amber-100/80 py-2 px-2 text-center transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-extrabold text-amber-950 leading-none">
                      {row.pendingCount}
                    </p>
                    <p className="text-[10px] font-medium text-amber-700 mt-1">
                      Pending
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/tasks?assignee=${row.id}&stage=correction-required`
                      )
                    }
                    className="w-18 rounded-xl border border-rose-100 bg-rose-50/60 hover:bg-rose-100/70 py-2 px-2 text-center transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-extrabold text-rose-950 leading-none">
                      {row.correctionsCount}
                    </p>
                    <p className="text-[10px] font-medium text-rose-600 mt-1">
                      Corrections
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/tasks?assignee=${row.id}&stage=completed`
                      )
                    }
                    className="w-18 rounded-xl border border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100/80 py-2 px-2 text-center transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-extrabold text-emerald-950 leading-none">
                      {row.completedCount}
                    </p>
                    <p className="text-[10px] font-medium text-emerald-700 mt-1">
                      Completed
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/tasks/new?assignee=${row.id}`)
                    }
                    className="h-10 rounded-xl border border-indigo-200 bg-white hover:bg-[#1A3A5C] hover:border-[#1A3A5C] px-3.5 text-xs font-bold text-[#1A3A5C] hover:text-white inline-flex items-center gap-1.5 transition-all cursor-pointer ml-1 shadow-2xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Assign</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
