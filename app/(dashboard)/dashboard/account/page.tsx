"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, initials } from "@/lib/utils";
import { Task, TaskStatus } from "@/types";
import {
  Banknote,
  Clock,
  CheckCircle2,
  TrendingUp,
  Mail,
  Phone,
  Calendar,
  Building,
  Briefcase,
  Paperclip,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Award,
  Users,
  Eye,
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
  const { user } = useAuth();
  const tasks = useCRMStore((s) => s.tasks);
  const projects = useCRMStore((s) => s.projects);
  const members = useCRMStore((s) => s.members);
  const load = useCRMStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const role = user?.role || "trainee";
  const isElevated = role === "admin" || role === "manager";

  // Admin member account selector
  const [selectedMemberId, setSelectedMemberId] = useState<string>("me");

  // Identify current user member record
  const selfMember = members.find((m) => m.email === user?.email || m.id === user?.id);
  const currentUserId = user?.id || selfMember?.id;

  // Selected target member for view
  const activeViewMember =
    selectedMemberId === "all"
      ? null
      : selectedMemberId === "me"
      ? selfMember
      : members.find((m) => m.id === selectedMemberId) || selfMember;

  // Filter tasks based on view selection
  const userTasks =
    selectedMemberId === "all"
      ? tasks
      : activeViewMember
      ? tasks.filter((t) => t.assigneeId === activeViewMember.id)
      : tasks.filter((t) => t.assigneeId === currentUserId);

  // Calculations
  const completedTasks = userTasks.filter((t) => t.status === "done");
  const pendingTasks = userTasks.filter((t) => t.status !== "done");

  const earnedPayout = completedTasks.reduce((sum, t) => sum + (t.payout && t.payout > 0 ? t.payout : 50), 0);
  const pendingPayout = pendingTasks.reduce((sum, t) => sum + (t.payout && t.payout > 0 ? t.payout : 50), 0);
  const paidTasksCount = completedTasks.length;
  const avgPayout = paidTasksCount > 0 ? Math.round(earnedPayout / paidTasksCount) : 50;

  // Filtered task table data
  const filteredTasks = userTasks.filter((t) => {
    if (filterStatus === "completed" && t.status !== "done") return false;
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Rolewise Account & Payout Inspector bar */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <Eye className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {isElevated ? "Admin Account & Payout Inspector" : "Trainee Rolewise Progress Inspector"}
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-[10px]">
                {isElevated ? "Admin Access" : "Rolewise Access"}
              </Badge>
            </h2>
            <p className="text-xs text-slate-500">
              {isElevated
                ? "Switch between individual team/trainee accounts or view everyone's tasks combined."
                : "Switch between fellow trainees to inspect individual progress and payout statements."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 shrink-0">Viewing Account:</span>
          <Select value={selectedMemberId} onValueChange={(v) => v && setSelectedMemberId(v)}>
            <SelectTrigger className="w-64 bg-white border-indigo-200 text-xs font-semibold h-9 shadow-2xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">My Account ({user?.name || "User"})</SelectItem>
              <SelectItem value="all">⚡ Everyone (All Team & Trainee Tasks)</SelectItem>
              {members
                .filter((m) => m.id !== currentUserId && (isElevated || m.role === "trainee"))
                .map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.role.toUpperCase()} &bull; {m.department})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Account Profile Header Banner */}
      <motion.div variants={item}>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl">
          {/* Ambient decorative glow elements */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />

          <CardContent className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <Avatar className="h-20 w-20 ring-4 ring-white/20 shadow-2xl shrink-0">
                  <AvatarImage src={selectedMemberId === "all" ? undefined : activeViewMember?.avatar || user?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-indigo-600 text-white text-2xl font-bold">
                    {selectedMemberId === "all" ? <Users className="h-9 w-9" /> : initials(activeViewMember?.name || user?.name || "U")}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                      {selectedMemberId === "all" ? "Everyone's Account Statement" : activeViewMember?.name || user?.name}
                    </h1>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500 text-white shadow-sm flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />{" "}
                      {selectedMemberId === "all" ? "Workspace All Tasks" : activeViewMember?.role || user?.role || "Trainee"}
                    </span>
                    <Badge variant="outline" className="text-xs border-emerald-400/40 text-emerald-300 bg-emerald-500/10">
                      {selectedMemberId === "all" ? `${members.length} Members` : activeViewMember?.status || "Active"} Account
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300 flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-400" />{" "}
                    {selectedMemberId === "all" ? "All Projects & Assigned Tasks" : activeViewMember?.title || "Team Contributor"} &bull;{" "}
                    <Building className="h-3.5 w-3.5 text-pink-400" />{" "}
                    {selectedMemberId === "all" ? "Organization Wide" : activeViewMember?.department || "Operations"}
                  </p>
                  <div className="flex items-center gap-4 pt-1 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" />{" "}
                      {selectedMemberId === "all" ? "all-team@achariya.ai" : activeViewMember?.email || user?.email}
                    </span>
                    {activeViewMember?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {activeViewMember.phone}
                      </span>
                    )}
                    {activeViewMember?.joinDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" /> Joined {formatDate(activeViewMember.joinDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Earned Highlight Badge */}
              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 flex flex-col justify-center min-w-[200px] text-right md:text-right">
                <span className="text-xs font-medium text-slate-300 flex items-center justify-end gap-1">
                  <Award className="h-3.5 w-3.5 text-amber-400" /> Total Payout Earned
                </span>
                <p className="text-3xl font-extrabold text-emerald-400 mt-1 drop-shadow">
                  ₹{earnedPayout.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {paidTasksCount} completed paid tasks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payout Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-100">Earned Payout (Done)</p>
                  <p className="text-3xl font-bold mt-1">₹{earnedPayout.toLocaleString()}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 shadow-inner">
                  <Banknote className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-emerald-100/80 mt-3 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Credited to account for completed work
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg shadow-amber-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-100">Pending Payout</p>
                  <p className="text-3xl font-bold mt-1">₹{pendingPayout.toLocaleString()}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 shadow-inner">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-amber-100/80 mt-3 font-medium flex items-center gap-1">
                From {pendingTasks.length} active/in-progress tasks
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="border-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-indigo-100">Paid Tasks Completed</p>
                  <p className="text-3xl font-bold mt-1">{paidTasksCount}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 shadow-inner">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-indigo-100/80 mt-3 font-medium flex items-center gap-1">
                Out of {userTasks.length} total assigned tasks
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="border-0 bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white rounded-2xl shadow-lg shadow-fuchsia-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-fuchsia-100">Avg. Payout per Task</p>
                  <p className="text-3xl font-bold mt-1">₹{avgPayout.toLocaleString()}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 shadow-inner">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-fuchsia-100/80 mt-3 font-medium flex items-center gap-1">
                Based on completed payouts
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Task Payout Statement Table Section */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-md bg-white overflow-hidden rounded-2xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                <Banknote className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">
                  {selectedMemberId === "all" ? "Everyone's Task Payout Statement" : "Task Payout Statement"}
                </CardTitle>
                <p className="text-xs text-slate-400">Detailed list of assigned tasks, status, and earnings</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search task, project, or assignee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
                />
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterStatus === "all" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({userTasks.length})
                </button>
                <button
                  onClick={() => setFilterStatus("completed")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterStatus === "completed" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Earned ({completedTasks.length})
                </button>
                <button
                  onClick={() => setFilterStatus("pending")}
                  className={`px-3 py-1 rounded-lg transition-all ${
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
                No payout tasks found matching the criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3">Task Details</th>
                      {selectedMemberId === "all" && <th className="px-5 py-3">Assignee</th>}
                      <th className="px-5 py-3">Project</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Due Date</th>
                      <th className="px-5 py-3 text-center">Proof Notes</th>
                      <th className="px-5 py-3 text-right">Payout Amount</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.map((t) => {
                      const proj = projects.find((p) => p.id === t.projectId);
                      const assignee = members.find((m) => m.id === t.assigneeId);
                      const isDone = t.status === "done";

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-800 text-sm">{t.title}</p>
                            {t.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{t.description}</p>
                            )}
                          </td>

                          {selectedMemberId === "all" && (
                            <td className="px-5 py-3.5">
                              {assignee ? (
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={assignee.avatar} />
                                    <AvatarFallback className="text-[8px]">{initials(assignee.name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-slate-700">{assignee.name}</p>
                                    <p className="text-[9px] text-slate-400 capitalize">{assignee.role}</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                          )}

                          <td className="px-5 py-3.5">
                            {proj ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
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

                          <td className="px-5 py-3.5 text-slate-500 font-medium">
                            {t.dueDate ? formatDate(t.dueDate, { month: "short", day: "numeric", year: "numeric" }) : "-"}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            {t.proofs && t.proofs.length > 0 ? (
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[10px] gap-1">
                                <Paperclip className="h-3 w-3" /> {t.proofs.length} Attachment(s)
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
                            {t.payout > 0 ? (
                              <span className={isDone ? "text-emerald-600" : "text-amber-600"}>
                                ₹{t.payout.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">₹0</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedTask(t)}
                              className="h-8 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 gap-1 font-semibold"
                            >
                              Details <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
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
                  <span>Assignee: <strong className="text-slate-700">{members.find((m) => m.id === selectedTask.assigneeId)?.name || "Unassigned"}</strong></span>
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
                  <p className={`text-2xl font-bold mt-0.5 ${selectedTask.status === "done" ? "text-emerald-600" : "text-amber-600"}`}>
                    ₹{selectedTask.payout.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-white">
                  <p className="text-xs text-slate-400 font-medium">Payout Status</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {selectedTask.status === "done" ? "Credited / Earned ✓" : "Pending Completion"}
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
