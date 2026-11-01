"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, initials } from "@/lib/utils";
import { Task, TaskStatus, PayoutStatus } from "@/types";
import * as XLSX from "xlsx";
import {
  Banknote,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  Trash2,
  AlertCircle,
  Paperclip,
  CheckCheck,
  CreditCard,
  UserCheck,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const statusBadgeColor: Record<TaskStatus, string> = {
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "in-progress": "bg-amber-100 text-amber-800 border-amber-200",
  review: "bg-purple-100 text-purple-800 border-purple-200",
  todo: "bg-blue-100 text-blue-800 border-blue-200",
  backlog: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const tasks = useCRMStore((s) => s.tasks);
  const projects = useCRMStore((s) => s.projects);
  const members = useCRMStore((s) => s.members);
  const load = useCRMStore((s) => s.load);
  const updateTask = useCRMStore((s) => s.updateTask);
  const deleteTask = useCRMStore((s) => s.deleteTask);

  useEffect(() => {
    load();
  }, [load]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "approved" | "paid" | "pending">("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payTargetTask, setPayTargetTask] = useState<Task | null>(null);
  const [txnRef, setTxnRef] = useState("");
  const [batchPayOpen, setBatchPayOpen] = useState(false);
  const [batchTxnRef, setBatchTxnRef] = useState("");

  const role = user?.role || "trainee";

  if (!authLoading && user && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-4 shadow-sm">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Admin Access Only</h2>
        <p className="text-sm text-slate-500 max-w-md mt-2">
          Trainee payout statements, approvals, and disbursement controls are restricted to administrators.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Trainee Filter (Payouts are strictly for Trainees only!)
  const trainees = useMemo(() => members.filter((m) => m.role === "trainee"), [members]);
  const traineeIds = useMemo(() => new Set(trainees.map((t) => t.id)), [trainees]);

  const [selectedTraineeId, setSelectedTraineeId] = useState<string>("all_trainees");

  // Selected target trainee
  const activeTrainee = selectedTraineeId === "all_trainees" ? null : trainees.find((t) => t.id === selectedTraineeId);

  // Filter tasks: ONLY tasks assigned to trainees
  const traineeTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.assigneeId || !traineeIds.has(t.assigneeId)) return false;
      if (selectedTraineeId !== "all_trainees" && t.assigneeId !== selectedTraineeId) return false;
      return true;
    });
  }, [tasks, traineeIds, selectedTraineeId]);

  // Settlement Metrics
  const completedTasks = traineeTasks.filter((t) => t.status === "done");
  const pendingTasks = traineeTasks.filter((t) => t.status !== "done");
  const approvedTasks = completedTasks.filter((t) => t.payoutStatus === "approved");
  const paidTasks = completedTasks.filter((t) => t.payoutStatus === "paid");
  const awaitingApprovalTasks = completedTasks.filter((t) => !t.payoutStatus || t.payoutStatus === "pending");

  const totalEarnedPayout = completedTasks.reduce((sum, t) => sum + (t.payout || 0), 0);
  const totalApprovedPayout = approvedTasks.reduce((sum, t) => sum + (t.payout || 0), 0);
  const totalPaidPayout = paidTasks.reduce((sum, t) => sum + (t.payout || 0), 0);
  const totalPendingWorkPayout = pendingTasks.reduce((sum, t) => sum + (t.payout || 0), 0);

  // Filtered task table data
  const filteredTasks = traineeTasks.filter((t) => {
    if (filterStatus === "completed" && t.status !== "done") return false;
    if (filterStatus === "approved" && t.payoutStatus !== "approved") return false;
    if (filterStatus === "paid" && t.payoutStatus !== "paid") return false;
    if (filterStatus === "pending" && t.status === "done") return false;

    if (search) {
      const proj = projects.find((p) => p.id === t.projectId);
      const assignee = members.find((m) => m.id === t.assigneeId);
      const query = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(query) ||
        (proj?.name && proj.name.toLowerCase().includes(query)) ||
        (assignee?.name && assignee.name.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Batch approve completed tasks
  const handleApproveAllCompleted = async () => {
    if (awaitingApprovalTasks.length === 0) return;
    for (const t of awaitingApprovalTasks) {
      await updateTask(t.id, { payoutStatus: "approved" });
    }
  };

  // Mark single task as paid
  const handleConfirmSinglePaid = async () => {
    if (!payTargetTask) return;
    await updateTask(payTargetTask.id, {
      payoutStatus: "paid",
      payoutPaidAt: new Date().toISOString(),
      payoutTransactionRef: txnRef.trim() || `DISB-${Date.now().toString(36).toUpperCase()}`,
    });
    setPayModalOpen(false);
    setPayTargetTask(null);
    setTxnRef("");
  };

  // Batch mark all approved tasks as paid
  const handleConfirmBatchPaid = async () => {
    if (approvedTasks.length === 0) return;
    const ref = batchTxnRef.trim() || `BATCH-${Date.now().toString(36).toUpperCase()}`;
    const paidAt = new Date().toISOString();
    for (const t of approvedTasks) {
      await updateTask(t.id, {
        payoutStatus: "paid",
        payoutPaidAt: paidAt,
        payoutTransactionRef: ref,
      });
    }
    setBatchPayOpen(false);
    setBatchTxnRef("");
  };

  // Export Trainee Payroll to CSV
  const handleExportPayrollCSV = () => {
    const exportRows = filteredTasks.map((t) => {
      const assignee = members.find((m) => m.id === t.assigneeId);
      const proj = projects.find((p) => p.id === t.projectId);
      return {
        "Trainee Name": assignee?.name || "Unassigned",
        "Trainee Email": assignee?.email || "",
        "Department": assignee?.department || "",
        "Task Title": t.title,
        "Project": proj?.name || "",
        "Payout (INR)": t.payout || 0,
        "Task Status": t.status,
        "Settlement Status": t.payoutStatus || (t.status === "done" ? "pending_approval" : "in_progress"),
        "Due Date": t.dueDate || "",
        "Disbursed At": t.payoutPaidAt ? new Date(t.payoutPaidAt).toLocaleDateString() : "",
        "Payment Reference": t.payoutTransactionRef || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trainee_Payouts");
    XLSX.writeFile(
      workbook,
      `Trainee_Payroll_Statement_${selectedTraineeId === "all_trainees" ? "All" : activeTrainee?.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Trainee Payout Management Inspector Bar */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl text-white shadow-xl border border-white/10"
      >
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30 shadow-inner">
            <Banknote className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Trainee Payout Account & Settlements
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                Trainees Only
              </Badge>
            </h2>
            <p className="text-xs text-white/60">
              Per organization policy, task payouts are exclusively tracked and disbursed to trainees (salaried employees receive monthly compensation).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedTraineeId} onValueChange={(v) => v && setSelectedTraineeId(v)}>
            <SelectTrigger className="w-64 bg-white/10 border-white/20 text-white text-xs font-semibold h-9 shadow-inner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_trainees">⚡ All Trainees ({trainees.length} Enrolled)</SelectItem>
              {trainees.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} &bull; {t.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleExportPayrollCSV}
            className="h-9 gap-1.5 text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-md"
            title="Export payroll to Excel/CSV spreadsheet"
          >
            <Download className="h-3.5 w-3.5" /> Export Payroll (.xlsx)
          </Button>
        </div>
      </motion.div>

      {/* Settlement Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} whileHover={{ y: -4 }}>
          <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-100">Disbursed / Paid Payouts</p>
                  <p className="text-3xl font-bold mt-1">₹{totalPaidPayout.toLocaleString()}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 shadow-inner">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-emerald-100/80 mt-3 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {paidTasks.length} tasks successfully disbursed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} whileHover={{ y: -4 }}>
          <Card className="border-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-indigo-100">Approved for Disbursement</p>
                  <p className="text-3xl font-bold mt-1">₹{totalApprovedPayout.toLocaleString()}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 shadow-inner">
                  <CheckCheck className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-indigo-100/80 font-medium">
                  {approvedTasks.length} task{approvedTasks.length === 1 ? "" : "s"} ready for payout
                </span>
                {approvedTasks.length > 0 && (
                  <button
                    onClick={() => setBatchPayOpen(true)}
                    className="text-[10px] font-bold bg-white text-indigo-900 px-2 py-0.5 rounded-lg shadow-xs hover:bg-indigo-50"
                  >
                    Disburse All
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} whileHover={{ y: -4 }}>
          <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg shadow-amber-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-100">Awaiting Manager Approval</p>
                  <p className="text-3xl font-bold mt-1">
                    ₹{awaitingApprovalTasks.reduce((sum, t) => sum + (t.payout || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 shadow-inner">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-amber-100/80 font-medium">
                  {awaitingApprovalTasks.length} completed tasks
                </span>
                {awaitingApprovalTasks.length > 0 && (
                  <button
                    onClick={handleApproveAllCompleted}
                    className="text-[10px] font-bold bg-white text-amber-900 px-2 py-0.5 rounded-lg shadow-xs hover:bg-amber-50"
                  >
                    Approve All
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} whileHover={{ y: -4 }}>
          <Card className="border-0 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-300">Pending Trainee Work</p>
                  <p className="text-3xl font-bold mt-1">₹{totalPendingWorkPayout.toLocaleString()}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 shadow-inner">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-slate-300/80 mt-3 font-medium">
                From {pendingTasks.length} in-progress or queued tasks
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Task Payout Statement Table */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-md bg-white overflow-hidden rounded-2xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                <Banknote className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">
                  {selectedTraineeId === "all_trainees"
                    ? "All Trainees' Payout & Settlement Register"
                    : `${activeTrainee?.name}'s Payout Statement`}
                </CardTitle>
                <p className="text-xs text-slate-400">Review task proofs, approve payouts, and record payment settlements</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search task, project, or trainee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
                />
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === "all" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({traineeTasks.length})
                </button>
                <button
                  onClick={() => setFilterStatus("approved")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === "approved" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Approved ({approvedTasks.length})
                </button>
                <button
                  onClick={() => setFilterStatus("paid")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === "paid" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Paid ({paidTasks.length})
                </button>
                <button
                  onClick={() => setFilterStatus("pending")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === "pending" ? "bg-white text-amber-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pending ({pendingTasks.length})
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No trainee tasks found matching this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3">Task Details</th>
                      {selectedTraineeId === "all_trainees" && <th className="px-5 py-3">Trainee</th>}
                      <th className="px-5 py-3">Project</th>
                      <th className="px-5 py-3">Task Status</th>
                      <th className="px-5 py-3 text-center">Settlement Status</th>
                      <th className="px-5 py-3 text-center">Proofs</th>
                      <th className="px-5 py-3 text-right">Payout (₹)</th>
                      <th className="px-5 py-3 text-right">Settlement Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.map((t) => {
                      const proj = projects.find((p) => p.id === t.projectId);
                      const assignee = members.find((m) => m.id === t.assigneeId);
                      const isDone = t.status === "done";
                      const isPaid = t.payoutStatus === "paid";
                      const isApproved = t.payoutStatus === "approved";

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-800 text-sm">{t.title}</p>
                            {t.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{t.description}</p>
                            )}
                          </td>

                          {selectedTraineeId === "all_trainees" && (
                            <td className="px-5 py-3.5">
                              {assignee ? (
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={assignee.avatar} />
                                    <AvatarFallback className="text-[8px]">{initials(assignee.name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-slate-700">{assignee.name}</p>
                                    <p className="text-[9px] text-slate-400 capitalize">{assignee.department}</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                          )}

                          <td className="px-5 py-3.5">
                            {proj ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {proj.name}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="px-5 py-3.5">
                            <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeColor[t.status]}`}>
                              {t.status}
                            </Badge>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> Paid
                              </span>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                <CheckCheck className="h-3 w-3" /> Approved
                              </span>
                            ) : isDone ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Needs Approval
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">In Progress</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            {t.proofs && t.proofs.length > 0 ? (
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[10px] gap-1">
                                <Paperclip className="h-3 w-3" /> {t.proofs.length}
                              </Badge>
                            ) : t.proofNote ? (
                              <span className="text-[10px] text-slate-500 italic max-w-[120px] truncate block mx-auto">
                                &quot;{t.proofNote}&quot;
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right font-bold text-sm">
                            <span className={isPaid ? "text-emerald-600" : isApproved ? "text-indigo-600" : isDone ? "text-amber-600" : "text-slate-500"}>
                              ₹{(t.payout || 0).toLocaleString()}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isDone && !isPaid && !isApproved && (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await updateTask(t.id, { payoutStatus: "approved" });
                                  }}
                                  className="h-7 text-[11px] bg-purple-600 hover:bg-purple-700 text-white font-semibold px-2 rounded-lg"
                                >
                                  Approve
                                </Button>
                              )}

                              {isDone && !isPaid && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setPayTargetTask(t);
                                    setPayModalOpen(true);
                                  }}
                                  className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 rounded-lg"
                                >
                                  Pay
                                </Button>
                              )}

                              {isPaid && (
                                <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                  Ref: {t.payoutTransactionRef || "Disbursed"}
                                </span>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedTask(t)}
                                className="h-7 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Single Task Disbursement Dialog */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" /> Record Trainee Payout
            </DialogTitle>
          </DialogHeader>

          {payTargetTask && (
            <div className="space-y-4 mt-2">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <p className="text-xs text-slate-400">Trainee Payout Amount</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                  ₹{(payTargetTask.payout || 0).toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-slate-800 mt-2">{payTargetTask.title}</p>
                <p className="text-[11px] text-slate-500">
                  Assignee: {members.find((m) => m.id === payTargetTask.assigneeId)?.name}
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Payment Reference / Transaction ID</Label>
                <Input
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  placeholder="e.g. UPI / NEFT-20261101-098"
                  className="mt-1 text-xs"
                />
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" size="sm" onClick={() => setPayModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmSinglePaid} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  Confirm Disbursement
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Disbursement Dialog */}
      <Dialog open={batchPayOpen} onOpenChange={setBatchPayOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Batch Disburse ({approvedTasks.length} Approved Tasks)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="rounded-xl bg-indigo-50 p-3.5 border border-indigo-100">
              <p className="text-xs text-indigo-500 font-medium">Total Batch Payout</p>
              <p className="text-2xl font-bold text-indigo-900 mt-0.5">
                ₹{totalApprovedPayout.toLocaleString()}
              </p>
              <p className="text-[11px] text-indigo-700 mt-1">
                Will mark all {approvedTasks.length} currently approved tasks as &quot;Paid&quot;.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Batch Payment Reference / Payroll Run ID</Label>
              <Input
                value={batchTxnRef}
                onChange={(e) => setBatchTxnRef(e.target.value)}
                placeholder="e.g. BATCH-PAYROLL-NOV-01"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setBatchPayOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmBatchPaid} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Disburse Entire Batch
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Task Payout Details</DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4 mt-2">
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 p-4 border border-indigo-100">
                <p className="text-base font-bold text-slate-900">{selectedTask.title}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span>Project: <strong className="text-slate-700">{projects.find((p) => p.id === selectedTask.projectId)?.name || "General"}</strong></span>
                  <span>Trainee: <strong className="text-slate-700">{members.find((m) => m.id === selectedTask.assigneeId)?.name || "Unassigned"}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className={`text-xs ${statusBadgeColor[selectedTask.status]}`}>
                    {selectedTask.status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Priority: {selectedTask.priority}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 p-3 bg-white">
                  <p className="text-xs text-slate-400 font-medium">Payout Amount</p>
                  <p className="text-2xl font-bold mt-0.5 text-emerald-600">
                    ₹{(selectedTask.payout || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-white">
                  <p className="text-xs text-slate-400 font-medium">Settlement Status</p>
                  <p className="text-sm font-bold text-slate-800 mt-1 capitalize">
                    {selectedTask.payoutStatus || (selectedTask.status === "done" ? "Pending Approval" : "In Progress")}
                  </p>
                </div>
              </div>

              {selectedTask.description && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">Description</p>
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {selectedTask.proofNote && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">Completion Note</p>
                  <p className="text-xs text-slate-600 bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
                    {selectedTask.proofNote}
                  </p>
                </div>
              )}

              {selectedTask.proofs && selectedTask.proofs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Attached Proof Files</p>
                  <div className="space-y-1.5">
                    {selectedTask.proofs.map((proof) => (
                      <a
                        key={proof.id}
                        href={proof.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="font-medium truncate flex-1">{proof.name || proof.url}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => setSelectedTask(null)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2">
                Close Details
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
