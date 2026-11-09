"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import {
  OFFICE_MINUTES_PER_DAY,
  PERIOD_OPTIONS,
  PeriodFilterKey,
  SBU_OPTIONS,
  formatMinutesHM,
  getPeriodRange,
  getTaskCode,
  getTaskDeadlineMetrics,
  getTaskPriorityDisplay,
  getTaskStage,
  getTaskStatusDisplay,
} from "@/lib/task-workflow";
import {
  creativeTypeMeta,
  platformMeta,
} from "@/components/tasks/acms-creative-badges";
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
  Trophy,
  Flame,
  Star,
  Gauge,
  ChevronDown,
  Calendar,
  User,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Inbox,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";

const PLATFORM_PIE_COLORS = [
  "#6366f1",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

export default function ProductivityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role || "trainee";
  const isElevated = role === "admin" || role === "manager";

  const members = useCRMStore((s) => s.members);
  const projects = useCRMStore((s) => s.projects);
  const tasks = useCRMStore((s) => s.tasks);
  const load = useCRMStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const [period, setPeriod] = useState<PeriodFilterKey>("this-month");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [expandedCard, setExpandedCard] = useState<
    "performer" | "loaded" | "sbu" | "workload" | null
  >(null);

  // Sync ?employee=<id> query param and role default
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const empParam = params.get("employee");
      if (empParam) {
        setSelectedEmployeeId(empParam);
        return;
      }
    }
    if (!isElevated && user?.id) {
      setSelectedEmployeeId(user.id);
    }
  }, [isElevated, user?.id]);

  const periodRange = useMemo(() => getPeriodRange(period), [period]);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status !== "inactive"),
    [members]
  );

  // Period-filtered tasks (fallback to all tasks if current month has 0 so historical demo data also renders cleanly)
  const periodTasks = useMemo(() => {
    if (!periodRange.start) return tasks;
    const inRange = tasks.filter((t) => {
      const ref = new Date(t.assignedAt || t.createdAt);
      if (isNaN(ref.getTime())) return true;
      return ref >= periodRange.start! && ref <= periodRange.end;
    });
    return inRange.length > 0 || period !== "this-month" ? inRange : tasks;
  }, [tasks, periodRange, period]);

  // Scoped tasks when viewing a single individual vs organization
  const scopedTasks = useMemo(() => {
    if (selectedEmployeeId === "all") return periodTasks;
    return periodTasks.filter((t) => t.assigneeId === selectedEmployeeId);
  }, [periodTasks, selectedEmployeeId]);

  // Per-employee comprehensive metrics
  const employeeStats = useMemo(() => {
    const now = new Date();
    return activeMembers.map((m) => {
      const mTasks = periodTasks.filter((t) => t.assigneeId === m.id);
      let completed = 0;
      let open = 0;
      let inProgress = 0;
      let awaitingApproval = 0;
      let corrections = 0;
      let overdue = 0;
      let workedMinutesTotal = 0;
      let estimatedMinutesTotal = 0;
      let turnaroundDaysSum = 0;
      let turnaroundCount = 0;

      mTasks.forEach((t) => {
        const st = getTaskStage(t);
        const metrics = getTaskDeadlineMetrics(t, now);
        workedMinutesTotal += metrics.workedMinutes;
        estimatedMinutesTotal +=
          t.estimatedHours && t.estimatedHours > 0
            ? Math.round(t.estimatedHours * 60)
            : Math.round(OFFICE_MINUTES_PER_DAY * 0.35);

        if (st === "completed" || st === "approved" || t.status === "done") {
          completed++;
          const start = new Date(t.assignedAt || t.createdAt);
          const end = new Date(
            t.completedAt || t.dueDate || t.assignedAt || t.createdAt
          );
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const rawDays = Math.abs(end.getTime() - start.getTime()) / 86400000;
            turnaroundDaysSum += Math.min(rawDays, 30);
            turnaroundCount++;
          }
        } else if (st !== "cancelled" && t.workflowState !== "rejected") {
          open++;
          if (
            st === "awaiting-approval" ||
            st === "in-review" ||
            st === "correction-submitted" ||
            t.status === "review"
          ) {
            awaitingApproval++;
          } else {
            inProgress++;
          }
          if (st === "correction-required") {
            corrections++;
          }
          if (metrics.isOverdue) {
            overdue++;
          }
        }
      });

      const completionRate =
        mTasks.length > 0 ? Math.round((completed / mTasks.length) * 100) : 0;
      const avgTurnaroundDays =
        turnaroundCount > 0
          ? Math.round((turnaroundDaysSum / turnaroundCount) * 10) / 10
          : 0;

      // Capacity benchmark
      const capacityMins = Math.max(
        estimatedMinutesTotal,
        6 * OFFICE_MINUTES_PER_DAY
      );
      const workloadPct =
        capacityMins > 0
          ? Math.min(100, Math.round((workedMinutesTotal / capacityMins) * 100))
          : 0;

      return {
        member: m,
        id: m.id,
        name: m.name,
        shortName: m.name.split(" ")[0],
        total: mTasks.length,
        completed,
        open,
        inProgress,
        awaitingApproval,
        corrections,
        overdue,
        completionRate,
        workedMinutesTotal,
        capacityMins,
        workloadPct,
        avgTurnaroundDays,
        tasks: mTasks,
      };
    });
  }, [activeMembers, periodTasks]);

  const topPerformerList = useMemo(
    () =>
      [...employeeStats].sort(
        (a, b) =>
          b.completed - a.completed || b.completionRate - a.completionRate
      ),
    [employeeStats]
  );

  const mostLoadedList = useMemo(
    () =>
      [...employeeStats].sort(
        (a, b) => b.open - a.open || b.total - a.total
      ),
    [employeeStats]
  );

  // SBU stats
  const sbuRanking = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    SBU_OPTIONS.forEach((s) => (map[s] = { total: 0, completed: 0 }));

    scopedTasks.forEach((t) => {
      const proj = projects.find((p) => p.id === t.projectId);
      const raw = t.sbu || proj?.business || "Achariya";
      const matched =
        SBU_OPTIONS.find((s) => s.toLowerCase() === raw.toLowerCase()) ||
        "Achariya";
      map[matched].total += 1;
      const st = getTaskStage(t);
      if (st === "completed" || st === "approved" || t.status === "done") {
        map[matched].completed += 1;
      }
    });

    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        total: v.total,
        completed: v.completed,
        completionPct:
          v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total || b.completionPct - a.completionPct);
  }, [scopedTasks, projects]);

  // Overall / Scoped Workload Summary
  const workloadSummary = useMemo(() => {
    const relevantEmps =
      selectedEmployeeId === "all"
        ? employeeStats
        : employeeStats.filter((e) => e.id === selectedEmployeeId);

    const totalWorkedMins = relevantEmps.reduce(
      (s, e) => s + e.workedMinutesTotal,
      0
    );
    const totalCapacityHours = Math.max(
      Math.round((relevantEmps.length || 1) * 41.5),
      Math.ceil(totalWorkedMins / 60)
    );
    const pct =
      totalCapacityHours > 0
        ? Math.min(
            100,
            Math.round((totalWorkedMins / (totalCapacityHours * 60)) * 100)
          )
        : 0;

    return {
      pct,
      workedFormatted: formatMinutesHM(totalWorkedMins),
      capacityHours: totalCapacityHours,
    };
  }, [employeeStats, selectedEmployeeId]);

  // Tasks by Employee vertical stacked bar data
  const tasksByEmployeeChart = useMemo(() => {
    const withTasks = [...employeeStats]
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total);
    const source = withTasks.length > 0 ? withTasks : employeeStats.slice(0, 8);
    return source.map((e) => ({
      id: e.id,
      name: e.shortName,
      fullName: e.name,
      Completed: e.completed,
      Open: e.open,
    }));
  }, [employeeStats]);

  // By Platform Pie Chart (scoped to selected employee or organization)
  const platformPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedTasks.forEach((t) => {
      let label = "Meta";
      if (t.platform) {
        if (t.platform === "meta" || t.platform === "instagram") label = "Meta";
        else if (t.platform === "print") label = "Offline";
        else if (t.platform === "website") label = "Website";
        else label = platformMeta[t.platform]?.label || t.platform;
      }
      counts[label] = (counts[label] || 0) + 1;
    });
    const entries = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return entries.length > 0 ? entries : [{ name: "Meta", value: 1 }];
  }, [scopedTasks]);

  // Top Creative Types Horizontal Bar Chart
  const creativeTypesChart = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedTasks.forEach((t) => {
      const label = t.creativeType
        ? creativeTypeMeta[t.creativeType]?.label || t.creativeType
        : "Social Media Creative";
      counts[label] = (counts[label] || 0) + 1;
    });

    const list = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    if (list.length === 0) {
      return [
        { name: "Reel", count: 0 },
        { name: "Full Day Shooting", count: 0 },
        { name: "Social Media Creative", count: 0 },
        { name: "Banner", count: 0 },
      ];
    }
    return list;
  }, [scopedTasks]);

  const selectedEmployeeStat = useMemo(
    () => employeeStats.find((e) => e.id === selectedEmployeeId) || null,
    [employeeStats, selectedEmployeeId]
  );

  // Individual Stage Distribution when an employee is selected
  const individualStageBreakdown = useMemo(() => {
    if (!selectedEmployeeStat) return [];
    const map: Record<string, number> = {};
    selectedEmployeeStat.tasks.forEach((t) => {
      const label = getTaskStatusDisplay(t).label;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [selectedEmployeeStat]);

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    setExpandedCard(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (empId === "all") url.searchParams.delete("employee");
      else url.searchParams.set("employee", empId);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const topPerformer = topPerformerList[0];
  const mostLoaded = mostLoadedList[0];
  const topSbu = sbuRanking[0] || { name: "WOW", completionPct: 0, total: 0 };

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
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Analytics
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink-200">
                  {selectedEmployeeStat
                    ? `Individual · ${selectedEmployeeStat.shortName}`
                    : "Organization Insights"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/70 mt-1">
                Performance, workload and platform insights.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Individual Employee Analysis Selector */}
            {isElevated && (
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pink-300" />
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  className="h-9 appearance-none rounded-xl border border-white/15 bg-white/10 backdrop-blur-md pl-8 pr-8 text-xs font-semibold text-white outline-none hover:bg-white/15 focus:border-pink-400 cursor-pointer transition-colors"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    All Employees (Organization)
                  </option>
                  {activeMembers.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      className="bg-slate-900 text-white"
                    >
                      Individual: {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60" />
              </div>
            )}

            {/* Period Selector */}
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

      {/* ROW 1: 4 EXPANDABLE BENTO SUMMARY CARDS WITH CHEVRONS */}
      {isElevated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Top performer */}
          <div className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-amber-500 to-orange-500" />
            <button
              type="button"
              onClick={() =>
                setExpandedCard(
                  expandedCard === "performer" ? null : "performer"
                )
              }
              className="w-full text-left cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
                    <Trophy className="h-3.5 w-3.5" />
                  </span>
                  Top performer
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    expandedCard === "performer" ? "rotate-180" : ""
                  }`}
                />
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-2.5 truncate">
                {topPerformer?.name || "—"}
              </p>
              <p className="text-xs font-medium text-amber-600 mt-0.5">
                {topPerformer?.completed ?? 0} completed
              </p>
            </button>

            {expandedCard === "performer" && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl space-y-1 max-h-60 overflow-y-auto">
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select employee for Individual Analysis
                </p>
                {topPerformerList.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectEmployee(emp.id)}
                    className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 cursor-pointer"
                  >
                    <span className="font-semibold truncate">{emp.name}</span>
                    <span className="text-[11px] font-bold text-emerald-600">
                      {emp.completed} done
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Most loaded */}
          <div className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-rose-500 to-pink-500" />
            <button
              type="button"
              onClick={() =>
                setExpandedCard(expandedCard === "loaded" ? null : "loaded")
              }
              className="w-full text-left cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20">
                    <Flame className="h-3.5 w-3.5" />
                  </span>
                  Most loaded
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    expandedCard === "loaded" ? "rotate-180" : ""
                  }`}
                />
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-2.5 truncate">
                {mostLoaded?.name || "—"}
              </p>
              <p className="text-xs font-medium text-rose-600 mt-0.5">
                {mostLoaded?.open ?? 0} open tasks
              </p>
            </button>

            {expandedCard === "loaded" && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl space-y-1 max-h-60 overflow-y-auto">
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Open workload by employee
                </p>
                {mostLoadedList.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectEmployee(emp.id)}
                    className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs hover:bg-pink-50 text-slate-700 hover:text-pink-900 cursor-pointer"
                  >
                    <span className="font-semibold truncate">{emp.name}</span>
                    <span className="text-[11px] font-bold text-indigo-600">
                      {emp.open} open
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Top SBU */}
          <div className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-indigo-500 to-violet-500" />
            <button
              type="button"
              onClick={() =>
                setExpandedCard(expandedCard === "sbu" ? null : "sbu")
              }
              className="w-full text-left cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20">
                    <Star className="h-3.5 w-3.5" />
                  </span>
                  Top SBU
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    expandedCard === "sbu" ? "rotate-180" : ""
                  }`}
                />
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-2.5 truncate">
                {topSbu.name}
              </p>
              <p className="text-xs font-medium text-indigo-600 mt-0.5">
                {topSbu.completionPct}% completion
              </p>
            </button>

            {expandedCard === "sbu" && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl space-y-1">
                {sbuRanking.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/tasks?sbu=${encodeURIComponent(s.name)}`
                      )
                    }
                    className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 cursor-pointer"
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {s.total} tasks · {s.completionPct}%
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Workload summary */}
          <div className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-cyan-500 to-blue-500" />
            <button
              type="button"
              onClick={() =>
                setExpandedCard(
                  expandedCard === "workload" ? null : "workload"
                )
              }
              className="w-full text-left cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/20">
                    <Gauge className="h-3.5 w-3.5" />
                  </span>
                  Workload summary
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    expandedCard === "workload" ? "rotate-180" : ""
                  }`}
                />
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-2.5">
                {workloadSummary.pct}%
              </p>
              <p className="text-xs font-medium text-cyan-700 mt-0.5">
                {workloadSummary.workedFormatted} of{" "}
                {workloadSummary.capacityHours}h
              </p>
            </button>

            {expandedCard === "workload" && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl space-y-1 max-h-60 overflow-y-auto">
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Logged office hours per employee
                </p>
                {employeeStats.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectEmployee(emp.id)}
                    className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs hover:bg-indigo-50 text-slate-700 cursor-pointer"
                  >
                    <span className="font-semibold truncate">{emp.name}</span>
                    <span className="text-[11px] text-indigo-700 font-mono font-semibold">
                      {formatMinutesHM(emp.workedMinutesTotal)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INDIVIDUAL EMPLOYEE ANALYSIS DEEP-DIVE PANEL */}
      {selectedEmployeeStat && (
        <div className="relative overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/45 via-white to-pink-50/25 p-6 shadow-sm space-y-5">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A3A5C] via-indigo-500 to-pink-500" />

          {/* Individual Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-100/80 pb-4">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-12 w-12 ring-2 ring-indigo-500/25 shadow-sm">
                <AvatarImage src={selectedEmployeeStat.member.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-indigo-600 text-white font-bold text-sm">
                  {initials(selectedEmployeeStat.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Individual Analysis — {selectedEmployeeStat.name}
                  </h2>
                  <span className="rounded-full bg-indigo-100 border border-indigo-200/70 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800 capitalize">
                    {selectedEmployeeStat.member.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedEmployeeStat.member.title} ·{" "}
                  {selectedEmployeeStat.member.department} ·{" "}
                  <span className="font-mono font-semibold text-indigo-700">
                    {selectedEmployeeStat.member.employeeId ||
                      selectedEmployeeStat.id.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            {isElevated && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectEmployee("all")}
                className="rounded-xl border-indigo-200 hover:bg-[#1A3A5C] hover:text-white hover:border-[#1A3A5C] text-xs h-9 gap-1.5 bg-white font-semibold transition-all"
              >
                <X className="h-3.5 w-3.5" />
                Back to Organization Analytics
              </Button>
            )}
          </div>

          {/* 8 Individual KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold">
                Total Assigned
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedEmployeeStat.total}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
              <span className="text-[11px] text-emerald-800 font-semibold flex items-center justify-between">
                Completed <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedEmployeeStat.completed}
              </p>
              <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                {selectedEmployeeStat.completionRate}% rate
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-3.5">
              <span className="text-[11px] text-indigo-800 font-semibold flex items-center justify-between">
                Open / Active <Clock className="h-3.5 w-3.5" />
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedEmployeeStat.open}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-200/80 bg-violet-50/50 p-3.5">
              <span className="text-[11px] text-violet-800 font-semibold flex items-center justify-between">
                In Review <Inbox className="h-3.5 w-3.5" />
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedEmployeeStat.awaitingApproval}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3.5">
              <span className="text-[11px] text-amber-800 font-semibold flex items-center justify-between">
                Corrections <RotateCcw className="h-3.5 w-3.5" />
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedEmployeeStat.corrections}
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-3.5">
              <span className="text-[11px] text-rose-800 font-semibold flex items-center justify-between">
                Overdue <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedEmployeeStat.overdue}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/50 p-3.5">
              <span className="text-[11px] text-cyan-800 font-semibold">
                Avg Turnaround
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedEmployeeStat.avgTurnaroundDays}d
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold">
                Office Hours
              </span>
              <p className="text-lg font-extrabold text-[#1A3A5C] mt-1">
                {formatMinutesHM(selectedEmployeeStat.workedMinutesTotal)}
              </p>
              <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                {selectedEmployeeStat.workloadPct}% load
              </p>
            </div>
          </div>

          {/* Stage Pills */}
          {individualStageBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 mr-1">
                Stage Split:
              </span>
              {individualStageBreakdown.map((st) => (
                <span
                  key={st.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs"
                >
                  <span>{st.name}</span>
                  <strong className="text-indigo-700 font-extrabold">
                    {st.count}
                  </strong>
                </span>
              ))}
            </div>
          )}

          {/* Individual Task List */}
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-xs font-bold text-slate-800">
                Tasks Assigned to {selectedEmployeeStat.name} (
                {selectedEmployeeStat.tasks.length})
              </h3>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/tasks?assignee=${selectedEmployeeStat.id}`
                  )
                }
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Open in Tasks View <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {selectedEmployeeStat.tasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No tasks assigned in this period.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-2.5 pl-4 pr-2">Code</th>
                      <th className="py-2.5 px-2">Task</th>
                      <th className="py-2.5 px-2">SBU</th>
                      <th className="py-2.5 px-2">Priority</th>
                      <th className="py-2.5 px-2">Stage</th>
                      <th className="py-2.5 px-2">Hours</th>
                      <th className="py-2.5 pl-2 pr-4">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedEmployeeStat.tasks.map((t, i) => {
                      const code = getTaskCode(t, 2600 - i);
                      const statusMeta = getTaskStatusDisplay(t);
                      const priorityMeta = getTaskPriorityDisplay(t.priority);
                      const metrics = getTaskDeadlineMetrics(t);
                      const proj = projects.find((p) => p.id === t.projectId);
                      const sbuLabel = t.sbu || proj?.business || "Achariya";

                      return (
                        <tr
                          key={t.id}
                          onClick={() => router.push(`/dashboard/tasks/${t.id}`)}
                          className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 pl-4 pr-2">
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700">
                              {code}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-semibold text-slate-900">
                            {t.title}
                          </td>
                          <td className="py-2.5 px-2 text-slate-600 font-medium">
                            {sbuLabel}
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityMeta.className}`}
                            >
                              {priorityMeta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.className}`}
                            >
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-700 font-semibold">
                            {metrics.workedLabel}
                          </td>
                          <td className="py-2.5 pl-2 pr-4 text-slate-500 whitespace-nowrap">
                            {metrics.dueColumnLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROW 2: TASKS BY EMPLOYEE VERTICAL STACKED BAR CHART */}
      {isElevated && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tasks by employee
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Completed vs open task load across the team
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-[11px] font-semibold text-indigo-700">
              Click any employee bar for Individual Analysis
            </span>
          </div>

          <div className="h-[295px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tasksByEmployeeChart}
                margin={{ top: 10, right: 16, left: -16, bottom: 24 }}
                onClick={(state) => {
                  const payload = (
                    state as unknown as {
                      activePayload?: { payload?: { id?: string } }[];
                    }
                  )?.activePayload?.[0]?.payload;
                  if (payload?.id) {
                    handleSelectEmployee(payload.id);
                  }
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  angle={-22}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
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
                  dataKey="Completed"
                  stackId="emp"
                  fill="#10b981"
                  maxBarSize={68}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey="Open"
                  stackId="emp"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={68}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <span className="h-2.5 w-3 rounded-xs bg-emerald-500" />
              Completed
            </span>
            <span className="inline-flex items-center gap-1.5 text-indigo-600">
              <span className="h-2.5 w-3 rounded-xs bg-indigo-500" />
              Open
            </span>
          </div>
        </div>
      )}

      {/* ROW 3: BY PLATFORM PIE CHART + TOP CREATIVE TYPES HORIZONTAL BARS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By platform */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-900">
            By platform
            {selectedEmployeeStat ? ` — ${selectedEmployeeStat.shortName}` : ""}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Channel distribution for deliverables
          </p>

          <div className="h-[240px] mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={86}
                  paddingAngle={2}
                  cornerRadius={5}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {platformPieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PLATFORM_PIE_COLORS[i % PLATFORM_PIE_COLORS.length]}
                    />
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
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-auto pt-2 text-xs font-semibold">
            {platformPieData.map((p, idx) => (
              <span
                key={p.name}
                className="inline-flex items-center gap-1.5 text-slate-700"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      PLATFORM_PIE_COLORS[idx % PLATFORM_PIE_COLORS.length],
                  }}
                />
                {p.name} ({p.value})
              </span>
            ))}
          </div>
        </div>

        {/* Top creative types */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-900">
            Top creative types
            {selectedEmployeeStat ? ` — ${selectedEmployeeStat.shortName}` : ""}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Most requested creative formats
          </p>

          <div className="h-[260px] mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={creativeTypesChart}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="creativeBarGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  stroke="#f1f5f9"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(236, 72, 153, 0.06)" }}
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Tasks"
                  fill="url(#creativeBarGrad)"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
