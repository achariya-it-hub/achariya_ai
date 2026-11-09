"use client";

import { use, useEffect } from "react";
import { motion } from "framer-motion";
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
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, initials } from "@/lib/utils";
import { Milestone, Priority, TaskStatus, ProjectStatus } from "@/types";
import { Plus, ArrowLeft, Calendar, CheckCircle2, Circle, Clock, AlertTriangle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const statusIcons = {
  upcoming: <Circle className="h-4 w-4 text-slate-400" />,
  "in-progress": <Clock className="h-4 w-4 text-amber-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  overdue: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

const projectStatusColors: Record<ProjectStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  "on-hold": "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const taskStatusColors: Record<TaskStatus, string> = {
  backlog: "bg-slate-100 text-slate-600",
  todo: "bg-blue-100 text-blue-700",
  "in-progress": "bg-amber-100 text-amber-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-emerald-100 text-emerald-700",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const projects = useCRMStore((s) => s.projects);
  const milestones = useCRMStore((s) => s.milestones);
  const tasks = useCRMStore((s) => s.tasks);
  const members = useCRMStore((s) => s.members);
  const addMilestone = useCRMStore((s) => s.addMilestone);
  const updateMilestone = useCRMStore((s) => s.updateMilestone);
  const deleteMilestone = useCRMStore((s) => s.deleteMilestone);
  const addTask = useCRMStore((s) => s.addTask);
  const updateTask = useCRMStore((s) => s.updateTask);
  const deleteTask = useCRMStore((s) => s.deleteTask);
  const updateProject = useCRMStore((s) => s.updateProject);
  const deleteProject = useCRMStore((s) => s.deleteProject);
  const load = useCRMStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  const project = projects.find((p) => p.id === id);
  const projectMilestones = milestones.filter((m) => m.projectId === id);
  const projectTasks = tasks.filter((t) => t.projectId === id);

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [mForm, setMForm] = useState({ title: "", description: "", dueDate: "" });
  const [tForm, setTForm] = useState({ title: "", description: "", milestoneId: "", priority: "medium" as Priority, assigneeId: "", dueDate: "" });

  if (!project) return <div className="text-center py-20 text-slate-500">Project not found.</div>;

  const role = user?.role || "trainee";
  const isElevated = role === "admin" || role === "manager";
  const isEngaged = project.memberIds.includes(user?.id || "") || project.ownerId === user?.id;

  if (!isElevated && !isEngaged) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md">
          You are only authorized to access projects you are actively engaged in. Please contact your manager or project admin if you need access.
        </p>
        <Link href="/dashboard/projects">
          <Button variant="outline" className="mt-2"><ArrowLeft className="h-4 w-4 mr-2" />Back to My Projects</Button>
        </Link>
      </div>
    );
  }

  const teamMembers = members.filter((m) => project.memberIds.includes(m.id));
  const doneTasks = projectTasks.filter((t) => t.status === "done").length;
  const computedTaskProgress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : project.progress;

  function handleAddMilestone() {
    if (!mForm.title) return;
    addMilestone({ projectId: id, title: mForm.title, description: mForm.description, dueDate: mForm.dueDate || new Date().toISOString().split("T")[0], status: "upcoming" });
    setMilestoneOpen(false);
    setMForm({ title: "", description: "", dueDate: "" });
  }

  function handleAddTask() {
    if (!tForm.title) return;
    addTask({ projectId: id, milestoneId: tForm.milestoneId || undefined, title: tForm.title, description: tForm.description, status: "todo", priority: tForm.priority, assigneeId: tForm.assigneeId || undefined, dueDate: tForm.dueDate || undefined, payout: 0 });
    setTaskOpen(false);
    setTForm({ title: "", description: "", milestoneId: "", priority: "medium", assigneeId: "", dueDate: "" });
  }

  function handleDeleteProject() {
    if (confirm(`Delete project "${project?.name}"? All associated tasks and milestones will also be removed.`)) {
      deleteProject(id);
      router.push("/dashboard/projects");
    }
  }

  function handleDeleteMilestone(mId: string, title: string) {
    if (confirm(`Delete milestone "${title}"?`)) {
      deleteMilestone(mId);
    }
  }

  function handleDeleteTask(tId: string, title: string) {
    if (confirm(`Delete task "${title}"?`)) {
      deleteTask(tId);
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <Link href="/dashboard/projects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-1 rounded-full" style={{ backgroundColor: project.color }} />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                <Badge variant="outline" className={`capitalize text-xs font-semibold ${projectStatusColors[project.status] || ""}`}>
                  {project.status}
                </Badge>
                {project.status === "completed" && (
                  <Badge className="bg-emerald-500 text-white gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </Badge>
                )}
              </div>
              <p className="text-slate-500 mt-1 max-w-2xl">{project.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isElevated && (
              <Button
                variant={project.status === "completed" ? "outline" : "default"}
                size="sm"
                onClick={() => {
                  const nextStatus = project.status === "completed" ? "active" : "completed";
                  const nextProgress = nextStatus === "completed" ? 100 : computedTaskProgress;
                  updateProject(id, { status: nextStatus, progress: nextProgress });
                }}
                className={project.status === "completed" ? "text-slate-600 border-slate-300 hover:bg-slate-50" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {project.status === "completed" ? "Reopen Project" : "Complete Project"}
              </Button>
            )}
            <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                <Plus className="h-4 w-4 mr-1" />Milestone
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Title</Label><Input className="mt-1.5" value={mForm.title} onChange={(e) => setMForm({ ...mForm, title: e.target.value })} /></div>
                  <div><Label>Description</Label><Textarea className="mt-1.5" value={mForm.description} onChange={(e) => setMForm({ ...mForm, description: e.target.value })} /></div>
                  <div><Label>Due Date</Label><Input type="date" className="mt-1.5" value={mForm.dueDate} onChange={(e) => setMForm({ ...mForm, dueDate: e.target.value })} /></div>
                  <Button onClick={handleAddMilestone} className="w-full">Add Milestone</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Link href={`/dashboard/tasks/new?projectId=${id}`}>
              <Button size="sm" className="bg-[#4ea832] hover:bg-[#43932a] text-white shadow-sm">
                <Plus className="h-4 w-4 mr-1" />New Task
              </Button>
            </Link>
            {isElevated && (
              <Button onClick={handleDeleteProject} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-1" />Delete Project
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-white"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{project.progress}%</p><p className="text-xs text-slate-500 mt-1">Progress ({doneTasks}/{projectTasks.length} tasks)</p>
          <Progress value={project.progress} className="h-1.5 mt-2" />
        </CardContent></Card>
        <Card className="border-0 shadow-md bg-white"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{projectTasks.length}</p><p className="text-xs text-slate-500 mt-1">Tasks</p>
        </CardContent></Card>
        <Card className="border-0 shadow-md bg-white"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{projectMilestones.length}</p><p className="text-xs text-slate-500 mt-1">Milestones</p>
        </CardContent></Card>
        <Card className="border-0 shadow-md bg-white"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{teamMembers.length}</p><p className="text-xs text-slate-500 mt-1">Members</p>
        </CardContent></Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="border-0 shadow-md bg-white">
            <CardHeader><CardTitle className="text-lg">Milestones</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {projectMilestones.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No milestones yet.</p>}
              {projectMilestones.map((ms) => (
                <div key={ms.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-4">
                  <button
                    type="button"
                    onClick={() => updateMilestone(ms.id, { status: ms.status === "completed" ? "in-progress" : "completed" })}
                    className="shrink-0 mt-0.5 hover:scale-110 transition-transform cursor-pointer"
                    title={ms.status === "completed" ? "Mark in-progress" : "Mark milestone completed"}
                  >
                    {statusIcons[ms.status]}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${ms.status === "completed" ? "text-slate-400 line-through" : "text-slate-800"}`}>{ms.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{ms.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-400">Due {formatDate(ms.dueDate)}</span>
                      <Select
                        value={ms.status}
                        onValueChange={(val) => val && updateMilestone(ms.id, { status: val as Milestone["status"] })}
                      >
                        <SelectTrigger className="h-6 text-[10px] px-2 py-0 w-auto min-w-[95px] border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="in-progress">In-progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isElevated && (
                    <button onClick={() => handleDeleteMilestone(ms.id, ms.title)} className="rounded-lg p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Milestone">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-0 shadow-md bg-white">
            <CardHeader><CardTitle className="text-lg">Tasks</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {projectTasks.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No tasks yet.</p>}
              {projectTasks.sort((a, b) => a.order - b.order).map((task) => {
                const assignee = members.find((m) => m.id === task.assigneeId);
                return (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:border-indigo-200 transition-colors">
                    <button onClick={() => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })} className="shrink-0">
                      {task.status === "done" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300 hover:text-indigo-500" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/tasks/${task.id}`} className={`text-sm font-medium hover:text-emerald-700 hover:underline ${task.status === "done" ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</Link>
                      {task.dueDate && <p className="text-xs text-slate-400 mt-0.5">Due {formatDate(task.dueDate)}</p>}
                    </div>
                    <Badge variant="secondary" className={`text-[10px] ${taskStatusColors[task.status]}`}>{task.status}</Badge>
                    {assignee && <Avatar className="h-6 w-6"><AvatarImage src={assignee.avatar} /><AvatarFallback className="text-[9px]">{initials(assignee.name)}</AvatarFallback></Avatar>}
                    {isElevated && (
                      <button onClick={() => handleDeleteTask(task.id, task.title)} className="rounded-lg p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Task">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
