"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatDate } from "@/lib/utils";
import { Task, TaskStatus, Priority, TeamMember, Project } from "@/types";
import { Plus, CheckCircle2, Circle, GripVertical, Filter, Banknote, Paperclip, Link2, Trash2, Upload, Layers, ChevronDown, ChevronUp, Sparkles, LayoutGrid, List, Calendar as CalendarIcon, GanttChart, Users, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type ViewMode = "kanban" | "table" | "calendar" | "timeline" | "workload";

const columns: { status: TaskStatus; label: string; color: string; headerColor: string; chart: string }[] = [
  { status: "backlog", label: "Backlog", color: "bg-slate-100 border-slate-200", headerColor: "bg-slate-500", chart: "#94a3b8" },
  { status: "todo", label: "To Do", color: "bg-blue-50/50 border-blue-200", headerColor: "bg-blue-500", chart: "#3b82f6" },
  { status: "in-progress", label: "In Progress", color: "bg-amber-50/50 border-amber-200", headerColor: "bg-amber-500", chart: "#f59e0b" },
  { status: "review", label: "Review", color: "bg-purple-50/50 border-purple-200", headerColor: "bg-purple-500", chart: "#8b5cf6" },
  { status: "done", label: "Done", color: "bg-emerald-50/50 border-emerald-200", headerColor: "bg-emerald-500", chart: "#10b981" },
];

const priorityBadge: Record<Priority, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-slate-100 text-slate-600",
};

interface TaskCollageCardProps {
  tasks: Task[];
  assignee?: TeamMember;
  project?: Project;
  members: TeamMember[];
  projects: Project[];
  priorityBadge: Record<Priority, string>;
  handleMove: (task: Task, newStatus: TaskStatus) => void;
  openProofDialog: (task: Task) => void;
  columnStatus: TaskStatus;
}

function formatTaskTitles(tasks: Task[]): string {
  const titles = tasks.map((t) => t.title);
  const dayNums = titles.map((t) => {
    const m = t.match(/^DAY(\d+)$/i);
    return m ? parseInt(m[1], 10) : null;
  });

  if (dayNums.length > 0 && dayNums.every((n) => n !== null)) {
    const nums = dayNums as number[];
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return `DAY${min} – DAY${max}`;
  }

  if (titles.length <= 3) return titles.join(", ");
  return `${titles.slice(0, 2).join(", ")} (+${titles.length - 2} more)`;
}

function TaskCollageCard({
  tasks,
  assignee,
  project,
  members,
  projects,
  priorityBadge,
  handleMove,
  openProofDialog,
  columnStatus,
}: TaskCollageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClickExpanded, setIsClickExpanded] = useState(false);

  const isExpanded = isHovered || isClickExpanded;

  const priorities: Priority[] = ["urgent", "high", "medium", "low"];
  const highestPriority = priorities.find((p) => tasks.some((t) => t.priority === p)) || "medium";

  const totalPayout = tasks.reduce((sum, t) => sum + (t.payout || 0), 0);
  const totalProofs = tasks.reduce((sum, t) => sum + (t.proofs?.length || 0), 0);
  const titleRange = formatTaskTitles(tasks);

  return (
    <div
      className="relative group transition-all duration-300 my-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isExpanded ? (
        /* Collapsed Collage Stack View */
        <motion.div
          layout
          initial={{ opacity: 0.9, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsClickExpanded(true)}
          className="relative cursor-pointer transition-all duration-300"
        >
          <div className="absolute inset-x-2 -bottom-2 h-full rounded-xl bg-indigo-100/60 border border-indigo-200 shadow-xs pointer-events-none transform translate-y-1 scale-[0.94]" />
          <div className="absolute inset-x-1 -bottom-1 h-full rounded-xl bg-indigo-50/80 border border-indigo-200 shadow-xs pointer-events-none transform translate-y-0.5 scale-[0.97]" />

          <div className="relative bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/30 rounded-xl p-3.5 border border-indigo-200/80 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs">
                  <Layers className="h-2.5 w-2.5" />
                  {tasks.length} Collaged
                </span>
                <Badge className={`text-[10px] ${priorityBadge[highestPriority]}`}>{highestPriority}</Badge>
              </div>
              <span className="text-[10px] text-indigo-500 font-semibold group-hover:translate-y-0.5 transition-transform flex items-center gap-0.5">
                Expand <ChevronDown className="h-3 w-3" />
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              {assignee && (
                <Avatar className="h-6 w-6 border border-indigo-100">
                  <AvatarImage src={assignee.avatar} />
                  <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-700">{initials(assignee.name)}</AvatarFallback>
                </Avatar>
              )}
              <div>
                <p className="text-xs font-bold text-slate-800 leading-tight">{titleRange}</p>
                <p className="text-[10px] font-medium text-slate-500">{assignee?.name || "Unassigned"} {project ? `· ${project.name}` : ""}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-indigo-600 font-medium">
                <Sparkles className="h-2.5 w-2.5 text-indigo-500" />
                Hover to expand {tasks.length} tasks
              </span>
              <div className="flex items-center gap-1.5">
                {totalPayout > 0 && (
                  <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    ₹{totalPayout.toLocaleString()}
                  </span>
                )}
                {totalProofs > 0 && (
                  <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                    📎 {totalProofs}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Expanded Collage List View */
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-xl border-2 border-indigo-300 bg-indigo-50/40 p-2.5 shadow-lg space-y-2 relative transition-all duration-300"
        >
          <div
            className="flex items-center justify-between px-2 py-1 bg-white/90 rounded-lg border border-indigo-100 cursor-pointer shadow-2xs"
            onClick={() => setIsClickExpanded(false)}
          >
            <div className="flex items-center gap-2">
              {assignee && (
                <Avatar className="h-5 w-5">
                  <AvatarImage src={assignee.avatar} />
                  <AvatarFallback className="text-[8px]">{initials(assignee.name)}</AvatarFallback>
                </Avatar>
              )}
              <span className="text-xs font-bold text-indigo-950">
                {assignee?.name || "Collaged Stack"} ({tasks.length} tasks)
              </span>
            </div>
            <button
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5"
              onClick={(e) => {
                e.stopPropagation();
                setIsClickExpanded(false);
                setIsHovered(false);
              }}
            >
              Collapse <ChevronUp className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
            {tasks.map((task, idx) => {
              const taskAssignee = members.find((m) => m.id === task.assigneeId);
              const taskProject = projects.find((p) => p.id === task.projectId);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-white rounded-xl p-3 shadow-xs border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-150 cursor-pointer group"
                  onClick={() =>
                    handleMove(
                      task,
                      columnStatus === "done"
                        ? "todo"
                        : columnStatus === "backlog"
                        ? "todo"
                        : columnStatus === "todo"
                        ? "in-progress"
                        : columnStatus === "in-progress"
                        ? "review"
                        : "done"
                    )
                  }
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <Badge className={`text-[10px] ${priorityBadge[task.priority]}`}>{task.priority}</Badge>
                    <GripVertical className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mb-0.5">{task.title}</p>
                  {taskProject && <p className="text-[10px] text-slate-400 mb-1.5">{taskProject.name}</p>}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      {task.dueDate && (
                        <span className="text-[10px] text-slate-400">
                          {formatDate(task.dueDate, { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {task.payout > 0 && (
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                          <Banknote className="h-2.5 w-2.5" />
                          {task.payout.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {taskAssignee && (
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={taskAssignee.avatar} />
                          <AvatarFallback className="text-[7px]">{initials(taskAssignee.name)}</AvatarFallback>
                        </Avatar>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openProofDialog(task);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Proof & payout"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function TaskTableView({
  tasks,
  projects,
  members,
  priorityBadge,
  handleMove,
  openProofDialog,
}: {
  tasks: Task[];
  projects: Project[];
  members: TeamMember[];
  priorityBadge: Record<Priority, string>;
  handleMove: (task: Task, newStatus: TaskStatus) => void;
  openProofDialog: (task: Task) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-0 shadow-md bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title..."
            className="pl-9 bg-white text-xs h-9"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> tasks
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">Task Title</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3 text-right">Payout</th>
              <th className="px-4 py-3 text-center">Proofs</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((task) => {
              const project = projects.find((p) => p.id === task.projectId);
              const assignee = members.find((m) => m.id === task.assigneeId);
              return (
                <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{task.title}</p>
                    {task.description && (
                      <p className="text-[10px] text-slate-400 line-clamp-1">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {project ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                        {project.name}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Select value={task.status} onValueChange={(v) => handleMove(task, v as TaskStatus)}>
                      <SelectTrigger className="h-7 text-[11px] w-28 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={assignee.avatar} />
                          <AvatarFallback className="text-[8px]">{initials(assignee.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-700">{assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[10px] ${priorityBadge[task.priority]}`}>{task.priority}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {task.dueDate ? formatDate(task.dueDate, { month: "short", day: "numeric", year: "numeric" }) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {task.payout > 0 ? `₹${task.payout.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {task.proofs?.length > 0 ? (
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[10px]">
                        📎 {task.proofs.length}
                      </Badge>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                      onClick={() => openProofDialog(task)}
                    >
                      Proof & Payout
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TaskCalendarView({
  tasks,
  projects,
  members,
  openProofDialog,
}: {
  tasks: Task[];
  projects: Project[];
  members: TeamMember[];
  openProofDialog: (task: Task) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date("2025-07-01"));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const tasksByDate = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.dueDate) {
      const dStr = t.dueDate.slice(0, 10);
      if (!tasksByDate.has(dStr)) tasksByDate.set(dStr, []);
      tasksByDate.get(dStr)!.push(t);
    }
  }

  const daysGrid = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysGrid.push(day);
  }

  return (
    <Card className="border-0 shadow-md bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 px-2 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date("2025-07-01"))} className="h-8 text-xs">
            Tasks Date View
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 px-2 text-slate-600">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="bg-slate-50 p-2 font-semibold text-center text-slate-600">
            {day}
          </div>
        ))}
        {daysGrid.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="bg-slate-50/50 min-h-[90px]" />;
          }

          const mStr = String(month + 1).padStart(2, "0");
          const dStr = String(day).padStart(2, "0");
          const fullDateStr = `${year}-${mStr}-${dStr}`;

          const dayTasks = tasksByDate.get(fullDateStr) || [];

          return (
            <div key={day} className="bg-white min-h-[90px] p-1.5 flex flex-col justify-start hover:bg-indigo-50/20 transition-colors">
              <span className="font-semibold text-slate-700 text-[11px] mb-1">{day}</span>
              <div className="space-y-1 overflow-y-auto max-h-[70px]">
                {dayTasks.map((t) => {
                  const assignee = members.find((m) => m.id === t.assigneeId);
                  return (
                    <div
                      key={t.id}
                      onClick={() => openProofDialog(t)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded px-1.5 py-0.5 text-[10px] cursor-pointer truncate flex items-center justify-between"
                      title={`${t.title} (${assignee?.name || "Unassigned"})`}
                    >
                      <span className="truncate font-medium">{t.title}</span>
                      {assignee && (
                        <span className="text-[8px] bg-white text-indigo-700 font-bold px-1 rounded ml-1">
                          {initials(assignee.name)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TaskTimelineView({
  tasks,
  projects,
  members,
  priorityBadge,
  openProofDialog,
}: {
  tasks: Task[];
  projects: Project[];
  members: TeamMember[];
  priorityBadge: Record<Priority, string>;
  openProofDialog: (task: Task) => void;
}) {
  return (
    <Card className="border-0 shadow-md bg-white p-5 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Project Tasks Timeline</h2>
        <p className="text-xs text-slate-500">Visual schedule and status across project timelines</p>
      </div>

      <div className="space-y-6">
        {projects.map((proj) => {
          const projTasks = tasks.filter((t) => t.projectId === proj.id);
          if (projTasks.length === 0) return null;

          return (
            <div key={proj.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: proj.color || "#6366f1" }} />
                  <h3 className="font-semibold text-slate-800 text-sm">{proj.name}</h3>
                  <Badge variant="outline" className="text-[10px]">{projTasks.length} tasks</Badge>
                </div>
                <span className="text-xs text-slate-400">{proj.startDate} to {proj.endDate}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {projTasks.map((t) => {
                  const assignee = members.find((m) => m.id === t.assigneeId);
                  return (
                    <div
                      key={t.id}
                      onClick={() => openProofDialog(t)}
                      className="bg-white p-3 rounded-lg border border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge className={`text-[9px] ${priorityBadge[t.priority]}`}>{t.priority}</Badge>
                        <span className="text-[10px] font-bold uppercase text-slate-400">{t.status}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800">{t.title}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Due: {t.dueDate || "No date"}</span>
                        {assignee && (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={assignee.avatar} />
                              <AvatarFallback className="text-[7px]">{initials(assignee.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-slate-600 font-medium">{assignee.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TaskWorkloadView({
  tasks,
  members,
  openProofDialog,
}: {
  tasks: Task[];
  members: TeamMember[];
  openProofDialog: (task: Task) => void;
}) {
  return (
    <Card className="border-0 shadow-md bg-white p-5 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Team Member Workload Matrix</h2>
        <p className="text-xs text-slate-500">Task distribution, status breakdown and payouts by team member</p>
      </div>

      <div className="space-y-4 divide-y divide-slate-100">
        {members.map((member) => {
          const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
          const doneTasks = memberTasks.filter((t) => t.status === "done");
          const inProgTasks = memberTasks.filter((t) => t.status === "in-progress" || t.status === "review");
          const totalEarned = memberTasks.reduce((sum, t) => sum + (t.payout || 0), 0);

          return (
            <div key={member.id} className="pt-4 first:pt-0 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{member.name}</h3>
                    <p className="text-[10px] text-slate-400">{member.title} · {member.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400">Total Tasks</p>
                    <p className="font-bold text-slate-800">{memberTasks.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400">Done</p>
                    <p className="font-bold text-emerald-600">{doneTasks.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400">In Progress</p>
                    <p className="font-bold text-amber-600">{inProgTasks.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400">Total Payout</p>
                    <p className="font-bold text-indigo-600">₹{totalEarned.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {memberTasks.slice(0, 8).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openProofDialog(t)}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/80 hover:bg-white hover:border-indigo-200 transition-all cursor-pointer text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 truncate">{t.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        t.status === "done" ? "bg-emerald-100 text-emerald-800" :
                        t.status === "in-progress" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>{t.status}</span>
                    </div>
                    {t.payout > 0 && <p className="text-[10px] text-emerald-600 font-semibold">₹{t.payout}</p>}
                  </div>
                ))}
                {memberTasks.length > 8 && (
                  <div className="flex items-center justify-center p-2 rounded-lg bg-indigo-50/50 text-indigo-600 font-semibold text-xs border border-indigo-100">
                    +{memberTasks.length - 8} more tasks
                  </div>
                )}
                {memberTasks.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No assigned tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const tasks = useCRMStore((s) => s.tasks);
  const projects = useCRMStore((s) => s.projects);
  const members = useCRMStore((s) => s.members);
  const updateTask = useCRMStore((s) => s.updateTask);
  const addTask = useCRMStore((s) => s.addTask);
  const deleteTask = useCRMStore((s) => s.deleteTask);
  const addTaskProof = useCRMStore((s) => s.addTaskProof);
  const removeTaskProof = useCRMStore((s) => s.removeTaskProof);
  const load = useCRMStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  const [open, setOpen] = useState(false);
  const [filterProject, setFilterProject] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [isCollagedView, setIsCollagedView] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", projectId: "", priority: "medium" as Priority, assigneeId: "", dueDate: "", payout: 0 });
  const [proofTask, setProofTask] = useState<Task | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [payoutDraft, setPayoutDraft] = useState(0);
  const [saveMsg, setSaveMsg] = useState("");

  const role = user?.role || "trainee";
  const isElevated = role === "admin" || role === "manager";

  // Engaged projects for the user
  const engagedProjects = projects.filter((p) => isElevated || p.memberIds.includes(user?.id || "") || p.ownerId === user?.id);
  const engagedProjectIds = engagedProjects.map((p) => p.id);

  // Role-isolated tasks: Trainees only see tasks assigned to them. Admins & Managers see all tasks.
  const userAllowedTasks = tasks.filter((t) => {
    if (isElevated) return true;
    if (role === "trainee") {
      return t.assigneeId === user?.id;
    }
    return t.assigneeId === user?.id || engagedProjectIds.includes(t.projectId);
  });

  const filtered = userAllowedTasks.filter((t) => {
    if (filterProject !== "all" && t.projectId !== filterProject) return false;
    if (filterAssignee !== "all" && t.assigneeId !== filterAssignee) return false;
    return true;
  });

  function handleMove(task: Task, newStatus: TaskStatus) {
    if (task.status === newStatus) return;
    // Preserve exact task payout as set by task/project creator
    updateTask(task.id, { status: newStatus });
  }

  function handleCreate() {
    if (!form.title || !form.projectId || !user?.id) return;
    addTask({
      projectId: form.projectId,
      title: form.title,
      description: form.description,
      status: "todo",
      priority: form.priority,
      assigneeId: form.assigneeId || undefined,
      dueDate: form.dueDate || undefined,
      payout: form.payout,
    });
    setOpen(false);
    setForm({ title: "", description: "", projectId: "", priority: "medium", assigneeId: "", dueDate: "", payout: 0 });
  }

  function openProofDialog(task: Task) {
    setProofTask(task);
    setProofUrl("");
    setProofNote(task.proofNote || "");
    setPayoutDraft(task.payout || 0);
    setSaveMsg("");
  }

  async function handleAddProofUrl() {
    if (!proofTask || !proofUrl.trim()) return;
    await addTaskProof(proofTask.id, { name: proofUrl.trim().split("/").pop(), url: proofUrl.trim(), type: "link" });
    setProofUrl("");
  }

  async function handleUploadProof(e: React.ChangeEvent<HTMLInputElement>) {
    if (!proofTask || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      await addTaskProof(proofTask.id, { name: data.name || file.name, url: data.url, type: "upload" });
    }
    e.target.value = "";
  }

  async function handleSaveProofDetails() {
    if (!proofTask) return;
    const updates: Partial<Task> = { proofNote: proofNote || null };
    if (isElevated) {
      updates.payout = Number(payoutDraft) || 0;
    }
    await updateTask(proofTask.id, updates);
    setSaveMsg("Saved ✓");
  }

  const pipelineData = columns.map((col) => ({
    name: col.label,
    count: filtered.filter((t) => t.status === col.status).length,
    color: col.chart,
  }));

  const totalTasks = filtered.length;
  const doneCount = filtered.filter((t) => t.status === "done").length;

  type TaskItemOrGroup =
    | { type: "single"; task: Task }
    | { type: "group"; key: string; assigneeId?: string; projectId?: string; tasks: Task[] };

  function groupTasks(colTasks: Task[]): TaskItemOrGroup[] {
    if (!isCollagedView) {
      return colTasks.map((t) => ({ type: "single", task: t }));
    }

    const groupsMap = new Map<string, Task[]>();
    const orderList: string[] = [];

    for (const task of colTasks) {
      const groupKey = `${task.assigneeId || "unassigned"}_${task.projectId || "none"}`;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, []);
        orderList.push(groupKey);
      }
      groupsMap.get(groupKey)!.push(task);
    }

    const result: TaskItemOrGroup[] = [];
    for (const key of orderList) {
      const groupTasksList = groupsMap.get(key)!;
      if (groupTasksList.length === 1) {
        result.push({ type: "single", task: groupTasksList[0] });
      } else {
        result.push({
          type: "group",
          key,
          assigneeId: groupTasksList[0].assigneeId || undefined,
          projectId: groupTasksList[0].projectId || undefined,
          tasks: groupTasksList,
        });
      }
    }

    return result;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 mt-1">Switch between Kanban, Table List, Calendar, Timeline, and Workload views</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-0.5 border border-slate-200">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "kanban" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>

            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "table" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Table List
            </button>

            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "calendar" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Calendar
            </button>

            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "timeline" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GanttChart className="h-3.5 w-3.5" /> Timeline
            </button>

            <button
              onClick={() => setViewMode("workload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "workload" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Workload Matrix
            </button>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "kanban" && (
              <Button
                variant={isCollagedView ? "default" : "outline"}
                onClick={() => setIsCollagedView(!isCollagedView)}
                className={`h-9 gap-1.5 text-xs font-semibold ${
                  isCollagedView ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm" : "bg-white text-slate-700 border-slate-200"
                }`}
                title="Collage similar tasks into expandable stacks on hover"
              >
                <Layers className="h-3.5 w-3.5" />
                {isCollagedView ? "Collage ON" : "Collage OFF"}
              </Button>
            )}

            <Select value={filterProject} onValueChange={(v) => v && setFilterProject(v)}>
              <SelectTrigger className="w-44 bg-white text-xs h-9"><Filter className="h-3.5 w-3.5 mr-2 text-slate-400" /><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {engagedProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {isElevated && (
              <Select value={filterAssignee} onValueChange={(v) => v && setFilterAssignee(v)}>
                <SelectTrigger className="w-44 bg-white text-xs h-9">
                  <Users className="h-3.5 w-3.5 mr-2 text-slate-400" />
                  <SelectValue placeholder="Everyone's Tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone&apos;s Tasks</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="h-9 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25" />}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Task
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader><DialogTitle className="text-xl font-semibold">Create New Task</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Task Name</Label><Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Design homepage hero" /></div>
                  <div><Label>Description</Label><Textarea className="mt-1.5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Project</Label>
                      <Select value={form.projectId} onValueChange={(v) => v && setForm({ ...form, projectId: v })}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select project" /></SelectTrigger>
                        <SelectContent>{engagedProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={form.priority} onValueChange={(v) => v && setForm({ ...form, priority: v as Priority })}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Assignee</Label>
                      <Select value={form.assigneeId} onValueChange={(v) => v && setForm({ ...form, assigneeId: v })}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Due Date</Label><Input type="date" className="mt-1.5" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Payout</Label>
                      <Input type="number" min={0} step="0.01" className="mt-1.5" value={form.payout || ""} onChange={(e) => setForm({ ...form, payout: Number(e.target.value) || 0 })} placeholder="0.00" />
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-slate-400 pb-2">Payout credited to the assignee on completion.</p>
                    </div>
                  </div>
                  <Button onClick={handleCreate} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white">Create Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-slate-800">Pipeline Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={pipelineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {pipelineData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <Card className="border-0 shadow-md bg-white">
          <CardContent className="p-5 h-full flex flex-col justify-center">
            <p className="text-sm font-medium text-slate-500">Pipeline Completion</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-400 mt-1">{doneCount}/{totalTasks} tasks across {columns.length} stages</p>
            <div className="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500" style={{ width: `${totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Render View based on viewMode state */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 lg:mx-0 lg:px-0">
          {columns.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.status).sort((a, b) => a.order - b.order);
            const groupedItems = groupTasks(colTasks);

            return (
              <div key={col.status} className="flex-shrink-0 w-72 lg:flex-1 lg:w-auto">
                <div className={`rounded-t-xl ${col.headerColor} px-4 py-3 flex items-center justify-between`}>
                  <h3 className="text-sm font-semibold text-white">{col.label}</h3>
                  <span className="text-xs font-medium text-white/70 bg-white/20 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className={`${col.color} border border-t-0 rounded-b-xl p-3 min-h-[400px] space-y-2`}>
                  {groupedItems.map((item) => {
                    if (item.type === "group") {
                      const assignee = members.find((m) => m.id === item.assigneeId);
                      const project = projects.find((p) => p.id === item.projectId);
                      return (
                        <TaskCollageCard
                          key={item.key}
                          tasks={item.tasks}
                          assignee={assignee}
                          project={project}
                          members={members}
                          projects={projects}
                          priorityBadge={priorityBadge}
                          handleMove={handleMove}
                          openProofDialog={openProofDialog}
                          columnStatus={col.status}
                        />
                      );
                    }

                    const task = item.task;
                    const assignee = members.find((m) => m.id === task.assigneeId);
                    const project = projects.find((p) => p.id === task.projectId);
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        className="bg-white rounded-xl p-3 shadow-xs border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 cursor-pointer group my-1.5"
                        onClick={() =>
                          handleMove(
                            task,
                            col.status === "done"
                              ? "todo"
                              : col.status === "backlog"
                              ? "todo"
                              : col.status === "todo"
                              ? "in-progress"
                              : col.status === "in-progress"
                              ? "review"
                              : "done"
                          )
                        }
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={`text-[10px] ${priorityBadge[task.priority]}`}>{task.priority}</Badge>
                          <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm font-medium text-slate-800 mb-1">{task.title}</p>
                        {project && <p className="text-[10px] text-slate-400 mb-2">{project.name}</p>}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.dueDate && <span className="text-[10px] text-slate-400">{formatDate(task.dueDate, { month: "short", day: "numeric" })}</span>}
                            {task.payout > 0 && (
                              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                                <Banknote className="h-2.5 w-2.5" />{task.payout.toLocaleString()}
                              </span>
                            )}
                            {task.proofs && task.proofs.length > 0 && (
                              <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                                <Paperclip className="h-2.5 w-2.5" />{task.proofs.length}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {assignee && <Avatar className="h-5 w-5"><AvatarImage src={assignee.avatar} /><AvatarFallback className="text-[8px]">{initials(assignee.name)}</AvatarFallback></Avatar>}
                            <button
                              onClick={(e) => { e.stopPropagation(); openProofDialog(task); }}
                              className="rounded-lg p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Proof & payout"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {groupedItems.length === 0 && <div className="flex items-center justify-center h-24 text-sm text-slate-400">No tasks</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "table" && (
        <TaskTableView
          tasks={filtered}
          projects={projects}
          members={members}
          priorityBadge={priorityBadge}
          handleMove={handleMove}
          openProofDialog={openProofDialog}
        />
      )}

      {viewMode === "calendar" && (
        <TaskCalendarView
          tasks={filtered}
          projects={projects}
          members={members}
          openProofDialog={openProofDialog}
        />
      )}

      {viewMode === "timeline" && (
        <TaskTimelineView
          tasks={filtered}
          projects={projects}
          members={members}
          priorityBadge={priorityBadge}
          openProofDialog={openProofDialog}
        />
      )}

      {viewMode === "workload" && (
        <TaskWorkloadView
          tasks={filtered}
          members={members}
          openProofDialog={openProofDialog}
        />
      )}

      {/* Proof & Payout dialog */}
      <Dialog open={!!proofTask} onOpenChange={(o) => { if (!o) setProofTask(null); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-semibold">Proof of Completion & Payout</DialogTitle></DialogHeader>
          {proofTask && (
            <div className="space-y-5 mt-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">{proofTask.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{projects.find((p) => p.id === proofTask.projectId)?.name} · {proofTask.status}</p>
              </div>

              <div>
                <Label>Task Payout</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input type="number" min={0} step="0.01" value={payoutDraft || ""} onChange={(e) => setPayoutDraft(Number(e.target.value) || 0)} placeholder="0.00" disabled={!isElevated} />
                  {isElevated && <Button onClick={handleSaveProofDetails} variant="outline" className="shrink-0">Save Payout</Button>}
                </div>
                {!isElevated && <p className="text-xs text-slate-400 mt-1">Payout amount is defined by the task or project creator.</p>}
              </div>

              <div>
                <Label>Completion Note</Label>
                <Textarea className="mt-1.5" rows={2} value={proofNote} onChange={(e) => setProofNote(e.target.value)} placeholder="Describe how this task was completed..." />
                <div className="mt-2"><Button onClick={handleSaveProofDetails} variant="outline" size="sm">Save Note</Button></div>
              </div>

              <div>
                <Label>Proof Files / URLs</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://example.com/proof" />
                  <Button onClick={handleAddProofUrl} variant="outline" className="shrink-0"><Link2 className="h-4 w-4 mr-1.5" />Add URL</Button>
                </div>
                <label className="mt-2 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer font-medium">
                  <Upload className="h-4 w-4" /> Upload a file
                  <input type="file" className="hidden" onChange={handleUploadProof} />
                </label>
                <div className="mt-3 space-y-2">
                  {proofTask.proofs?.length === 0 && <p className="text-sm text-slate-400">No proofs added yet.</p>}
                  {proofTask.proofs?.map((proof) => (
                    <div key={proof.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                      <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${proof.type === "upload" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
                        <Paperclip className="h-3.5 w-3.5" />
                      </span>
                      <a href={proof.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-sm text-slate-700 hover:text-indigo-600 truncate">{proof.name || proof.url}</a>
                      <Badge variant="secondary" className="text-[10px]">{proof.type}</Badge>
                      <button onClick={() => removeTaskProof(proofTask.id, proof.id)} className="rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {isElevated ? (
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Delete task "${proofTask.title}"?`)) {
                        deleteTask(proofTask.id);
                        setProofTask(null);
                      }
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Task
                  </Button>
                  {saveMsg && <p className="text-sm font-medium text-emerald-600">{saveMsg}</p>}
                </div>
              ) : (
                saveMsg && <p className="text-sm font-medium text-emerald-600">{saveMsg}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

