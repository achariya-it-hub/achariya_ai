"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  CreativePlatform,
  CreativeType,
  MarketingType,
  Priority,
} from "@/types";
import {
  creativeTypeMeta,
  OFFICE_DAY_HOURS,
} from "@/components/tasks/acms-creative-badges";
import { SBU_OPTIONS } from "@/lib/task-workflow";
import {
  Gauge,
  Clock,
  AlertTriangle,
  Flame,
  ChevronDown,
  Banknote,
  FileText,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

export const DEFAULT_SBUS: string[] = [...SBU_OPTIONS];

export const MARKETING_TYPES: MarketingType[] = [
  "Digital Marketing",
  "Brand Marketing",
  "Performance Marketing",
  "Content Marketing",
  "Event / Offline Marketing",
  "Internal Communications",
  "PR & Influencer Marketing",
];

function formatAssignedTimestamp(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function formatDeadlineDisplay(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} ${month} ${year}, ${timeStr}`;
}

interface NewTaskFormProps {
  defaultProjectId?: string;
  defaultMilestoneId?: string;
  defaultAssigneeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NewTaskForm({
  defaultProjectId,
  defaultMilestoneId,
  defaultAssigneeId,
  onSuccess,
  onCancel,
}: NewTaskFormProps) {
  const { user } = useAuth();
  const members = useCRMStore((s) => s.members);
  const projects = useCRMStore((s) => s.projects);
  const tasks = useCRMStore((s) => s.tasks);
  const addTask = useCRMStore((s) => s.addTask);
  const load = useCRMStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin = user?.role === "admin";

  // Live device "Assigned on" timestamp
  const [assignedAtDate, setAssignedAtDate] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setAssignedAtDate(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const defaultProject = projects.find((p) => p.id === defaultProjectId);

  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId || "");
  const [sbu, setSbu] = useState(defaultProject?.business || "");
  const [marketingType, setMarketingType] =
    useState<string>("Digital Marketing");
  const [creativeType, setCreativeType] = useState<CreativeType | "">("");
  const [platform, setPlatform] = useState<CreativePlatform | "">("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [completionDate, setCompletionDate] = useState("");
  const [completionTime, setCompletionTime] = useState("17:30");
  const [manualWorkload, setManualWorkload] = useState<string>("");
  const [referenceLink, setReferenceLink] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [remarks, setRemarks] = useState("");
  const [payout, setPayout] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const sbuOptions = useMemo(() => {
    return [...SBU_OPTIONS];
  }, []);

  const selectedCreativeMeta = creativeType
    ? creativeTypeMeta[creativeType]
    : undefined;

  const templateWorkloadPct = selectedCreativeMeta?.defaultWorkloadPct ?? 0;
  const hasManualOverride = isAdmin && manualWorkload.trim() !== "";
  const effectiveWorkloadPct = hasManualOverride
    ? Math.max(0, Number(manualWorkload) || 0)
    : templateWorkloadPct;

  const calculatedHours = useMemo(() => {
    if (effectiveWorkloadPct <= 0) return 0;
    return (
      Math.round((effectiveWorkloadPct / 100) * OFFICE_DAY_HOURS * 100) / 100
    );
  }, [effectiveWorkloadPct]);

  const deadlineInfo = useMemo(() => {
    if (!completionDate) return null;
    const timePart = completionTime || "17:30";
    const [yyyy, mm, dd] = completionDate.split("-").map(Number);
    const [hh, min] = timePart.split(":").map(Number);
    if (!yyyy || !mm || !dd) return null;

    const official = new Date(yyyy, mm - 1, dd, hh || 17, min || 30, 0);
    if (isNaN(official.getTime())) return null;

    const warning = new Date(official.getTime() + 24 * 60 * 60 * 1000);
    const critical = new Date(official.getTime() + 48 * 60 * 60 * 1000);

    return {
      official,
      warning,
      critical,
      officialStr: formatDeadlineDisplay(official),
      warningStr: formatDeadlineDisplay(warning),
      criticalStr: formatDeadlineDisplay(critical),
    };
  }, [completionDate, completionTime]);

  const selectedAssignee = members.find((m) => m.id === assigneeId);
  const isTraineeSelected = selectedAssignee?.role === "trainee";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskName.trim()) {
      toast.error("Please enter a task name.");
      return;
    }
    if (!completionDate) {
      toast.error("Please select an estimated completion date.");
      return;
    }

    let resolvedProjectId = defaultProjectId || "";
    if (!resolvedProjectId && sbu) {
      const matchedProj = projects.find(
        (p) =>
          p.business?.toLowerCase() === sbu.toLowerCase() ||
          p.name.toLowerCase().includes(sbu.toLowerCase())
      );
      if (matchedProj) resolvedProjectId = matchedProj.id;
    }
    if (!resolvedProjectId) {
      resolvedProjectId = projects[0]?.id || "p1";
    }

    setSubmitting(true);
    try {
      const nextCwmsNum = 2600 + tasks.length + 1;
      const cwmsCode = `CWMS-${nextCwmsNum}`;
      const creatorName = user?.name || "Admin";
      const initialActivity = [
        {
          id: `act-${Date.now()}`,
          actorName: creatorName,
          action: `Created task (${cwmsCode})`,
          createdAt: assignedAtDate.toISOString(),
        },
      ];

      await addTask({
        projectId: resolvedProjectId,
        milestoneId: defaultMilestoneId || undefined,
        title: taskName.trim(),
        description: description.trim(),
        status: "todo",
        workflowState: assigneeId ? "assigned" : "created",
        priority,
        assigneeId: assigneeId || undefined,
        assignedByName: creatorName,
        dueDate: completionDate,
        dueTime: completionTime || "17:30",
        payout: isAdmin && isTraineeSelected ? Number(payout) || 0 : 0,
        marketingType: marketingType || "Digital Marketing",
        creativeType: (creativeType as CreativeType) || undefined,
        platform: (platform as CreativePlatform) || undefined,
        sbu: sbu || undefined,
        assetCode: cwmsCode,
        taskCode: cwmsCode,
        workloadPercent: effectiveWorkloadPct,
        isManualWorkload: hasManualOverride,
        estimatedHours: calculatedHours > 0 ? calculatedHours : undefined,
        assignedAt: assignedAtDate.toISOString(),
        officialDeadline: deadlineInfo?.official.toISOString(),
        warningDeadline: deadlineInfo?.warning.toISOString(),
        criticalDeadline: deadlineInfo?.critical.toISOString(),
        referenceLink: referenceLink.trim() || null,
        driveLink: driveLink.trim() || null,
        remarks: remarks.trim() || null,
        proofNote: remarks.trim() || null,
        activityLog: initialActivity,
        activityJson: JSON.stringify(initialActivity),
      });

      toast.success("Task created successfully!");
      onSuccess?.();
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error("Failed to create task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectClassName =
    "w-full h-11 appearance-none rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white px-3.5 pr-10 text-sm transition-all outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15";

  const inputClassName =
    "h-11 rounded-xl border-slate-200 bg-slate-50/40 hover:bg-white focus:bg-white text-sm focus-visible:border-indigo-500 focus-visible:ring-indigo-500/15 transition-all";

  return (
    <form
      onSubmit={handleSubmit}
      className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A3A5C] via-indigo-500 to-pink-500" />

      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/15">
          <FileText className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">Task details</h2>
          <p className="text-xs text-slate-500">
            Configure scope, business unit, creative template, and delivery SLA.
          </p>
        </div>
      </div>

      {/* Task Name */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700">
          Task name <span className="text-pink-600">*</span>
        </label>
        <Input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="Enter deliverable title..."
          required
          className={inputClassName}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add creative brief, dimensions, copy notes, or deliverables..."
          rows={3}
          className="min-h-[92px] rounded-xl border-slate-200 bg-slate-50/40 hover:bg-white focus:bg-white text-sm resize-y focus-visible:border-indigo-500 focus-visible:ring-indigo-500/15 transition-all"
        />
      </div>

      {/* Row 1: Assigned to & SBU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Assigned to
          </label>
          <div className="relative">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className={`${selectClassName} ${
                !assigneeId ? "text-slate-400" : "text-slate-900 font-medium"
              }`}
            >
              <option value="">Select employee</option>
              {members
                .filter((m) => m.status !== "inactive")
                .map((m) => (
                  <option key={m.id} value={m.id} className="text-slate-900">
                    {m.name} — {m.title} ({m.employeeId || m.role})
                  </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">SBU</label>
          <div className="relative">
            <select
              value={sbu}
              onChange={(e) => setSbu(e.target.value)}
              className={`${selectClassName} ${
                !sbu ? "text-slate-400" : "text-slate-900 font-medium"
              }`}
            >
              <option value="">Select SBU</option>
              {sbuOptions.map((item) => (
                <option key={item} value={item} className="text-slate-900">
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Row 2: Marketing type & Creative type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Marketing type
          </label>
          <div className="relative">
            <select
              value={marketingType}
              onChange={(e) => setMarketingType(e.target.value)}
              className={`${selectClassName} text-slate-900 font-medium`}
            >
              {MARKETING_TYPES.map((mt) => (
                <option key={mt} value={mt}>
                  {mt}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Creative type
          </label>
          <div className="relative">
            <select
              value={creativeType}
              onChange={(e) =>
                setCreativeType(e.target.value as CreativeType | "")
              }
              className={`${selectClassName} ${
                !creativeType ? "text-slate-400" : "text-slate-900 font-medium"
              }`}
            >
              <option value="">Select type</option>
              {(
                Object.entries(creativeTypeMeta) as [
                  CreativeType,
                  (typeof creativeTypeMeta)[CreativeType],
                ][]
              ).map(([key, meta]) => (
                <option key={key} value={key} className="text-slate-900">
                  {meta.label} ({meta.defaultWorkloadPct}% workload)
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Row 3: Platform & Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Platform
          </label>
          <div className="relative">
            <select
              value={platform}
              onChange={(e) =>
                setPlatform(e.target.value as CreativePlatform | "")
              }
              className={`${selectClassName} ${
                !platform ? "text-slate-400" : "text-slate-900 font-medium"
              }`}
            >
              <option value="">Select platform</option>
              <option value="instagram" className="text-slate-900">
                Instagram
              </option>
              <option value="meta" className="text-slate-900">
                Facebook / Meta
              </option>
              <option value="youtube" className="text-slate-900">
                YouTube
              </option>
              <option value="linkedin" className="text-slate-900">
                LinkedIn
              </option>
              <option value="twitter" className="text-slate-900">
                X (Twitter)
              </option>
              <option value="whatsapp" className="text-slate-900">
                WhatsApp
              </option>
              <option value="website" className="text-slate-900">
                Website / Landing Page
              </option>
              <option value="print" className="text-slate-900">
                Print / Offline
              </option>
              <option value="all" className="text-slate-900">
                Multi-Platform
              </option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Priority
          </label>
          <div className="relative">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className={`${selectClassName} text-slate-900 font-medium`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent / Critical</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Row 4: Estimated completion date & Estimated completion time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Estimated completion date <span className="text-pink-600">*</span>
          </label>
          <Input
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            required
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Estimated completion time <span className="text-pink-600">*</span>
          </label>
          <Input
            type="time"
            value={completionTime}
            onChange={(e) => setCompletionTime(e.target.value)}
            required
            className={inputClassName}
          />
        </div>
      </div>

      {/* Creative Workload Estimate Box */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-pink-50/30 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1A3A5C]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
            <Gauge className="h-4 w-4" />
          </span>
          <span>Creative workload estimate</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Default workload (template)
            </label>
            <div className="h-11 rounded-xl border border-slate-200/90 bg-white px-3.5 flex items-center text-sm shadow-2xs">
              {selectedCreativeMeta ? (
                <span className="font-semibold text-slate-900">
                  {selectedCreativeMeta.defaultWorkloadPct}% —{" "}
                  {selectedCreativeMeta.label} (
                  {Math.round(
                    (selectedCreativeMeta.defaultWorkloadPct / 100) *
                      OFFICE_DAY_HOURS *
                      100
                  ) / 100}
                  h)
                </span>
              ) : (
                <span className="text-slate-400">
                  — &nbsp;Select a creative type to auto-fill
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Manual workload (%) — Super Admin only
            </label>
            <Input
              type="number"
              min={0}
              max={500}
              placeholder="e.g. 100"
              disabled={!isAdmin}
              value={manualWorkload}
              onChange={(e) => setManualWorkload(e.target.value)}
              className={`h-11 rounded-xl border-slate-200 text-sm ${
                isAdmin
                  ? "bg-white focus-visible:border-indigo-500"
                  : "bg-slate-100/70 text-slate-400 cursor-not-allowed"
              }`}
            />
            <p className="text-[11px] text-slate-400">
              {hasManualOverride
                ? `Manual override active (${effectiveWorkloadPct}% overrides creative template).`
                : "Workload is set automatically from the creative template."}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600">
            Estimated hours (auto-calculated)
          </label>
          <div className="min-h-11 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 flex flex-wrap items-center gap-2.5 text-sm shadow-2xs">
            <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="font-bold text-slate-900">
              {calculatedHours > 0 ? `${calculatedHours} hrs` : "—"}
            </span>
            <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200/70 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700">
              {effectiveWorkloadPct}% of a day
            </span>
            <span className="text-xs text-slate-500">
              office hours only (Mon–Sat, 09:00–17:30)
            </span>
          </div>
        </div>
      </div>

      {/* Assigned On & Official / Escalation Deadlines Box */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-3.5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-pink-600 shrink-0" />
          <span className="font-bold text-slate-800">Assigned on</span>
          <span className="inline-flex items-center rounded-full border border-indigo-200/80 bg-white px-3 py-0.5 font-mono text-xs font-bold text-[#1A3A5C] shadow-2xs">
            {formatAssignedTimestamp(assignedAtDate)}
          </span>
          <span className="text-xs text-slate-500">
            (auto — your device time)
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs sm:text-sm flex flex-wrap items-center gap-2 shadow-2xs">
          <span className="font-bold text-[#1A3A5C]">Official deadline:</span>
          <span className="font-mono font-semibold text-indigo-700">
            {deadlineInfo ? deadlineInfo.officialStr : "Select date & time"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-2.5 text-xs font-semibold text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Warning (+1 day):{" "}
              <span className="font-mono font-bold">
                {deadlineInfo ? deadlineInfo.warningStr : "—"}
              </span>
            </span>
          </div>

          <div className="rounded-xl border border-rose-200/90 bg-rose-50/80 px-4 py-2.5 text-xs font-semibold text-rose-900 flex items-center gap-2">
            <Flame className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              Critical (+2 days):{" "}
              <span className="font-mono font-bold">
                {deadlineInfo ? deadlineInfo.criticalStr : "—"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Reference & Drive Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-indigo-500" />
            Reference link
          </label>
          <Input
            type="url"
            value={referenceLink}
            onChange={(e) => setReferenceLink(e.target.value)}
            placeholder="https://..."
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-pink-500" />
            Drive link
          </label>
          <Input
            type="url"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/..."
            className={inputClassName}
          />
        </div>
      </div>

      {/* Remarks */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700">
          Remarks
        </label>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Special instructions or review expectations..."
          rows={3}
          className="min-h-[88px] rounded-xl border-slate-200 bg-slate-50/40 hover:bg-white focus:bg-white text-sm resize-y focus-visible:border-indigo-500 focus-visible:ring-indigo-500/15 transition-all"
        />
      </div>

      {/* Conditional Trainee Payout (Strict Trainee-Only Policy) */}
      {isAdmin && isTraineeSelected && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-[#1A3A5C] to-indigo-900 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-pink-300 shrink-0">
              <Banknote className="h-4 w-4" />
            </span>
            <div>
              <p className="font-bold text-white">
                Trainee Task Payout (₹) — {selectedAssignee?.name}
              </p>
              <p className="text-[11px] text-white/70">
                Credited exclusively to trainees upon completion &amp; approval.
              </p>
            </div>
          </div>
          <Input
            type="number"
            min={0}
            step="1"
            value={payout || ""}
            onChange={(e) => setPayout(Number(e.target.value) || 0)}
            placeholder="0"
            className="h-10 w-full sm:w-40 rounded-xl border-white/20 bg-white text-slate-900 font-bold text-sm"
          />
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 px-6 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 px-7 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold shadow-lg shadow-pink-500/25 border-0 cursor-pointer"
        >
          {submitting ? "Creating..." : "Create task"}
        </Button>
      </div>
    </form>
  );
}
