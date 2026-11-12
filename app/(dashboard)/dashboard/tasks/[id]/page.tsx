"use client";

import React, { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CreativePlatform,
  CreativeType,
  Priority,
  Task,
  TaskActivityLog,
  TaskComment,
  TaskStage,
} from "@/types";
import {
  creativeTypeMeta,
  platformMeta,
  OFFICE_DAY_HOURS,
} from "@/components/tasks/acms-creative-badges";
import { MARKETING_TYPES } from "@/components/tasks/new-task-form";
import {
  SBU_OPTIONS,
  TASK_STAGE_LIST,
  getTaskStage,
  buildStageUpdate,
  getTaskCode,
  getTaskDeadlineMetrics,
  getTaskStatusDisplay,
  getTaskPriorityDisplay,
  getTaskComments,
  getTaskActivities,
  formatRelativeTime,
} from "@/lib/task-workflow";
import { initials } from "@/lib/utils";
import {
  ArrowLeft,
  UserPlus,
  RotateCcw,
  Pencil,
  CheckCircle2,
  Link2,
  ExternalLink,
  Play,
  XCircle,
  AlertCircle,
  MessageSquare,
  Paperclip,
  Activity as ActivityIcon,
  Send,
  Upload,
  Clock,
  Calendar,
  AlertTriangle,
  User,
  ChevronDown,
  Banknote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const tasks = useCRMStore((s) => s.tasks);
  const members = useCRMStore((s) => s.members);
  const updateTask = useCRMStore((s) => s.updateTask);
  const deleteTask = useCRMStore((s) => s.deleteTask);
  const addTaskProof = useCRMStore((s) => s.addTaskProof);
  const removeTaskProof = useCRMStore((s) => s.removeTaskProof);
  const load = useCRMStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const task = tasks.find((t) => t.id === id);

  const [editingHeader, setEditingHeader] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [remarksDraft, setRemarksDraft] = useState("");
  const [editingRemarks, setEditingRemarks] = useState(false);

  const [activeTab, setActiveTab] = useState<"comments" | "attachments" | "activity">("comments");
  const [commentText, setCommentText] = useState("");

  // Approval / Review state
  const [reviewNotes, setReviewNotes] = useState("");

  // Submit for approval modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitDriveUrl, setSubmitDriveUrl] = useState("");
  const [submitRemarks, setSubmitRemarks] = useState("");

  // Attachments & Links tab state
  const [refLinkDraft, setRefLinkDraft] = useState("");
  const [driveLinkDraft, setDriveLinkDraft] = useState("");
  const [finalOutputDraft, setFinalOutputDraft] = useState("");
  const [payoutDraft, setPayoutDraft] = useState<number>(0);

  const assigneeSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title);
      setDescDraft(task.description || "");
      setRemarksDraft(task.remarks || task.proofNote || "");
      setSubmitDriveUrl(task.finalOutputLink || "");
      setRefLinkDraft(task.referenceLink || "");
      setDriveLinkDraft(task.driveLink || "");
      setFinalOutputDraft(task.finalOutputLink || "");
      setPayoutDraft(task.payout || 0);
    }
  }, [task]);

  if (!task) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center space-y-4">
        <p className="text-slate-500 text-sm">Task not found.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/tasks")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Tasks
        </Button>
      </div>
    );
  }

  const role = user?.role || "trainee";
  const isAdmin = role === "admin";
  const isElevated = role === "admin" || role === "manager";

  const code = getTaskCode(task);
  const currentStage = getTaskStage(task);
  const statusMeta = getTaskStatusDisplay(task);
  const priorityMeta = getTaskPriorityDisplay(task.priority);
  const metrics = getTaskDeadlineMetrics(task);
  const comments = getTaskComments(task);
  const activities = getTaskActivities(task);
  const assignee = members.find((m) => m.id === task.assigneeId);

  const appendActivity = (actionText: string): TaskActivityLog[] => {
    const entry: TaskActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actorName: user?.name || "Team Member",
      action: actionText,
      createdAt: new Date().toISOString(),
    };
    return [entry, ...activities];
  };

  const handleFieldUpdate = async (updates: Partial<Task>, activityDesc?: string) => {
    const nextPayload: Partial<Task> = { ...updates };
    if (activityDesc) {
      const nextAct = appendActivity(activityDesc);
      nextPayload.activityLog = nextAct;
      nextPayload.activityJson = JSON.stringify(nextAct);
    }
    await updateTask(task.id, nextPayload);
  };

  const handleSaveHeader = async () => {
    if (!titleDraft.trim()) {
      toast.error("Task title cannot be empty.");
      return;
    }
    await handleFieldUpdate(
      { title: titleDraft.trim(), description: descDraft.trim() },
      `Updated task title / description`
    );
    setEditingHeader(false);
    toast.success("Task updated");
  };

  const handleTogglePause = async () => {
    const nextPaused = !task.isPaused;
    await handleFieldUpdate(
      {
        isPaused: nextPaused,
        workflowState: nextPaused ? "paused" : "active",
      },
      nextPaused ? "Paused task timer" : "Resumed task"
    );
    toast.success(nextPaused ? "Task paused" : "Task resumed");
  };

  const handleOpenSubmitModal = () => {
    setSubmitDriveUrl(task.finalOutputLink || "");
    setSubmitRemarks("");
    setSubmitModalOpen(true);
  };

  const handleConfirmSubmitForApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitDriveUrl.trim()) {
      toast.error("Final Google Drive output link is required.");
      return;
    }

    const workedHours = Math.round((metrics.workedMinutes / 60) * 100) / 100;
    const isCorrectionResubmit =
      currentStage === "correction-required" || !!task.reviewFeedback;
    const nextStage: TaskStage = isCorrectionResubmit
      ? "correction-submitted"
      : "awaiting-approval";
    const nextAct = appendActivity(
      isCorrectionResubmit
        ? `Submitted correction for approval (${metrics.workedLabel})`
        : `Submitted task for approval (${metrics.workedLabel})`
    );

    let nextComments = comments;
    if (submitRemarks.trim()) {
      const c: TaskComment = {
        id: `cmt-${Date.now()}`,
        authorId: user?.id || "u",
        authorName: user?.name || "Member",
        content: `${isCorrectionResubmit ? "Correction submitted" : "Submitted for approval"}: ${submitRemarks.trim()}`,
        createdAt: new Date().toISOString(),
      };
      nextComments = [...comments, c];
    }

    await updateTask(task.id, {
      status: "review",
      workflowState: nextStage,
      isPaused: false,
      finalOutputLink: submitDriveUrl.trim(),
      submissionRemarks: submitRemarks.trim() || null,
      actualHours: workedHours,
      activityLog: nextAct,
      activityJson: JSON.stringify(nextAct),
      comments: nextComments,
      commentsJson: JSON.stringify(nextComments),
    });

    setSubmitModalOpen(false);
    toast.success(
      isCorrectionResubmit
        ? "Correction submitted for review!"
        : "Submitted for admin approval!"
    );
  };

  const handleSetStage = async (stage: TaskStage) => {
    const stageObj = TASK_STAGE_LIST.find((s) => s.value === stage);
    const payload = buildStageUpdate(stage);
    await handleFieldUpdate(
      payload,
      `Moved stage to ${stageObj?.label || stage}`
    );
    toast.success(`Stage updated to ${stageObj?.label || stage}`);
  };

  // Admin Approval Actions
  const handleApproveAndComplete = async (targetStage: "approved" | "completed" = "completed") => {
    const nowIso = new Date().toISOString();
    const labelText =
      targetStage === "approved" ? "Approved task" : "Approved & completed task";
    const nextAct = appendActivity(
      reviewNotes.trim()
        ? `${labelText} — "${reviewNotes.trim()}"`
        : labelText
    );

    let nextComments = comments;
    if (reviewNotes.trim()) {
      nextComments = [
        ...comments,
        {
          id: `cmt-${Date.now()}`,
          authorId: user?.id || "admin",
          authorName: user?.name || "Admin",
          content: `Approved: ${reviewNotes.trim()}`,
          createdAt: nowIso,
        },
      ];
    }

    await updateTask(task.id, {
      status: "done",
      workflowState: targetStage,
      isPaused: false,
      completedAt: nowIso,
      payoutStatus: "approved",
      reviewFeedback: null,
      activityLog: nextAct,
      activityJson: JSON.stringify(nextAct),
      comments: nextComments,
      commentsJson: JSON.stringify(nextComments),
    });

    setReviewNotes("");
    toast.success(
      targetStage === "approved"
        ? "Task marked Approved!"
        : "Task approved & marked completed!"
    );
  };

  const handleReturnForCorrection = async () => {
    if (!reviewNotes.trim()) {
      toast.error("Review notes are required to return a task for correction.");
      return;
    }
    const nowIso = new Date().toISOString();
    const nextAct = appendActivity(
      `Returned for correction: "${reviewNotes.trim()}"`
    );
    const nextComments: TaskComment[] = [
      ...comments,
      {
        id: `cmt-${Date.now()}`,
        authorId: user?.id || "admin",
        authorName: user?.name || "Admin",
        content: `Correction required: ${reviewNotes.trim()}`,
        createdAt: nowIso,
      },
    ];

    await updateTask(task.id, {
      status: "in-progress",
      workflowState: "correction-required",
      reviewFeedback: reviewNotes.trim(),
      activityLog: nextAct,
      activityJson: JSON.stringify(nextAct),
      comments: nextComments,
      commentsJson: JSON.stringify(nextComments),
    });

    setReviewNotes("");
    toast.warning("Task returned to assignee (Correction Required).");
  };

  const handleRejectTask = async () => {
    if (!reviewNotes.trim()) {
      toast.error("Review notes are required to reject a task.");
      return;
    }
    const nowIso = new Date().toISOString();
    const nextAct = appendActivity(`Rejected task: "${reviewNotes.trim()}"`);
    const nextComments: TaskComment[] = [
      ...comments,
      {
        id: `cmt-${Date.now()}`,
        authorId: user?.id || "admin",
        authorName: user?.name || "Admin",
        content: `Rejected: ${reviewNotes.trim()}`,
        createdAt: nowIso,
      },
    ];

    await updateTask(task.id, {
      status: "backlog",
      workflowState: "rejected",
      reviewFeedback: reviewNotes.trim(),
      activityLog: nextAct,
      activityJson: JSON.stringify(nextAct),
      comments: nextComments,
      commentsJson: JSON.stringify(nextComments),
    });

    setReviewNotes("");
    toast.error("Task rejected.");
  };

  const handleCancelTask = async () => {
    if (!confirm(`Cancel task "${task.title}"?`)) return;
    await handleFieldUpdate(
      { workflowState: "cancelled", isPaused: false },
      "Cancelled task"
    );
    toast.info("Task cancelled");
  };

  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;
    const newComment: TaskComment = {
      id: `cmt-${Date.now()}`,
      authorId: user?.id || "u",
      authorName: user?.name || "Team Member",
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextComments = [...comments, newComment];
    const nextAct = appendActivity("Posted a comment");
    setCommentText("");
    await updateTask(task.id, {
      comments: nextComments,
      commentsJson: JSON.stringify(nextComments),
      activityLog: nextAct,
      activityJson: JSON.stringify(nextAct),
    });
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        await addTaskProof(task.id, {
          name: data.name || file.name,
          url: data.url,
          type: "upload",
        });
        toast.success("Attachment uploaded");
      }
    } catch {
      toast.error("Upload failed");
    }
    e.target.value = "";
  };

  const handleSaveLinks = async () => {
    const updates: Partial<Task> = {
      referenceLink: refLinkDraft.trim() || null,
      driveLink: driveLinkDraft.trim() || null,
      finalOutputLink: finalOutputDraft.trim() || null,
    };
    if (isAdmin && assignee?.role === "trainee") {
      updates.payout = Number(payoutDraft) || 0;
    }
    await handleFieldUpdate(updates, "Updated deliverable & reference links");
    toast.success("Links saved");
  };

  const assignedDateFormatted = metrics.assignedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const assignedTimeFormatted = metrics.assignedDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const completedOnFormatted = task.completedAt
    ? new Date(task.completedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* HERO COMMAND TOP BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A3A5C] via-[#1f3e68] to-[#2b2a5a] p-5 sm:p-6 text-white shadow-xl shadow-slate-900/10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-pink-500/20 blur-3xl"
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer mr-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Tasks</span>
            </button>

            <span className="rounded-lg bg-white/15 border border-white/20 px-2.5 py-1 font-mono text-xs font-bold text-pink-200">
              {code}
            </span>

            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>

            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityMeta.className}`}
            >
              {priorityMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                assigneeSelectRef.current?.focus();
                assigneeSelectRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                toast.info("Select a team member in the Assignee dropdown on the right.");
              }}
              className="h-9 rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white hover:text-white gap-1.5 backdrop-blur-md"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Reassign
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTogglePause}
              className="h-9 rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white hover:text-white gap-1.5 backdrop-blur-md"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {task.isPaused ? "Resume" : "Pause"}
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT MAIN COLUMN (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* TASK HEADER + DELIVERABLE + WORKFLOW CARD */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A3A5C] via-indigo-500 to-pink-500" />
            {editingHeader ? (
              <div className="space-y-3">
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="text-base font-bold h-11 rounded-xl focus-visible:border-indigo-500"
                  placeholder="Task name"
                />
                <Textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  rows={3}
                  className="text-sm rounded-xl focus-visible:border-indigo-500"
                  placeholder="Task description..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTitleDraft(task.title);
                      setDescDraft(task.description || "");
                      setEditingHeader(false);
                    }}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveHeader}
                    className="rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white text-xs font-bold border-0"
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                    {task.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {task.description
                      ? task.description
                      : `Task assigned by ${task.assignedByName || "Admin"}.`}
                  </p>
                  {task.description && task.assignedByName && (
                    <p className="text-xs text-slate-400">
                      Assigned by {task.assignedByName}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingHeader(true)}
                  className="h-9 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 shrink-0 gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit name
                </Button>
              </div>
            )}

            {/* Remarks Box */}
            {(task.remarks || task.proofNote || editingRemarks) && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Remarks
                  </span>
                  {!editingRemarks && (
                    <button
                      type="button"
                      onClick={() => setEditingRemarks(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingRemarks ? (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      value={remarksDraft}
                      onChange={(e) => setRemarksDraft(e.target.value)}
                      rows={2}
                      className="bg-white text-sm rounded-xl focus-visible:border-indigo-500"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRemarks(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await handleFieldUpdate(
                            {
                              remarks: remarksDraft.trim() || null,
                              proofNote: remarksDraft.trim() || null,
                            },
                            "Updated task remarks"
                          );
                          setEditingRemarks(false);
                          toast.success("Remarks saved");
                        }}
                        className="h-7 text-xs bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white border-0"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">
                    {task.remarks || task.proofNote}
                  </p>
                )}
              </div>
            )}

            {/* Returned / Rejection Review Notes Banner */}
            {task.reviewFeedback && task.status !== "done" && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 flex items-start gap-2.5 text-xs text-rose-900">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Admin Review Notes:</p>
                  <p className="mt-0.5 leading-relaxed">{task.reviewFeedback}</p>
                </div>
              </div>
            )}

            {/* Final Output Submitted Card */}
            {task.finalOutputLink && (
              <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/60 via-violet-50/40 to-pink-50/30 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1A3A5C]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Final output submitted</span>
                </div>
                <p className="text-xs text-slate-500">
                  Submitted Google Drive deliverable — permanently stored and available before and after approval.
                </p>
                <a
                  href={task.finalOutputLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-indigo-200/80 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 hover:border-indigo-400 hover:text-indigo-700 transition-colors shadow-2xs"
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <Link2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="font-semibold">Final output</span>
                    <span className="text-slate-400 font-normal truncate hidden sm:inline">
                      — {task.finalOutputLink}
                    </span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-indigo-500 shrink-0 ml-2" />
                </a>
              </div>
            )}

            {/* WORKFLOW ACTION CARD */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1A3A5C]">
                <Play className="h-3.5 w-3.5 text-indigo-600" />
                <span>Workflow — {statusMeta.label}</span>
              </div>

              {(task.status === "review" ||
                currentStage === "awaiting-approval" ||
                currentStage === "in-review" ||
                currentStage === "correction-submitted") &&
              isElevated ? (
                /* ADMIN APPROVAL WORKFLOW (11-Stage Controls) */
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {currentStage !== "in-review" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSetStage("in-review")}
                        className="h-9 px-3.5 rounded-xl border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs font-semibold"
                      >
                        Mark In Review
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={() => handleApproveAndComplete("completed")}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-emerald-500/20 border-0"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve &amp; complete
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleApproveAndComplete("approved")}
                      className="h-9 px-3.5 rounded-xl border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold"
                    >
                      Approve
                    </Button>

                    <Button
                      type="button"
                      onClick={handleReturnForCorrection}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-amber-500/20 border-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Return for correction
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRejectTask}
                      className="h-9 px-4 rounded-xl border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold gap-1.5"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelTask}
                      className="h-9 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium"
                    >
                      Cancel task
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Review notes (required to return or reject)
                    </label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      placeholder="Add optional approval feedback or required revision details..."
                      className="bg-white border-slate-200 focus-visible:border-indigo-500 rounded-xl text-xs sm:text-sm min-h-[76px]"
                    />
                  </div>
                </div>
              ) : task.status === "done" ||
                currentStage === "completed" ||
                currentStage === "approved" ||
                currentStage === "cancelled" ||
                task.workflowState === "rejected" ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-600">
                    This task is currently marked as{" "}
                    <strong>{statusMeta.label}</strong>.
                  </p>
                  <div className="flex items-center gap-2">
                    {isElevated && currentStage === "approved" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSetStage("completed")}
                        className="h-8 rounded-xl text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
                      >
                        Mark Completed
                      </Button>
                    )}
                    {isElevated && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetStage("in-progress")}
                        className="h-8 rounded-xl text-xs bg-white"
                      >
                        Reopen task
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* ASSIGNEE / IN-PROGRESS WORKFLOW (11-Stage Flow) */
                <div className="flex flex-wrap items-center gap-2.5">
                  {(currentStage === "created" || currentStage === "assigned") && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSetStage("accepted")}
                      className="h-9 px-3.5 rounded-xl border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold"
                    >
                      Accept task
                    </Button>
                  )}

                  {(currentStage === "created" ||
                    currentStage === "assigned" ||
                    currentStage === "accepted") && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSetStage("in-progress")}
                      className="h-9 px-3.5 rounded-xl border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 text-xs font-semibold"
                    >
                      Start work
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={handleOpenSubmitModal}
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white text-xs font-bold gap-1.5 shadow-lg shadow-pink-500/20 border-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {task.status === "review"
                      ? "Update submitted output"
                      : currentStage === "correction-required"
                      ? "Submit correction"
                      : "Submit for approval"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelTask}
                    className="h-9 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium"
                  >
                    Cancel task
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* COMMENTS / ATTACHMENTS & LINKS / ACTIVITY TABS CARD */}
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="flex items-center gap-6 px-6 pt-4 border-b border-slate-100 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setActiveTab("comments")}
                className={`pb-3 inline-flex items-center gap-1.5 font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "comments"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Comments</span>
                {comments.length > 0 && (
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-bold">
                    {comments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("attachments")}
                className={`pb-3 inline-flex items-center gap-1.5 font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "attachments"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Paperclip className="h-4 w-4" />
                <span>Attachments &amp; Links</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("activity")}
                className={`pb-3 inline-flex items-center gap-1.5 font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "activity"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <ActivityIcon className="h-4 w-4" />
                <span>Activity</span>
              </button>
            </div>

            <div className="p-6">
              {activeTab === "comments" && (
                <div className="space-y-5">
                  <form onSubmit={handlePostComment} className="flex items-start gap-3">
                    <div className="relative flex-1">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        rows={2}
                        className="rounded-xl border-slate-200 focus-visible:border-indigo-500 bg-white pr-10 text-sm min-h-[72px]"
                      />
                      <label
                        title="Upload attachment"
                        className="absolute bottom-2.5 right-2.5 h-6 w-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer shadow-2xs"
                      >
                        <Upload className="h-3 w-3" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleUploadAttachment}
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="h-10 w-11 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm"
                      title="Send comment"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>

                  {comments.length === 0 ? (
                    <p className="text-center text-xs sm:text-sm text-slate-400 py-6">
                      No comments yet. Start the discussion.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((cmt) => (
                        <div
                          key={cmt.id}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[#1A3A5C] to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {initials(cmt.authorName)}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-slate-900">
                                {cmt.authorName}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {formatRelativeTime(cmt.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-700 pl-9 whitespace-pre-wrap">
                            {cmt.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "attachments" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reference link
                      </label>
                      <Input
                        value={refLinkDraft}
                        onChange={(e) => setRefLinkDraft(e.target.value)}
                        placeholder="https://..."
                        className="h-10 rounded-xl text-xs focus-visible:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Drive link
                      </label>
                      <Input
                        value={driveLinkDraft}
                        onChange={(e) => setDriveLinkDraft(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="h-10 rounded-xl text-xs focus-visible:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Final Google Drive output link
                      </label>
                      <Input
                        value={finalOutputDraft}
                        onChange={(e) => setFinalOutputDraft(e.target.value)}
                        placeholder="https://docs.google.com/..."
                        className="h-10 rounded-xl text-xs focus-visible:border-indigo-500"
                      />
                    </div>

                    {isAdmin && assignee?.role === "trainee" && (
                      <div>
                        <label className="block text-xs font-semibold text-indigo-700 mb-1">
                          Trainee Payout (₹)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={payoutDraft || ""}
                          onChange={(e) => setPayoutDraft(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-10 rounded-xl text-xs max-w-xs focus-visible:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                      <Upload className="h-3.5 w-3.5" />
                      Upload file attachment
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleUploadAttachment}
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveLinks}
                      className="rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white text-xs font-bold border-0"
                    >
                      Save links
                    </Button>
                  </div>

                  {task.proofs && task.proofs.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-semibold text-slate-600">
                        Uploaded Files ({task.proofs.length})
                      </p>
                      {task.proofs.map((proof) => (
                        <div
                          key={proof.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        >
                          <a
                            href={proof.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-700 hover:text-indigo-700 font-medium truncate flex items-center gap-1.5"
                          >
                            <Paperclip className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{proof.name || proof.url}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => removeTaskProof(task.id, proof.id)}
                            className="text-slate-400 hover:text-rose-600 ml-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">
                          {act.actorName}
                        </span>{" "}
                        <span className="text-slate-600">{act.action}</span>
                      </div>
                      <span className="text-slate-400 shrink-0">
                        {formatRelativeTime(act.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR DETAILS COLUMN (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A3A5C] to-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Details</h2>

            <div className="space-y-3 text-xs">
              {/* Assignee */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Assignee
                </span>
                <div className="col-span-7 relative">
                  <select
                    ref={assigneeSelectRef}
                    value={task.assigneeId || ""}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const nextMember = members.find((m) => m.id === nextId);
                      handleFieldUpdate(
                        { assigneeId: nextId || undefined },
                        `Reassigned to ${nextMember?.name || "Unassigned"}`
                      );
                      toast.success("Assignee updated");
                    }}
                    className="w-full h-8 appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Assigned by */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Assigned by
                </span>
                <span className="col-span-7 font-medium text-slate-800">
                  {task.assignedByName || "Admin"}
                </span>
              </div>

              {/* Assigned date */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Assigned date
                </span>
                <span className="col-span-7 font-medium text-slate-800">
                  {assignedDateFormatted}
                </span>
              </div>

              {/* Assigned time */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Assigned time
                </span>
                <span className="col-span-7 font-medium text-slate-800">
                  {assignedTimeFormatted}
                </span>
              </div>

              {/* Est. completion date */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5 leading-tight">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Est. completion date</span>
                </span>
                <div className="col-span-7">
                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const timePart = task.dueTime || "17:30";
                      let officialIso: string | undefined = undefined;
                      if (newDate) {
                        const [y, m, d] = newDate.split("-").map(Number);
                        const [hh, mm] = timePart.split(":").map(Number);
                        officialIso = new Date(y, m - 1, d, hh || 17, mm || 30).toISOString();
                      }
                      handleFieldUpdate(
                        { dueDate: newDate || undefined, officialDeadline: officialIso },
                        `Updated completion date to ${newDate}`
                      );
                    }}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Est. completion time */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5 leading-tight">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Est. completion time</span>
                </span>
                <div className="col-span-7">
                  <input
                    type="time"
                    value={task.dueTime || "17:30"}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      let officialIso = task.officialDeadline;
                      if (task.dueDate) {
                        const [y, m, d] = task.dueDate.slice(0, 10).split("-").map(Number);
                        const [hh, mm] = newTime.split(":").map(Number);
                        officialIso = new Date(y, m - 1, d, hh || 17, mm || 30).toISOString();
                      }
                      handleFieldUpdate(
                        { dueTime: newTime, officialDeadline: officialIso },
                        `Updated completion time to ${newTime}`
                      );
                    }}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Official deadline */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5 leading-tight">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Official deadline</span>
                </span>
                <span className="col-span-7 font-semibold text-slate-800">
                  {metrics.officialDeadlineLabel}
                </span>
              </div>

              {/* Escalation */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                  Escalation
                </span>
                <div className="col-span-7">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      metrics.escalation === "Critical"
                        ? "bg-rose-100 text-rose-700"
                        : metrics.escalation === "Warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {metrics.escalation}
                  </span>
                </div>
              </div>

              {/* Execution time */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Execution time
                </span>
                <span className="col-span-7 font-semibold text-indigo-700">
                  {metrics.executionTimeLabel}
                </span>
              </div>

              {/* Remaining time */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Remaining time
                </span>
                <span
                  className={`col-span-7 font-semibold ${
                    metrics.isOverdue ? "text-rose-600" : "text-slate-800"
                  }`}
                >
                  {metrics.remainingDetailLabel}
                </span>
              </div>

              {/* Stage (11 Official Lifecycle Stages) */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500">Task stage</span>
                <div className="col-span-7 relative">
                  <select
                    value={currentStage}
                    disabled={!isElevated && task.assigneeId !== user?.id}
                    onChange={(e) => handleSetStage(e.target.value as TaskStage)}
                    className="w-full h-8 appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 disabled:opacity-60"
                  >
                    {TASK_STAGE_LIST.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Priority */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500">Priority</span>
                <div className="col-span-7 relative">
                  <select
                    value={task.priority}
                    onChange={(e) =>
                      handleFieldUpdate(
                        { priority: e.target.value as Priority },
                        `Changed priority to ${e.target.value}`
                      )
                    }
                    className="w-full h-8 appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Critical</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="border-t border-slate-100 my-2" />

              {/* SBU */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500">SBU</span>
                <div className="col-span-7 relative">
                  <select
                    value={task.sbu || ""}
                    onChange={(e) =>
                      handleFieldUpdate(
                        { sbu: e.target.value || undefined },
                        `Changed SBU to ${e.target.value}`
                      )
                    }
                    className="w-full h-8 appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="">Select SBU</option>
                    {SBU_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Creative type */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500">Creative type</span>
                <div className="col-span-7 relative">
                  <select
                    value={task.creativeType || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        const custom = window.prompt(
                          "Enter custom creative type:",
                          task.creativeType && !creativeTypeMeta[task.creativeType]
                            ? task.creativeType
                            : ""
                        );
                        if (!custom || !custom.trim()) return;
                        const ct = custom.trim();
                        const pct = 30;
                        const estHrs =
                          Math.round((pct / 100) * OFFICE_DAY_HOURS * 100) / 100;
                        handleFieldUpdate(
                          {
                            creativeType: ct,
                            workloadPercent: pct,
                            estimatedHours: estHrs,
                          },
                          `Changed creative type to ${ct}`
                        );
                        return;
                      }
                      const ct = (val as CreativeType) || undefined;
                      const pct = ct ? creativeTypeMeta[ct]?.defaultWorkloadPct : undefined;
                      const estHrs =
                        pct !== undefined
                          ? Math.round((pct / 100) * OFFICE_DAY_HOURS * 100) / 100
                          : task.estimatedHours;
                      handleFieldUpdate(
                        {
                          creativeType: ct,
                          workloadPercent: pct,
                          estimatedHours: estHrs,
                        },
                        `Changed creative type to ${ct || "None"}`
                      );
                    }}
                    className="w-full h-8 appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="">—</option>
                    {task.creativeType && !creativeTypeMeta[task.creativeType] && (
                      <option value={task.creativeType}>
                        {task.creativeType} (Custom)
                      </option>
                    )}
                    {(
                      Object.entries(creativeTypeMeta) as [
                        CreativeType,
                        (typeof creativeTypeMeta)[CreativeType],
                      ][]
                    ).map(([k, m]) => (
                      <option key={k} value={k}>
                        {m.label}
                      </option>
                    ))}
                    <option value="__custom__">+ Custom Creative (Type in...)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Platform */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500">Platform</span>
                <div className="col-span-7 relative">
                  <select
                    value={task.platform || ""}
                    onChange={(e) =>
                      handleFieldUpdate(
                        { platform: (e.target.value as CreativePlatform) || undefined },
                        `Changed platform to ${e.target.value || "None"}`
                      )
                    }
                    className="w-full h-8 appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="">—</option>
                    {(
                      Object.entries(platformMeta) as [
                        CreativePlatform,
                        (typeof platformMeta)[CreativePlatform],
                      ][]
                    ).map(([k, m]) => (
                      <option key={k} value={k}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Marketing */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500">Marketing</span>
                <div className="col-span-7 relative">
                  <select
                    value={task.marketingType || "Digital Marketing"}
                    onChange={(e) =>
                      handleFieldUpdate(
                        { marketingType: e.target.value },
                        `Changed marketing type to ${e.target.value}`
                      )
                    }
                    className="w-full h-8 appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                  >
                    {MARKETING_TYPES.map((mt) => (
                      <option key={mt} value={mt}>
                        {mt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="border-t border-slate-100 my-2" />

              {/* Assigned on */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500">Assigned on</span>
                <span className="col-span-7 font-medium text-slate-700">
                  {assignedDateFormatted}
                </span>
              </div>

              {/* Completed on */}
              <div className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-slate-500">Completed on</span>
                <span className="col-span-7 font-medium text-slate-700">
                  {completedOnFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* LINKS CARD */}
          {(task.referenceLink || task.driveLink || task.finalOutputLink) && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-2.5 text-xs">
              <h3 className="text-sm font-bold text-slate-900">Links</h3>
              {task.referenceLink && (
                <a
                  href={task.referenceLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <span className="font-medium">Reference link</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {task.driveLink && (
                <a
                  href={task.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <span className="font-medium">Working Drive link</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {task.finalOutputLink && (
                <a
                  href={task.finalOutputLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-indigo-800 hover:border-indigo-400 transition-colors"
                >
                  <span className="font-semibold">Final output deliverable</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SUBMIT TASK FOR APPROVAL MODAL */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Submit task for approval
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmSubmitForApproval} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Final Google Drive output link <span className="text-rose-500">*</span>
              </label>
              <Input
                type="url"
                required
                value={submitDriveUrl}
                onChange={(e) => setSubmitDriveUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/... or https://drive.google.com/..."
                className="h-11 rounded-xl border-indigo-400 focus-visible:border-indigo-600 focus-visible:ring-indigo-600/20 text-sm"
              />
              <p className="text-[11px] text-slate-500">
                Required — an admin will review this link before approval.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Actual working time (auto-calculated)
              </label>
              <div className="h-11 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3.5 flex items-center gap-2 text-sm text-slate-800">
                <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="font-semibold text-[#1A3A5C]">
                  Completed in {metrics.workedLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Office hours from task start to now (Mon–Sat, 09:00–17:30).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Submission remarks (optional)
              </label>
              <Textarea
                value={submitRemarks}
                onChange={(e) => setSubmitRemarks(e.target.value)}
                rows={3}
                className="rounded-xl border-slate-200 focus-visible:border-indigo-500 bg-white text-sm min-h-[84px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitModalOpen(false)}
                className="h-10 px-5 rounded-xl border-slate-200 bg-white text-slate-700 font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold shadow-lg shadow-pink-500/20 border-0"
              >
                Submit for approval
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

