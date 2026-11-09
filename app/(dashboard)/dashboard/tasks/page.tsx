"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { TaskStage } from "@/types";
import {
  SBU_OPTIONS,
  TASK_STAGE_LIST,
  getTaskStage,
  getTaskCode,
  getTaskDeadlineMetrics,
  getTaskStatusDisplay,
  getTaskPriorityDisplay,
} from "@/lib/task-workflow";
import {
  Plus,
  Search,
  Filter,
  List,
  LayoutGrid,
  Calendar as CalendarIcon,
  ExternalLink,
  ChevronDown,
  Check,
  CheckSquare,
  X,
} from "lucide-react";

type TasksViewMode = "list" | "kanban";

interface DropdownOption {
  value: string;
  label: string;
}

function FilterDropdown({
  value,
  onChange,
  options,
  leftIcon,
  minMenuWidth = "min-w-[205px]",
}: {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  leftIcon?: React.ReactNode;
  minMenuWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const activeOption = options.find((o) => o.value === value) || options[0];
  const isFiltered = value !== "all";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`h-9 rounded-xl border px-3 text-xs font-semibold outline-none transition-all inline-flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs ${
          isFiltered
            ? "border-indigo-300 bg-indigo-50/80 text-indigo-800"
            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-slate-900"
        } ${leftIcon ? "pl-2.5" : ""}`}
      >
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {leftIcon}
          <span>{activeOption?.label}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            isFiltered ? "text-indigo-500" : "text-slate-400"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full mt-1.5 z-50 ${minMenuWidth} max-h-[380px] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white py-1.5 shadow-2xl shadow-slate-900/10`}
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-[13px] flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  selected
                    ? "bg-indigo-50/80 font-semibold text-indigo-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="whitespace-nowrap">{opt.label}</span>
                {selected && (
                  <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SBU_PILL_STYLES: Record<string, string> = {
  Achariya: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  AGOC: "bg-amber-50 text-amber-800 border-amber-200/80",
  Miway: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
  "Q School": "bg-violet-50 text-violet-700 border-violet-200/80",
  "WIN Real Estate": "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  WOW: "bg-pink-50 text-pink-700 border-pink-200/80",
};

const kanbanColumns: {
  id: string;
  label: string;
  stages: TaskStage[];
  headerBg: string;
  bodyBg: string;
}[] = [
  {
    id: "assigned",
    label: "Created / Assigned",
    stages: ["created", "assigned"],
    headerBg: "bg-gradient-to-r from-[#1A3A5C] to-slate-700",
    bodyBg: "bg-slate-50/70 border-slate-200/80",
  },
  {
    id: "in-progress",
    label: "Accepted / In Progress",
    stages: ["accepted", "in-progress"],
    headerBg: "bg-gradient-to-r from-indigo-500 to-blue-600",
    bodyBg: "bg-indigo-50/30 border-indigo-200/70",
  },
  {
    id: "corrections",
    label: "Correction Required",
    stages: ["correction-required"],
    headerBg: "bg-gradient-to-r from-pink-500 to-rose-600",
    bodyBg: "bg-rose-50/30 border-rose-200/70",
  },
  {
    id: "review",
    label: "In Review / Approval",
    stages: ["in-review", "correction-submitted", "awaiting-approval"],
    headerBg: "bg-gradient-to-r from-violet-500 to-purple-600",
    bodyBg: "bg-violet-50/30 border-violet-200/70",
  },
  {
    id: "completed",
    label: "Approved / Completed",
    stages: ["approved", "completed"],
    headerBg: "bg-gradient-to-r from-emerald-500 to-teal-600",
    bodyBg: "bg-emerald-50/30 border-emerald-200/70",
  },
];

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const tasks = useCRMStore((s) => s.tasks);
  const projects = useCRMStore((s) => s.projects);
  const members = useCRMStore((s) => s.members);
  const load = useCRMStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const [viewMode, setViewMode] = useState<TasksViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [sbuFilter, setSbuFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const assigneeParam = params.get("assignee");
      if (assigneeParam === "me" && user?.id) {
        setAssigneeFilter(user.id);
      } else if (assigneeParam) {
        setAssigneeFilter(assigneeParam);
      }
      if (params.get("overdue") === "true") {
        setDueFilter("overdue");
      }
      const stageOrStatus = params.get("stage") || params.get("status");
      if (stageOrStatus) {
        if (stageOrStatus === "review") {
          setStatusFilter("awaiting-approval");
        } else if (stageOrStatus === "done") {
          setStatusFilter("completed");
        } else {
          setStatusFilter(stageOrStatus);
        }
      }
      if (params.get("priority")) {
        setPriorityFilter(params.get("priority")!);
      }
      if (params.get("sbu")) {
        setSbuFilter(params.get("sbu")!);
      }
    }
  }, [user?.id]);

  const role = user?.role || "trainee";
  const isElevated = role === "admin" || role === "manager";

  const engagedProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          isElevated ||
          p.memberIds.includes(user?.id || "") ||
          p.ownerId === user?.id
      ),
    [projects, isElevated, user?.id]
  );

  const engagedProjectIds = useMemo(
    () => new Set(engagedProjects.map((p) => p.id)),
    [engagedProjects]
  );

  const accessibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (isElevated) return true;
      return t.assigneeId === user?.id || engagedProjectIds.has(t.projectId);
    });
  }, [tasks, isElevated, user?.id, engagedProjectIds]);

  const statusOptions: DropdownOption[] = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      ...TASK_STAGE_LIST.map((s) => ({ value: s.value, label: s.label })),
    ],
    []
  );

  const priorityOptions: DropdownOption[] = [
    { value: "all", label: "All priorities" },
    { value: "urgent", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];

  const dueOptions: DropdownOption[] = [
    { value: "all", label: "Any due date" },
    { value: "today", label: "Due Today" },
    { value: "week", label: "Due This Week" },
    { value: "overdue", label: "Overdue" },
  ];

  const sbuOptions: DropdownOption[] = useMemo(
    () => [
      { value: "all", label: "All SBUs" },
      ...SBU_OPTIONS.map((sbu) => ({ value: sbu, label: sbu })),
    ],
    []
  );

  const assigneeOptions: DropdownOption[] = useMemo(
    () => [
      { value: "all", label: "All assignees" },
      ...members.map((m) => ({ value: m.id, label: m.name })),
    ],
    [members]
  );

  const dateRangeOptions: DropdownOption[] = [
    { value: "all", label: "Last 3 Months" },
    { value: "90d", label: "Last 90 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "7d", label: "Last 7 Days" },
  ];

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return accessibleTasks
      .filter((t, idx) => {
        const code = getTaskCode(t, 2600 - idx);
        const stage = getTaskStage(t);
        const metrics = getTaskDeadlineMetrics(t, now);

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            t.title.toLowerCase().includes(q) ||
            (t.description || "").toLowerCase().includes(q) ||
            code.toLowerCase().includes(q) ||
            (t.sbu || "").toLowerCase().includes(q);
          if (!match) return false;
        }

        if (statusFilter !== "all") {
          if (statusFilter === "in-review") {
            if (
              stage !== "in-review" &&
              stage !== "awaiting-approval" &&
              stage !== "correction-submitted"
            ) {
              return false;
            }
          } else if (stage !== statusFilter) {
            return false;
          }
        }

        if (priorityFilter !== "all" && t.priority !== priorityFilter) {
          return false;
        }

        if (sbuFilter !== "all") {
          const proj = projects.find((p) => p.id === t.projectId);
          const taskSbu = t.sbu || proj?.business || "";
          if (taskSbu.toLowerCase() !== sbuFilter.toLowerCase()) return false;
        }

        if (assigneeFilter !== "all" && t.assigneeId !== assigneeFilter) {
          return false;
        }

        if (dueFilter !== "all") {
          if (dueFilter === "today" && t.dueDate?.slice(0, 10) !== todayStr) {
            return false;
          }
          if (dueFilter === "overdue" && !metrics.isOverdue) {
            return false;
          }
          if (dueFilter === "week") {
            if (!metrics.deadline) return false;
            const diffDays =
              (metrics.deadline.getTime() - now.getTime()) / 86400000;
            if (diffDays < -1 || diffDays > 7) return false;
          }
        }

        if (dateRangeFilter !== "all") {
          const created = new Date(t.assignedAt || t.createdAt);
          if (!isNaN(created.getTime())) {
            const ageDays = (now.getTime() - created.getTime()) / 86400000;
            if (dateRangeFilter === "7d" && ageDays > 7) return false;
            if (dateRangeFilter === "30d" && ageDays > 30) return false;
            if (dateRangeFilter === "90d" && ageDays > 90) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.assignedAt || a.createdAt).getTime();
        const db = new Date(b.assignedAt || b.createdAt).getTime();
        return db - da;
      });
  }, [
    accessibleTasks,
    searchQuery,
    statusFilter,
    priorityFilter,
    sbuFilter,
    assigneeFilter,
    dueFilter,
    dateRangeFilter,
    projects,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    dueFilter !== "all" ||
    sbuFilter !== "all" ||
    assigneeFilter !== "all" ||
    dateRangeFilter !== "all";

  const resetAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDueFilter("all");
    setSbuFilter("all");
    setAssigneeFilter("all");
    setDateRangeFilter("all");
  };

  return (
    <div className="space-y-5 pb-8">
      {/* HERO HEADER BANNER */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A3A5C] via-[#1f3e68] to-[#2b2a5a] p-6 sm:p-7 text-white shadow-xl shadow-slate-900/10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/3 -bottom-20 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-indigo-500 text-white shadow-lg shadow-pink-500/25 ring-1 ring-white/25 shrink-0">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Tasks
                </h1>
                <span className="rounded-full bg-white/15 border border-white/15 px-2.5 py-0.5 text-[11px] font-bold text-pink-200">
                  {accessibleTasks.length} total
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/70 mt-1">
                All tasks across the workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle Pill */}
            <div className="inline-flex items-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold ${
                  viewMode === "list"
                    ? "bg-white text-[#1A3A5C] shadow-xs"
                    : "text-white/70 hover:text-white"
                }`}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold ${
                  viewMode === "kanban"
                    ? "bg-white text-[#1A3A5C] shadow-xs"
                    : "text-white/70 hover:text-white"
                }`}
                title="Board View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Board</span>
              </button>
            </div>

            <Link href="/dashboard/tasks/new">
              <Button className="h-10 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-pink-500/25 gap-1.5 border-0 cursor-pointer">
                <Plus className="h-4 w-4" />
                New task
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* FILTER BAR WITH 12-STAGE POPOVER DROPDOWN */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, description..."
            className="h-9 pl-9 rounded-xl border-slate-200 bg-slate-50/70 text-xs focus-visible:border-indigo-500 focus-visible:ring-indigo-500/15"
          />
        </div>

        <FilterDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          minMenuWidth="min-w-[215px]"
        />

        <FilterDropdown
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={priorityOptions}
          minMenuWidth="min-w-[165px]"
        />

        <FilterDropdown
          value={dueFilter}
          onChange={setDueFilter}
          options={dueOptions}
          minMenuWidth="min-w-[175px]"
        />

        <FilterDropdown
          value={sbuFilter}
          onChange={setSbuFilter}
          options={sbuOptions}
          minMenuWidth="min-w-[185px]"
        />

        <FilterDropdown
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          options={assigneeOptions}
          minMenuWidth="min-w-[195px]"
        />

        <FilterDropdown
          value={dateRangeFilter}
          onChange={setDateRangeFilter}
          options={dateRangeOptions}
          leftIcon={<CalendarIcon className="h-3.5 w-3.5 text-indigo-500" />}
          minMenuWidth="min-w-[175px]"
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 cursor-pointer transition-colors"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-2.5 py-1.5 text-xs text-slate-600 font-semibold">
          <Filter className="h-3.5 w-3.5 text-indigo-500" />
          <span>
            {filteredTasks.length} of {accessibleTasks.length}
          </span>
        </div>
      </div>

      {/* LIST VIEW TABLE */}
      {viewMode === "list" ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 pl-5 pr-3 w-28">Code</th>
                  <th className="py-3.5 px-3 min-w-[280px]">Task</th>
                  <th className="py-3.5 px-3 w-36">SBU</th>
                  <th className="py-3.5 px-3 w-40">Assignee</th>
                  <th className="py-3.5 px-3 w-24">Priority</th>
                  <th className="py-3.5 px-3 w-44">Stage</th>
                  <th className="py-3.5 px-3 w-44">Hours</th>
                  <th className="py-3.5 pl-3 pr-5 w-36">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-16 text-center text-slate-400 text-sm"
                    >
                      No tasks match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task, idx) => {
                    const code = getTaskCode(
                      task,
                      2600 - Math.min(idx, 500)
                    );
                    const assignee = members.find(
                      (m) => m.id === task.assigneeId
                    );
                    const project = projects.find(
                      (p) => p.id === task.projectId
                    );
                    const sbuLabel = task.sbu || project?.business || "Achariya";
                    const sbuStyle =
                      SBU_PILL_STYLES[sbuLabel] ||
                      "bg-indigo-50 text-indigo-700 border-indigo-200/80";
                    const priorityMeta = getTaskPriorityDisplay(task.priority);
                    const statusMeta = getTaskStatusDisplay(task);
                    const metrics = getTaskDeadlineMetrics(task);

                    return (
                      <tr
                        key={task.id}
                        onClick={() =>
                          router.push(`/dashboard/tasks/${task.id}`)
                        }
                        className="hover:bg-indigo-50/35 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 pl-5 pr-3 align-middle">
                          <span className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {code}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          <p className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug group-hover:text-indigo-700 transition-colors">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {task.description
                              ? task.description
                              : `Task assigned by ${task.assignedByName || "Admin"}.`}
                          </p>
                          {task.finalOutputLink && (
                            <a
                              href={task.finalOutputLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600 hover:text-pink-700 underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Final output</span>
                            </a>
                          )}
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${sbuStyle}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                            {sbuLabel}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 ring-1 ring-indigo-500/20">
                                <AvatarImage src={assignee.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-pink-500 text-white text-[9px] font-bold">
                                  {initials(assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-slate-800 truncate max-w-[115px]">
                                {assignee.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityMeta.className}`}
                          >
                            {priorityMeta.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${statusMeta.className}`}
                            >
                              {statusMeta.label}
                            </span>
                            {metrics.isOverdue && task.status !== "review" && (
                              <span className="inline-flex items-center rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700 whitespace-nowrap">
                                Overdue
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                          <span className="font-semibold text-slate-800">
                            {metrics.workedLabel}
                          </span>
                          {metrics.remainingShortLabel && (
                            <>
                              <span className="text-slate-300 mx-1">/</span>
                              <span
                                className={`text-[11px] font-medium ${
                                  metrics.isOverdue
                                    ? "text-rose-600"
                                    : "text-indigo-600"
                                }`}
                              >
                                {metrics.remainingShortLabel}
                              </span>
                            </>
                          )}
                        </td>

                        <td className="py-3.5 pl-3 pr-5 align-middle text-slate-500 font-medium whitespace-nowrap">
                          {metrics.dueColumnLabel}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* BOARD / KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {kanbanColumns.map((col) => {
            const colItems = filteredTasks.filter((t) =>
              col.stages.includes(getTaskStage(t))
            );

            return (
              <div key={col.id} className="flex flex-col">
                <div
                  className={`rounded-t-2xl ${col.headerBg} px-4 py-3 flex items-center justify-between text-white shadow-xs`}
                >
                  <span className="text-xs font-bold truncate">
                    {col.label}
                  </span>
                  <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                    {colItems.length}
                  </span>
                </div>
                <div
                  className={`flex-1 rounded-b-2xl border border-t-0 ${col.bodyBg} p-3 space-y-2.5 min-h-[420px]`}
                >
                  {colItems.map((task, idx) => {
                    const code = getTaskCode(task, 2600 - idx);
                    const assignee = members.find(
                      (m) => m.id === task.assigneeId
                    );
                    const priorityMeta = getTaskPriorityDisplay(task.priority);
                    const statusMeta = getTaskStatusDisplay(task);
                    const metrics = getTaskDeadlineMetrics(task);

                    return (
                      <div
                        key={task.id}
                        onClick={() =>
                          router.push(`/dashboard/tasks/${task.id}`)
                        }
                        className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {code}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityMeta.className}`}
                          >
                            {priorityMeta.label}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-900 leading-snug">
                          {task.title}
                        </p>

                        <div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                          <span>{metrics.dueColumnLabel}</span>
                          {assignee && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={assignee.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-pink-500 text-white text-[8px] font-bold">
                                  {initials(assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[80px]">
                                {assignee.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {colItems.length === 0 && (
                    <div className="h-28 flex items-center justify-center text-xs text-slate-400">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
