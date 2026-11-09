"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import {
  PERIOD_OPTIONS,
  PeriodFilterKey,
  SBU_OPTIONS,
  getPeriodRange,
  getTaskCode,
  getTaskDeadlineMetrics,
  getTaskPriorityDisplay,
  getTaskStage,
  getTaskStatusDisplay,
} from "@/lib/task-workflow";
import { platformMeta } from "@/components/tasks/acms-creative-badges";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  LayoutDashboard,
  Calendar,
  ChevronDown,
  Plus,
  ListChecks,
  CheckCircle2,
  Clock,
  Gauge,
  AlertTriangle,
  Zap,
  RotateCcw,
  Users,
  Trophy,
  Flame,
  Target,
  ArrowUpRight,
  Banknote,
  Layers,
  Share2,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";

const SBU_CHART_COLORS: Record<string, string> = {
  Achariya: "#6366f1",
  WOW: "#ec4899",
  Miway: "#06b6d4",
  AGOC: "#f59e0b",
  "Q School": "#8b5cf6",
  "WIN Real Estate": "#10b981",
};

const PLATFORM_BAR_COLORS = [
  "#6366f1",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const projects = useCRMStore((s) => s.projects);
  const tasks = useCRMStore((s) => s.tasks);
  const members = useCRMStore((s) => s.members);
  const load = useCRMStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const [period, setPeriod] = useState<PeriodFilterKey>("this-month");

  const role = user?.role || "trainee";
  const isElevated = role === "admin" || role === "manager";

  const allowedProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          isElevated ||
          p.memberIds.includes(user?.id || "") ||
          p.ownerId === user?.id
      ),
    [projects, isElevated, user?.id]
  );

  const allowedProjectIds = useMemo(
    () => new Set(allowedProjects.map((p) => p.id)),
    [allowedProjects]
  );

  const accessibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (isElevated) return true;
      if (role === "trainee") return t.assigneeId === user?.id;
      return t.assigneeId === user?.id || allowedProjectIds.has(t.projectId);
    });
  }, [tasks, isElevated, role, user?.id, allowedProjectIds]);

  const periodRange = useMemo(() => getPeriodRange(period), [period]);

  const periodTasks = useMemo(() => {
    if (!periodRange.start) return accessibleTasks;
    const inRange = accessibleTasks.filter((t) => {
      const ref = new Date(t.assignedAt || t.createdAt);
      if (isNaN(ref.getTime())) return true;
      return ref >= periodRange.start! && ref <= periodRange.end;
    });
    return inRange.length > 0 || period !== "this-month"
      ? inRange
      : accessibleTasks;
  }, [accessibleTasks, periodRange, period]);

  // 8 Core KPI Metrics
  const kpis = useMemo(() => {
    const now = new Date();
    const total = periodTasks.length;

    let completed = 0;
    let inProgress = 0;
    let inReview = 0;
    let overdue = 0;
    let critical = 0;
    let corrections = 0;

    periodTasks.forEach((t) => {
      const stage = getTaskStage(t);
      const metrics = getTaskDeadlineMetrics(t, now);

      if (stage === "completed" || stage === "approved" || t.status === "done") {
        completed++;
      } else if (
        stage === "in-review" ||
        stage === "awaiting-approval" ||
        stage === "correction-submitted" ||
        t.status === "review"
      ) {
        inReview++;
      } else if (stage === "correction-required") {
        corrections++;
        inProgress++;
      } else if (stage !== "cancelled" && t.workflowState !== "rejected") {
        inProgress++;
      }

      if (metrics.isOverdue) overdue++;
      if (
        (t.priority === "urgent" || metrics.escalation === "Critical") &&
        stage !== "completed" &&
        stage !== "approved" &&
        stage !== "cancelled"
      ) {
        critical++;
      }
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
    const curr30 = accessibleTasks.filter((t) => {
      const d = new Date(t.assignedAt || t.createdAt);
      return d >= thirtyDaysAgo;
    }).length;
    const prev30 = accessibleTasks.filter((t) => {
      const d = new Date(t.assignedAt || t.createdAt);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;
    const growthPct =
      prev30 > 0 ? Math.round(((curr30 - prev30) / prev30) * 100) : curr30 * 100;

    return {
      total,
      completed,
      inProgress,
      inReview,
      overdue,
      critical,
      corrections,
      teamSize: members.filter((m) => m.status !== "inactive").length,
      completionRate,
      growthPct,
    };
  }, [periodTasks, accessibleTasks, members]);

  // Spotlight Highlights & Employee Workload Breakdown
  const employeeAnalytics = useMemo(() => {
    const activeMembers = members.filter((m) => m.status !== "inactive");
    const rows = activeMembers.map((m) => {
      const mTasks = periodTasks.filter((t) => t.assigneeId === m.id);
      let completed = 0;
      let inProgress = 0;
      let approvalPending = 0;
      let pending = 0;

      mTasks.forEach((t) => {
        const st = getTaskStage(t);
        if (st === "completed" || st === "approved" || t.status === "done") {
          completed++;
        } else if (
          st === "in-review" ||
          st === "awaiting-approval" ||
          st === "correction-submitted" ||
          t.status === "review"
        ) {
          approvalPending++;
        } else if (st === "created" || st === "assigned") {
          pending++;
        } else if (st !== "cancelled") {
          inProgress++;
        }
      });

      const openCount = inProgress + approvalPending + pending;
      return {
        id: m.id,
        name: m.name,
        shortName: m.name.split(" ")[0],
        role: m.title || m.role,
        completed,
        inProgress,
        approvalPending,
        pending,
        openCount,
        total: mTasks.length,
      };
    });

    const topPerformer =
      [...rows].sort(
        (a, b) => b.completed - a.completed || b.total - a.total
      )[0] || null;
    const mostLoaded =
      [...rows].sort(
        (a, b) => b.openCount - a.openCount || b.total - a.total
      )[0] || null;

    return {
      rows: rows.filter((r) => r.total > 0 || activeMembers.length <= 10),
      allRows: rows,
      topPerformer,
      mostLoaded,
    };
  }, [members, periodTasks]);

  // SBU Breakdown & Realistic Avg Completion Turnaround
  const { sbuChartData, topSbu, avgCompletionDays, completedCountForAvg } =
    useMemo(() => {
      const counts: Record<string, number> = {};
      SBU_OPTIONS.forEach((s) => (counts[s] = 0));

      let totalCompletionDays = 0;
      let doneWithDates = 0;

      periodTasks.forEach((t) => {
        const proj = projects.find((p) => p.id === t.projectId);
        const rawSbu = t.sbu || proj?.business || "Achariya";
        const matchedSbu =
          SBU_OPTIONS.find((s) => s.toLowerCase() === rawSbu.toLowerCase()) ||
          "Achariya";
        counts[matchedSbu] = (counts[matchedSbu] || 0) + 1;

        const st = getTaskStage(t);
        if (st === "completed" || st === "approved" || t.status === "done") {
          const start = new Date(t.assignedAt || t.createdAt);
          const fallbackEnd = t.dueDate ? new Date(t.dueDate) : start;
          const end = t.completedAt ? new Date(t.completedAt) : fallbackEnd;
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffD = Math.max(
              0.5,
              Math.abs(end.getTime() - start.getTime()) / 86400000
            );
            totalCompletionDays += Math.min(diffD, 30);
            doneWithDates++;
          }
        }
      });

      const entries = Object.entries(counts)
        .map(([name, value]) => ({
          name,
          value,
          color: SBU_CHART_COLORS[name] || "#6366f1",
        }))
        .sort((a, b) => b.value - a.value);

      const activeEntries = entries.filter((e) => e.value > 0);
      const avgDays =
        doneWithDates > 0
          ? Math.round((totalCompletionDays / doneWithDates) * 10) / 10
          : 0;

      return {
        sbuChartData:
          activeEntries.length > 0 ? activeEntries : entries.slice(0, 5),
        topSbu: entries[0] || { name: "Achariya", value: 0 },
        avgCompletionDays: avgDays,
        completedCountForAvg: doneWithDates,
      };
    }, [periodTasks, projects]);

  // Last 14 Days Task Activity (Anchors to latest active 14-day window if literal last 14 days have 0 tasks)
  const activity14Days = useMemo(() => {
    const buildWindow = (anchorDate: Date) => {
      const days: {
        label: string;
        dateKey: string;
        created: number;
        completed: number;
      }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(
          anchorDate.getFullYear(),
          anchorDate.getMonth(),
          anchorDate.getDate() - i
        );
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        days.push({
          label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          dateKey: `${yyyy}-${mm}-${dd}`,
          created: 0,
          completed: 0,
        });
      }
      const map = new Map(days.map((d) => [d.dateKey, d]));
      accessibleTasks.forEach((t) => {
        const cDate = new Date(t.assignedAt || t.createdAt);
        if (!isNaN(cDate.getTime())) {
          const key = `${cDate.getFullYear()}-${String(
            cDate.getMonth() + 1
          ).padStart(2, "0")}-${String(cDate.getDate()).padStart(2, "0")}`;
          const slot = map.get(key);
          if (slot) slot.created += 1;
        }
        const compRef =
          t.completedAt || (t.status === "done" ? t.dueDate : undefined);
        if (compRef) {
          const dDate = new Date(compRef);
          if (!isNaN(dDate.getTime())) {
            const key = `${dDate.getFullYear()}-${String(
              dDate.getMonth() + 1
            ).padStart(2, "0")}-${String(dDate.getDate()).padStart(2, "0")}`;
            const slot = map.get(key);
            if (slot) slot.completed += 1;
          }
        }
      });
      return days;
    };

    const liveWindow = buildWindow(new Date());
    const hasLivePoints = liveWindow.some(
      (d) => d.created > 0 || d.completed > 0
    );
    if (hasLivePoints || accessibleTasks.length === 0) {
      return liveWindow;
    }

    // Fallback anchor to latest task date so historical workspace tasks render a meaningful curve
    const latestTs = Math.max(
      ...accessibleTasks
        .map((t) => new Date(t.assignedAt || t.createdAt).getTime())
        .filter((n) => !isNaN(n))
    );
    return isFinite(latestTs) ? buildWindow(new Date(latestTs)) : liveWindow;
  }, [accessibleTasks]);

  // Platform Statistics
  const platformStats = useMemo(() => {
    const counts: Record<string, number> = {};
    periodTasks.forEach((t) => {
      let label = "Meta";
      if (t.platform) {
        if (t.platform === "meta" || t.platform === "instagram") label = "Meta";
        else if (t.platform === "print") label = "Offline";
        else if (t.platform === "website") label = "Website";
        else if (t.platform === "youtube") label = "YouTube";
        else label = platformMeta[t.platform]?.label || t.platform;
      }
      counts[label] = (counts[label] || 0) + 1;
    });
    const list = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (list.length === 0) {
      return [
        { name: "Meta", count: 0 },
        { name: "Offline", count: 0 },
        { name: "Website", count: 0 },
      ];
    }
    return list.slice(0, 6);
  }, [periodTasks]);

  // Department Split (Digital vs Direct Marketing)
  const departmentSplit = useMemo(() => {
    let digital = 0;
    let direct = 0;
    periodTasks.forEach((t) => {
      const mt = (t.marketingType || "Digital Marketing").toLowerCase();
      if (
        mt.includes("offline") ||
        mt.includes("event") ||
        mt.includes("direct") ||
        t.platform === "print"
      ) {
        direct++;
      } else {
        digital++;
      }
    });
    const sum = digital + direct;
    const digitalPct = sum > 0 ? Math.round((digital / sum) * 100) : 85;
    const directPct = sum > 0 ? 100 - digitalPct : 15;
    return {
      digitalCount: digital,
      directCount: direct,
      digitalPct,
      directPct,
      data: [
        { name: "Digital", value: sum > 0 ? digital : 85, color: "#6366f1" },
        { name: "Direct", value: sum > 0 ? direct : 15, color: "#ec4899" },
      ],
    };
  }, [periodTasks]);

  // Activity Heatmap — Last 12 Weeks
  const heatmap = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentMon = new Date(today);
    currentMon.setDate(today.getDate() + diffToMon);

    const startMon = new Date(currentMon);
    startMon.setDate(currentMon.getDate() - 11 * 7);

    const dateCounts = new Map<string, number>();
    accessibleTasks.forEach((t) => {
      const d = new Date(t.assignedAt || t.createdAt);
      if (!isNaN(d.getTime())) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`;
        dateCounts.set(k, (dateCounts.get(k) || 0) + 1);
      }
    });

    const weeks: {
      headerLabel: string;
      cells: { dateStr: string; count: number }[];
    }[] = [];

    for (let w = 0; w < 12; w++) {
      const weekMon = new Date(startMon);
      weekMon.setDate(startMon.getDate() + w * 7);
      const headerLabel =
        w % 2 === 0
          ? weekMon.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "";

      const cells: { dateStr: string; count: number }[] = [];
      for (let dIdx = 0; dIdx < 7; dIdx++) {
        const cellDate = new Date(weekMon);
        cellDate.setDate(weekMon.getDate() + dIdx);
        const k = `${cellDate.getFullYear()}-${String(
          cellDate.getMonth() + 1
        ).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;
        cells.push({
          dateStr: cellDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          count: dateCounts.get(k) || 0,
        });
      }
      weeks.push({ headerLabel, cells });
    }

    return weeks;
  }, [accessibleTasks]);

  // Recent Activity (Latest tasks)
  const latestTasks = useMemo(() => {
    return [...accessibleTasks]
      .sort((a, b) => {
        const da = new Date(a.assignedAt || a.createdAt).getTime();
        const db = new Date(b.assignedAt || b.createdAt).getTime();
        return db - da;
      })
      .slice(0, 5);
  }, [accessibleTasks]);

  const gaugeData = [
    { name: "Completed", value: Math.max(0.01, kpis.completionRate) },
    { name: "Remaining", value: Math.max(0, 100 - kpis.completionRate) },
  ];

  const myTasks = accessibleTasks.filter((t) => t.assigneeId === user?.id);

  const kpiCards = [
    {
      label: "Total Tasks",
      value: kpis.total,
      sub: `${kpis.growthPct >= 0 ? "+" : ""}${kpis.growthPct}% vs prev 30d`,
      href: "/dashboard/tasks",
      icon: ListChecks,
      accentBar: "from-indigo-500 to-blue-500",
      iconBg: "bg-indigo-500/10 text-indigo-600 ring-indigo-500/20",
      subColor: "text-indigo-600 font-semibold",
    },
    {
      label: "Completed",
      value: kpis.completed,
      sub: `${kpis.completionRate}% completion rate`,
      href: "/dashboard/tasks?stage=completed",
      icon: CheckCircle2,
      accentBar: "from-emerald-500 to-teal-500",
      iconBg: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
      subColor: "text-emerald-600 font-semibold",
    },
    {
      label: "In Progress",
      value: kpis.inProgress,
      sub: "Active execution",
      href: "/dashboard/tasks?stage=in-progress",
      icon: Clock,
      accentBar: "from-sky-500 to-cyan-500",
      iconBg: "bg-sky-500/10 text-sky-600 ring-sky-500/20",
      subColor: "text-slate-400",
    },
    {
      label: "In Review",
      value: kpis.inReview,
      sub: "Awaiting sign-off",
      href: "/dashboard/approvals",
      icon: Gauge,
      accentBar: "from-violet-500 to-purple-500",
      iconBg: "bg-violet-500/10 text-violet-600 ring-violet-500/20",
      subColor: "text-slate-400",
    },
    {
      label: "Overdue",
      value: kpis.overdue,
      sub: "Past deadline",
      href: "/dashboard/tasks?overdue=true",
      icon: AlertTriangle,
      accentBar: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
      subColor: kpis.overdue > 0 ? "text-amber-600 font-medium" : "text-slate-400",
    },
    {
      label: "Critical",
      value: kpis.critical,
      sub: "High escalation",
      href: "/dashboard/tasks?priority=urgent",
      icon: Zap,
      accentBar: "from-rose-500 to-red-500",
      iconBg: "bg-rose-500/10 text-rose-600 ring-rose-500/20",
      subColor: kpis.critical > 0 ? "text-rose-600 font-medium" : "text-slate-400",
    },
    {
      label: "Corrections",
      value: kpis.corrections,
      sub: "Returned items",
      href: "/dashboard/tasks?stage=correction-required",
      icon: RotateCcw,
      accentBar: "from-pink-500 to-fuchsia-500",
      iconBg: "bg-pink-500/10 text-pink-600 ring-pink-500/20",
      subColor: "text-slate-400",
    },
    {
      label: "Team Size",
      value: kpis.teamSize,
      sub: "Active members",
      href: isElevated ? "/dashboard/team" : "/dashboard/workload",
      icon: Users,
      accentBar: "from-[#1A3A5C] to-indigo-600",
      iconBg: "bg-slate-800/10 text-[#1A3A5C] ring-slate-800/15",
      subColor: "text-slate-400",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* HERO EXECUTIVE BANNER */}
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
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Executive Dashboard
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Pulse
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/70 mt-1">
                Live overview of creative workflow across the organization.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pink-300" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodFilterKey)}
                  className="h-8 appearance-none rounded-xl bg-white/15 hover:bg-white/20 pl-8 pr-7 text-xs font-semibold text-white outline-none cursor-pointer transition-colors"
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="text-slate-900 bg-white"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70" />
              </div>
              <span className="text-[11px] font-mono text-white/75 pr-1">
                {periodRange.rangeLabel}
              </span>
            </div>

            <Link href="/dashboard/tasks/new">
              <Button className="h-10 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white text-xs font-bold gap-1.5 shadow-lg shadow-pink-500/25 border-0 cursor-pointer">
                <Plus className="h-4 w-4" />
                New task
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ROW 1: 8 MODERN ELEVATED KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3.5">
        {kpiCards.map((card) => {
          const IconComp = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accentBar}`}
              />
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-800 transition-colors truncate">
                  {card.label}
                </span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-xl ring-1 shrink-0 ${card.iconBg}`}
                >
                  <IconComp className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2.5 tracking-tight">
                {card.value}
              </p>
              <p className={`text-[10px] mt-1 truncate ${card.subColor}`}>
                {card.sub}
              </p>
            </Link>
          );
        })}
      </div>

      {/* ROW 2: 4 SPOTLIGHT INSIGHT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Performer */}
        <Link
          href={
            employeeAnalytics.topPerformer
              ? `/dashboard/productivity?employee=${employeeAnalytics.topPerformer.id}`
              : "/dashboard/productivity"
          }
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                Top Performer
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </div>
            <p className="text-base font-extrabold text-slate-900 truncate mt-0.5">
              {employeeAnalytics.topPerformer?.name || "—"}
            </p>
            <p className="text-xs text-slate-500">
              <strong className="text-slate-700">
                {employeeAnalytics.topPerformer?.completed ?? 0}
              </strong>{" "}
              completed tasks
            </p>
          </div>
        </Link>

        {/* Most Loaded */}
        <Link
          href={
            employeeAnalytics.mostLoaded
              ? `/dashboard/productivity?employee=${employeeAnalytics.mostLoaded.id}`
              : "/dashboard/productivity"
          }
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-pink-300 hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20 shrink-0">
            <Flame className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-600">
                Most Loaded
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-pink-600 transition-colors" />
            </div>
            <p className="text-base font-extrabold text-slate-900 truncate mt-0.5">
              {employeeAnalytics.mostLoaded?.name || "—"}
            </p>
            <p className="text-xs text-slate-500">
              <strong className="text-slate-700">
                {employeeAnalytics.mostLoaded?.openCount ?? 0}
              </strong>{" "}
              open tasks
            </p>
          </div>
        </Link>

        {/* Top SBU */}
        <Link
          href={`/dashboard/tasks?sbu=${encodeURIComponent(topSbu.name)}`}
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-cyan-300 hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Target className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-600">
                Top SBU
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-cyan-600 transition-colors" />
            </div>
            <p className="text-base font-extrabold text-slate-900 truncate mt-0.5">
              {topSbu.name}
            </p>
            <p className="text-xs text-slate-500">
              <strong className="text-slate-700">{topSbu.value}</strong> total
              tasks
            </p>
          </div>
        </Link>

        {/* Avg Completion */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 shrink-0">
            <Gauge className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              Avg Completion
            </span>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">
              {avgCompletionDays}d
            </p>
            <p className="text-xs text-slate-500">
              Across <strong className="text-slate-700">{completedCountForAvg}</strong>{" "}
              completed
            </p>
          </div>
        </div>
      </div>

      {/* ROW 3: TASK ACTIVITY AREA CHART + WORKFLOW HEALTH RADIAL CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                Task activity — last 14 days
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Created vs completed tasks per day
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-indigo-600">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                Created
              </span>
              <span className="inline-flex items-center gap-1.5 text-pink-600">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
                Completed
              </span>
            </div>
          </div>

          <div className="h-[245px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activity14Days}
                margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#gradCreated)"
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#ec4899"
                  strokeWidth={2.5}
                  fill="url(#gradCompleted)"
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Rate Radial Health Card */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-indigo-50/40 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Completion rate
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Overall workflow health
            </p>
          </div>

          <div className="relative h-[200px] flex items-center justify-center my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="healthArc" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="55%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="56%"
                  startAngle={220}
                  endAngle={-40}
                  innerRadius={64}
                  outerRadius={84}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={12}
                >
                  <Cell fill="url(#healthArc)" />
                  <Cell fill="#e2e8f0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pt-4 pointer-events-none">
              <span className="text-3xl font-black bg-gradient-to-r from-[#1A3A5C] via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                {kpis.completionRate}%
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                {kpis.completed} of {kpis.total} completed
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/60 text-center">
            <div className="rounded-xl bg-white/90 border border-slate-100 py-2 px-1">
              <p className="text-xs font-extrabold text-emerald-600">
                {kpis.completed}
              </p>
              <p className="text-[10px] text-slate-400">Done</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-slate-100 py-2 px-1">
              <p className="text-xs font-extrabold text-indigo-600">
                {kpis.inProgress}
              </p>
              <p className="text-[10px] text-slate-400">Active</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-slate-100 py-2 px-1">
              <p className="text-xs font-extrabold text-violet-600">
                {kpis.inReview}
              </p>
              <p className="text-[10px] text-slate-400">Review</p>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: EMPLOYEE WORKLOAD BREAKDOWN + INDIVIDUAL ANALYSIS CHIPS */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Employee Workload Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any team member below to open their Individual Analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/workload"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 inline-flex items-center gap-1"
            >
              <span>Workload Matrix</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/productivity"
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors"
            >
              <span>Full Analytics</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="h-[225px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={employeeAnalytics.rows}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
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
                dataKey="shortName"
                width={85}
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="completed"
                name="Completed"
                stackId="emp"
                fill="#10b981"
                barSize={16}
              />
              <Bar
                dataKey="inProgress"
                name="In Progress"
                stackId="emp"
                fill="#6366f1"
                barSize={16}
              />
              <Bar
                dataKey="approvalPending"
                name="Approval Pending"
                stackId="emp"
                fill="#f59e0b"
                barSize={16}
              />
              <Bar
                dataKey="pending"
                name="Pending"
                stackId="emp"
                fill="#ec4899"
                radius={[0, 6, 6, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1.5 text-emerald-600">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
            Completed
          </span>
          <span className="inline-flex items-center gap-1.5 text-indigo-600">
            <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
            In Progress
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-600">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            Approval Pending
          </span>
          <span className="inline-flex items-center gap-1.5 text-pink-600">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ec4899]" />
            Pending
          </span>
        </div>

        {/* Interactive Member Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          {employeeAnalytics.allRows.map((emp) => (
            <Link
              key={emp.id}
              href={`/dashboard/productivity?employee=${emp.id}`}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/70 hover:bg-[#1A3A5C] hover:border-[#1A3A5C] pl-1.5 pr-3 py-1 text-xs font-medium text-slate-700 hover:text-white transition-all"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 group-hover:bg-white/20 text-[9px] font-bold text-indigo-700 group-hover:text-white">
                {initials(emp.name)}
              </span>
              <span>{emp.name}</span>
              <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-pink-300" />
            </Link>
          ))}
        </div>
      </div>

      {/* ROW 5: SBU STATISTICS + PLATFORM STATISTICS + DEPARTMENT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* SBU Statistics */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                SBU Statistics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tasks per strategic business unit
              </p>
            </div>
          </div>

          <div className="h-[190px] mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sbuChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sbuChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
            {sbuChartData.map((s) => (
              <Link
                key={s.name}
                href={`/dashboard/tasks?sbu=${encodeURIComponent(s.name)}`}
                className="flex items-center justify-between rounded-xl bg-slate-50/80 hover:bg-slate-100 px-2.5 py-1.5 text-xs transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 truncate font-medium text-slate-700">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="font-bold text-slate-900 ml-1">{s.value}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Platform Statistics */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-pink-600" />
              Platform Statistics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribution by platform
            </p>
          </div>

          <div className="h-[245px] mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={platformStats}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 6, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
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
                  width={70}
                  tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Tasks"
                  radius={[0, 8, 8, 0]}
                  barSize={22}
                >
                  {platformStats.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PLATFORM_BAR_COLORS[i % PLATFORM_BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Split */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-cyan-600" />
              Department Split
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Digital vs Direct marketing
            </p>
          </div>

          <div className="h-[185px] my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentSplit.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={74}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {departmentSplit.data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-700">
                  Digital Marketing
                </span>
                <span className="font-bold text-slate-900">
                  {departmentSplit.digitalPct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${departmentSplit.digitalPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-pink-600">
                  Direct / Offline
                </span>
                <span className="font-bold text-slate-900">
                  {departmentSplit.directPct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-pink-500"
                  style={{ width: `${departmentSplit.directPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 6: ACTIVITY HEATMAP + RECENT ACTIVITY TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Activity Heatmap */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Activity Heatmap
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Task creation intensity — last 12 weeks
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span>Less</span>
              <span className="h-3 w-3 rounded-xs bg-slate-100 border border-slate-200/60" />
              <span className="h-3 w-3 rounded-xs bg-indigo-200" />
              <span className="h-3 w-3 rounded-xs bg-indigo-400" />
              <span className="h-3 w-3 rounded-xs bg-indigo-600" />
              <span className="h-3 w-3 rounded-xs bg-[#1A3A5C]" />
              <span>More</span>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="inline-block min-w-[500px] w-full">
              <div className="grid grid-cols-[36px_repeat(12,minmax(0,1fr))] items-center gap-1.5 mb-2">
                <span />
                {heatmap.map((wk, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium text-slate-400 truncate"
                  >
                    {wk.headerLabel}
                  </span>
                ))}
              </div>

              {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map(
                (dayLabel, dayIdx) => (
                  <div
                    key={dayLabel}
                    className="grid grid-cols-[36px_repeat(12,minmax(0,1fr))] items-center gap-1.5 mb-1.5"
                  >
                    <span className="text-[11px] text-slate-400 font-medium">
                      {dayLabel}
                    </span>
                    {heatmap.map((wk, wkIdx) => {
                      const cell = wk.cells[dayIdx];
                      const c = cell.count;
                      const bg =
                        c === 0
                          ? "bg-slate-100/90 border border-slate-200/50"
                          : c === 1
                          ? "bg-indigo-200"
                          : c <= 3
                          ? "bg-indigo-400"
                          : c <= 5
                          ? "bg-indigo-600"
                          : "bg-[#1A3A5C]";
                      return (
                        <div
                          key={wkIdx}
                          title={`${cell.dateStr}: ${c} task${
                            c === 1 ? "" : "s"
                          }`}
                          className={`h-5 rounded-md ${bg} transition-transform hover:scale-105`}
                        />
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Activity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest tasks</p>
            </div>
            <Link
              href="/dashboard/tasks"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-2.5 flex-1">
            {latestTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No tasks created yet.
              </p>
            ) : (
              latestTasks.map((t, idx) => {
                const code = getTaskCode(t, 2600 - idx);
                const statusMeta = getTaskStatusDisplay(t);
                const priorityMeta = getTaskPriorityDisplay(t.priority);
                const d = new Date(t.assignedAt || t.createdAt);
                const shortDate = isNaN(d.getTime())
                  ? ""
                  : d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });

                return (
                  <div
                    key={t.id}
                    onClick={() => router.push(`/dashboard/tasks/${t.id}`)}
                    className="group rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xs p-3.5 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {code}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {shortDate}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 line-clamp-1 transition-colors">
                      {t.title}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityMeta.className}`}
                      >
                        {priorityMeta.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Trainee Payout Summary Strip (Strictly for Trainees Only) */}
      {role === "trainee" && (
        <div className="rounded-3xl bg-gradient-to-r from-[#1A3A5C] via-indigo-900 to-slate-900 p-5 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-white/15 ring-1 ring-white/20 text-pink-300 flex items-center justify-center">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-pink-300">
                My Trainee Task Payouts
              </p>
              <p className="text-xs text-white/80 mt-0.5">
                Earned:{" "}
                <strong className="text-white">
                  ₹
                  {myTasks
                    .filter((t) => t.status === "done")
                    .reduce((s, t) => s + (t.payout || 0), 0)
                    .toLocaleString()}
                </strong>{" "}
                · Pending approval:{" "}
                <strong className="text-amber-300">
                  ₹
                  {myTasks
                    .filter((t) => t.status !== "done")
                    .reduce((s, t) => s + (t.payout || 0), 0)
                    .toLocaleString()}
                </strong>
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/tasks?assignee=me"
            className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1 transition-colors"
          >
            View my tasks <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
