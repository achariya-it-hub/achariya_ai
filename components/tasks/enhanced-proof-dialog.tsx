"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Task, Project, TeamMember, Subtask, CreativePlatform, CreativeType } from "@/types";
import { PlatformBadge, CreativeTypeBadge, ACMSLifecycleStepper } from "./acms-creative-badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRMStore } from "@/store/crm-store";
import { formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  ThumbsUp,
  RotateCcw,
  ShieldCheck,
  Paperclip,
  Upload,
  Link2,
  Eye,
  ExternalLink,
  Calendar as CalendarIcon,
  Banknote,
} from "lucide-react";

interface EnhancedProofDialogProps {
  task: Task | null;
  onClose: () => void;
  isAdmin: boolean;
  isElevated: boolean;
}

export function EnhancedProofDialog({ task, onClose, isAdmin, isElevated }: EnhancedProofDialogProps) {
  const members = useCRMStore((s) => s.members);
  const projects = useCRMStore((s) => s.projects);
  const updateTask = useCRMStore((s) => s.updateTask);
  const deleteTask = useCRMStore((s) => s.deleteTask);
  const addTaskProof = useCRMStore((s) => s.addTaskProof);
  const removeTaskProof = useCRMStore((s) => s.removeTaskProof);

  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [payoutDraft, setPayoutDraft] = useState(0);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [showRevisionBox, setShowRevisionBox] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [platform, setPlatform] = useState<CreativePlatform | undefined>(undefined);
  const [creativeType, setCreativeType] = useState<CreativeType | undefined>(undefined);
  const [sbu, setSbu] = useState("");
  const [taskCode, setTaskCode] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<number | "">("");
  const [actualHours, setActualHours] = useState<number | "">("");
  const [referenceLink, setReferenceLink] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [finalOutputLink, setFinalOutputLink] = useState("");

  useEffect(() => {
    if (task) {
      setProofNote(task.proofNote || "");
      setPayoutDraft(task.payout || 0);
      setSubtasks(task.subtasks || []);
      setRevisionFeedback(task.reviewFeedback || "");
      setShowRevisionBox(false);
      setPreviewImgUrl(null);
      setSaveMsg("");
      setProofUrl("");
      setPlatform(task.platform);
      setCreativeType(task.creativeType);
      setSbu(task.sbu || "");
      setTaskCode(task.taskCode || task.assetCode || "");
      setEstimatedHours(task.estimatedHours ?? "");
      setActualHours(task.actualHours ?? "");
      setReferenceLink(task.referenceLink || "");
      setDriveLink(task.driveLink || "");
      setFinalOutputLink(task.finalOutputLink || "");
    }
  }, [task]);

  if (!task) return null;

  const assignee = members.find((m) => m.id === task.assigneeId);
  const isTraineeTask = assignee?.role === "trainee";
  const project = projects.find((p) => p.id === task.projectId);

  // Subtask handlers
  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    const item: Subtask = {
      id: `st-${Date.now()}`,
      title: newSubtask.trim(),
      completed: false,
    };
    const updated = [...subtasks, item];
    setSubtasks(updated);
    setNewSubtask("");
    await updateTask(task.id, { subtasks: updated });
  };

  const handleToggleSubtask = async (id: string) => {
    const updated = subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st));
    setSubtasks(updated);
    await updateTask(task.id, { subtasks: updated });
  };

  const handleDeleteSubtask = async (id: string) => {
    const updated = subtasks.filter((st) => st.id !== id);
    setSubtasks(updated);
    await updateTask(task.id, { subtasks: updated });
  };

  // Proof handlers
  const handleAddProofUrl = async () => {
    if (!proofUrl.trim()) return;
    await addTaskProof(task.id, {
      name: proofUrl.trim().split("/").pop() || "Proof Link",
      url: proofUrl.trim(),
      type: "link",
    });
    setProofUrl("");
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      await addTaskProof(task.id, {
        name: data.name || file.name,
        url: data.url,
        type: "upload",
      });
    }
    e.target.value = "";
  };

  const handleSaveDetails = async () => {
    const updates: Partial<Task> = {
      proofNote: proofNote || null,
      platform,
      creativeType,
      sbu: sbu || undefined,
      referenceLink: referenceLink || null,
      driveLink: driveLink || null,
      finalOutputLink: finalOutputLink || null,
      estimatedHours: estimatedHours === "" ? undefined : Number(estimatedHours),
      actualHours: actualHours === "" ? undefined : Number(actualHours),
    };
    if (isAdmin && isTraineeTask) {
      updates.payout = Number(payoutDraft) || 0;
    }
    await updateTask(task.id, updates);
    setSaveMsg("Saved ✓");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  // Manager Approval & Revisions
  const handleApprove = async () => {
    await updateTask(task.id, {
      status: "done",
      payoutStatus: "approved",
      reviewFeedback: null,
    });
    setSaveMsg("Approved & Marked Done ✓");
    setTimeout(onClose, 800);
  };

  const handleRequestRevision = async () => {
    if (!revisionFeedback.trim()) return;
    await updateTask(task.id, {
      status: "in-progress",
      reviewFeedback: revisionFeedback.trim(),
    });
    setShowRevisionBox(false);
    setSaveMsg("Revision feedback sent to assignee ✓");
    setTimeout(onClose, 800);
  };

  const completedSubtasksCount = subtasks.filter((st) => st.completed).length;

  return (
    <>
      <Dialog open={!!task} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span>{isAdmin ? "Proof, Subtasks & Review" : "Task Details & Proof of Work"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            {/* ACMS 5-Stage Lifecycle Stepper */}
            <ACMSLifecycleStepper task={{ ...task, platform, creativeType, sbu }} />

            {/* Creative Classification Tags */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge platform={platform} />
                <CreativeTypeBadge type={creativeType} />
                {sbu && (
                  <span className="text-[10px] font-semibold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    SBU: {sbu}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Select value={platform || ""} onValueChange={(v) => setPlatform((v as CreativePlatform) || undefined)}>
                  <SelectTrigger className="h-7 text-[10px] w-28 bg-white border-slate-200">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="meta">Meta / FB</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="twitter">X (Twitter)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={creativeType || ""} onValueChange={(v) => setCreativeType((v as CreativeType) || undefined)}>
                  <SelectTrigger className="h-7 text-[10px] w-24 bg-white border-slate-200">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="poster">Poster</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Header Card */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/60 p-4 border border-indigo-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-slate-900">{task.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {project?.name || "General"} · {assignee ? `${assignee.name} (${assignee.role})` : "Unassigned"}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs capitalize bg-white">
                  {task.status}
                </Badge>
              </div>

              {task.dueDate && (
                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" /> Due {formatDate(task.dueDate, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>

            
            {/* ACMS Creative Deliverable Links & Time Tracking */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-indigo-600" />
                  ACMS Production Links & Assets
                </Label>
                {taskCode && (
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {taskCode}
                  </span>
                )}
              </div>

              {/* 3 Link Inputs */}
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-600">📌 Reference Brief Link</span>
                    {referenceLink && (
                      <a href={referenceLink} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5">
                        Open <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <Input
                    placeholder="https://drive.google.com/... or Figma link"
                    className="h-8 text-xs bg-slate-50 border-slate-200"
                    value={referenceLink}
                    onChange={(e) => setReferenceLink(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-600">📁 Working Drive Folder</span>
                    {driveLink && (
                      <a href={driveLink} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5">
                        Open <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <Input
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="h-8 text-xs bg-slate-50 border-slate-200"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      🚀 Final Output Deliverable (Google Drive / Docs)
                    </span>
                    {finalOutputLink && (
                      <a href={finalOutputLink} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5">
                        View Output <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <Input
                    placeholder="https://docs.google.com/... or Final Drive file"
                    className="h-8 text-xs bg-emerald-50/50 border-emerald-200 text-emerald-900 font-medium"
                    value={finalOutputLink}
                    onChange={(e) => setFinalOutputLink(e.target.value)}
                  />
                </div>
              </div>

              {/* Time Tracking (Estimated vs Actual Hours) */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-semibold text-slate-500 uppercase">Estimated Hours</Label>
                  <Input
                    type="number"
                    step="0.25"
                    placeholder="e.g. 7.5"
                    className="h-7 text-xs mt-1"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold text-slate-500 uppercase">Actual Hours Spent</Label>
                  <Input
                    type="number"
                    step="0.25"
                    placeholder="e.g. 1.25"
                    className="h-7 text-xs mt-1"
                    value={actualHours}
                    onChange={(e) => setActualHours(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Revision Feedback Alert Banner */}
            {task.reviewFeedback && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-2xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Manager Revision Feedback:</p>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">{task.reviewFeedback}</p>
                </div>
              </div>
            )}

            {/* Subtasks Checklist */}
            <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Subtasks Checklist ({completedSubtasksCount}/{subtasks.length})
                </Label>
                {subtasks.length > 0 && (
                  <span className="text-[11px] font-semibold text-indigo-600">
                    {Math.round((completedSubtasksCount / subtasks.length) * 100)}% Done
                  </span>
                )}
              </div>

              {subtasks.length > 0 && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                    style={{ width: `${(completedSubtasksCount / subtasks.length) * 100}%` }}
                  />
                </div>
              )}

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => handleToggleSubtask(st.id)}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {st.completed ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className={`truncate ${st.completed ? "line-through text-slate-400" : "text-slate-700 font-medium"}`}>
                        {st.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubtask(st.id);
                      }}
                      className="text-slate-300 hover:text-red-500 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a new subtask..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="text-xs h-8 bg-slate-50 border-slate-200"
                />
                <Button onClick={handleAddSubtask} size="sm" variant="outline" className="h-8 text-xs shrink-0 font-semibold">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>

            {/* Manager Approval & Verification Hub */}
            {isElevated && (
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" /> Manager Approval & Verification
                  </span>
                  <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-800">
                    {task.payoutStatus === "approved"
                      ? "Approved ✓"
                      : task.status === "review"
                      ? "Awaiting Review"
                      : task.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> Approve Task {isTraineeTask && task.payout > 0 ? `& ₹${task.payout} Payout` : ""}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRevisionBox(!showRevisionBox)}
                    className="h-8 text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50 gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Request Revisions
                  </Button>
                </div>

                {showRevisionBox && (
                  <div className="space-y-2 pt-2 border-t border-indigo-100">
                    <Label className="text-xs font-semibold text-slate-700">Revision Notes for Assignee</Label>
                    <Textarea
                      rows={2}
                      placeholder="Explain what needs fixing or what additional proof is required..."
                      value={revisionFeedback}
                      onChange={(e) => setRevisionFeedback(e.target.value)}
                      className="text-xs bg-white"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowRevisionBox(false)} className="h-7 text-xs">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleRequestRevision} className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                        Send Revision Request
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trainee Payout Section */}
            {isAdmin && (
              <div>
                {isTraineeTask ? (
                  <div>
                    <Label className="text-xs font-bold text-slate-700">Trainee Task Payout (₹)</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={payoutDraft || ""}
                        onChange={(e) => setPayoutDraft(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="text-xs h-9"
                      />
                      <Button onClick={handleSaveDetails} variant="outline" className="h-9 shrink-0 text-xs font-semibold">
                        Save Payout
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    ℹ️ <strong>Salaried Employee:</strong> Task payouts apply strictly to trainees. {assignee?.name} receives monthly compensation.
                  </p>
                )}
              </div>
            )}

            {/* Completion Note */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Completion Note</Label>
              <Textarea
                className="mt-1.5 text-xs"
                rows={2}
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="Describe how this task was completed or add deliverables summary..."
              />
              <div className="mt-1.5">
                <Button onClick={handleSaveDetails} variant="outline" size="sm" className="h-7 text-xs font-semibold">
                  Save Note
                </Button>
              </div>
            </div>

            {/* Proof Deliverables with Thumbnail Previews */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Proof Deliverables & URLs</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://example.com/proof-link"
                  className="text-xs h-9"
                />
                <Button onClick={handleAddProofUrl} variant="outline" className="h-9 shrink-0 text-xs font-semibold">
                  <Link2 className="h-3.5 w-3.5 mr-1" /> Add URL
                </Button>
              </div>
              <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer font-semibold">
                <Upload className="h-3.5 w-3.5" /> Upload proof file / image
                <input type="file" className="hidden" onChange={handleUploadProof} />
              </label>

              <div className="mt-3 space-y-2">
                {task.proofs?.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No proof attachments added yet.</p>
                )}
                {task.proofs?.map((proof) => {
                  const isImage =
                    /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(proof.url) ||
                    proof.url.startsWith("data:image") ||
                    proof.url.includes("images.unsplash.com");

                  return (
                    <div key={proof.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-2xs">
                      {isImage ? (
                        <img
                          src={proof.url}
                          alt="Proof preview"
                          onClick={() => setPreviewImgUrl(proof.url)}
                          className="h-10 w-10 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80 shrink-0"
                          title="Click to zoom image"
                        />
                      ) : (
                        <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${proof.type === "upload" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
                          <Paperclip className="h-4 w-4" />
                        </span>
                      )}

                      <a
                        href={proof.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-w-0 text-xs text-slate-700 hover:text-indigo-600 truncate font-medium"
                      >
                        {proof.name || proof.url}
                      </a>

                      {isImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewImgUrl(proof.url)}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                          title="Zoom"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <Badge variant="secondary" className="text-[10px]">{proof.type}</Badge>

                      <button
                        onClick={() => removeTaskProof(task.id, proof.id)}
                        className="rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              {isElevated ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Delete task "${task.title}"?`)) {
                      deleteTask(task.id);
                      onClose();
                    }
                  }}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Task
                </Button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {saveMsg && <p className="text-xs font-semibold text-emerald-600">{saveMsg}</p>}
                <Button onClick={onClose} size="sm" className="bg-slate-900 text-white h-8 text-xs font-semibold">
                  Done
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal */}
      <Dialog open={!!previewImgUrl} onOpenChange={() => setPreviewImgUrl(null)}>
        <DialogContent className="sm:max-w-[700px] p-2 bg-slate-950 border-0">
          {previewImgUrl && (
            <div className="relative flex flex-col items-center justify-center p-2">
              <img
                src={previewImgUrl}
                alt="Proof Full Preview"
                className="max-h-[75vh] w-auto rounded-xl object-contain shadow-2xl"
              />
              <div className="mt-3 flex gap-2">
                <a
                  href={previewImgUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open Full Image
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

