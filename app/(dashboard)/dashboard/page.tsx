"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ProgressRing from "@/components/progress-ring";
import { formatDate, initials } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  FolderKanban,
  CheckSquare,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  Banknote,
} from "lucide-react";
import Link from "next/link";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const projects = useCRMStore((s) => s.projects);
  const tasks = useCRMStore((s) => s.tasks);
  const milestones = useCRMStore((s) => s.milestones);
  const meetings = useCRMStore((s) => s.meetings);
  const members = useCRMStore((s) => s.members);
  const activities = useCRMStore((s) => s.activities);
  const load = useCRMStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  const role = user?.role || "trainee";
  const isElevated = role === "admin" || role === "manager";

  // Engaged projects & tasks for current user role
  const allowedProjects = projects.filter((p) => isElevated || p.memberIds.includes(user?.id || "") || p.ownerId === user?.id);
  const allowedProjectIds = allowedProjects.map((p) => p.id);

  const allowedTasks = tasks.filter((t) => {
    if (isElevated) return true;
    if (role === "trainee") return t.assigneeId === user?.id;
    return t.assigneeId === user?.id || allowedProjectIds.includes(t.projectId);
  });

  const myTasks = allowedTasks.filter((t) => t.assigneeId === user?.id);
  const activeProjects = allowedProjects.filter((p) => p.status === "active");
  const overdueTasks = allowedTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done");
  const upcomingMeetings = meetings.filter((m) => isElevated || m.hostId === user?.id || m.attendeeIds?.includes(user?.id || ""));

  const stats = [
    { label: isElevated ? "Active Projects" : "Engaged Projects", value: activeProjects.length, icon: FolderKanban, gradient: "indigo" as const, orb: "bg-fuchsia-400/40" },
    { label: "My Tasks", value: myTasks.length, icon: CheckSquare, gradient: "blue" as const, orb: "bg-cyan-300/40" },
    { label: "Overdue Tasks", value: overdueTasks.length, icon: AlertCircle, gradient: "red" as const, orb: "bg-rose-300/40" },
    { label: "Upcoming Meetings", value: upcomingMeetings.length, icon: Calendar, gradient: "green" as const, orb: "bg-emerald-300/40" },
  ];

  const statThemes: Record<string, string> = {
    indigo: "from-indigo-500 via-purple-500 to-blue-600",
    blue: "from-blue-500 via-cyan-500 to-sky-600",
    red: "from-rose-500 via-red-500 to-orange-500",
    green: "from-emerald-500 via-teal-500 to-green-600",
  };

  const taskStats = {
    done: allowedTasks.filter((t) => t.status === "done").length,
    "in-progress": allowedTasks.filter((t) => t.status === "in-progress").length,
    todo: allowedTasks.filter((t) => t.status === "todo").length,
    backlog: allowedTasks.filter((t) => t.status === "backlog").length,
    review: allowedTasks.filter((t) => t.status === "review").length,
  };

  const STATUS_COLORS: Record<string, string> = {
    backlog: "#94a3b8",
    todo: "#3b82f6",
    "in-progress": "#f59e0b",
    review: "#8b5cf6",
    done: "#10b981",
  };
  const STATUS_LABELS: Record<string, string> = {
    backlog: "Backlog",
    todo: "To Do",
    "in-progress": "In Progress",
    review: "Review",
    done: "Done",
  };
  const statusChartData = (["backlog", "todo", "in-progress", "review", "done"] as const).map((s) => ({
    name: STATUS_LABELS[s],
    count: taskStats[s],
    fill: STATUS_COLORS[s],
  }));

  const statusPieData = (["active", "on-hold", "completed", "cancelled"] as const)
    .map((s) => ({ name: s, value: allowedProjects.filter((p) => p.status === s).length }))
    .filter((d) => d.value > 0);
  const statusPieColors = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"];
  const statusPieLabels: Record<string, string> = {
    active: "Active",
    "on-hold": "On Hold",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative space-y-6">
      {/* animated colorful background mesh */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-indigo-400/30 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-10 right-0 h-72 w-72 rounded-full bg-fuchsia-400/25 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 35, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -25, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">{user?.name?.split(" ")?.[0] || ""}</span>
        </h1>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening across your projects today.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const theme = statThemes[stat.gradient];
          return (
            <motion.div
              key={stat.label}
              variants={item}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card className={`relative overflow-hidden border-0 bg-gradient-to-br ${theme} text-white rounded-2xl shadow-xl shadow-black/20 hover:shadow-2xl`}>
                {/* glossy sheen */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.9),transparent_55%)]" />
                {/* shine sweep */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <motion.div
                    className="absolute top-0 bottom-0 w-1/3 -skew-x-12 bg-white/40 blur-md"
                    initial={{ left: "-40%" }}
                    animate={{ left: ["-40%", "120%"] }}
                    transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                  />
                </div>
                {/* decorative depth orb */}
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${stat.orb} blur-xl`} />
                <div className="absolute -bottom-8 -left-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
                <CardContent className="relative p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/85">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1 drop-shadow-sm">{stat.value}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25 ring-1 ring-white/40 shadow-lg backdrop-blur">
                      <stat.icon className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* User Personal Account Payout Banner */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-5 text-white shadow-lg shadow-emerald-500/10">
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 shadow-inner shrink-0">
                <Banknote className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">My Account Payout Summary</p>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-2xl font-bold">₹{myTasks.filter((t) => t.status === "done").reduce((sum, t) => sum + (t.payout || 0), 0).toLocaleString()}</span>
                  <span className="text-xs text-emerald-100/90 font-medium">Earned (Completed Tasks)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-emerald-100/80">Pending Payout</p>
                <p className="text-lg font-semibold text-amber-200">
                  ₹{myTasks.filter((t) => t.status !== "done").reduce((sum, t) => sum + (t.payout || 0), 0).toLocaleString()}
                </p>
              </div>
              <Link
                href="/dashboard/account"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 shadow-md transition-all duration-200 hover:scale-105"
              >
                View Account Statement <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-white via-white to-indigo-50/70 shadow-md shadow-indigo-500/5 hover:shadow-lg transition-shadow duration-300"><div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 opacity-60" /><div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-300/50 to-fuchsia-300/40 blur-2xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30"><FolderKanban className="h-4 w-4" /></span>
                <CardTitle className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">Active Projects</CardTitle>
              </div>
              <Link href="/dashboard/projects" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No active projects.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {activeProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-100 py-4 px-2 hover:border-indigo-200 hover:shadow-md hover:scale-[1.03] hover:bg-white transition-all duration-200"
                    >
                      <ProgressRing value={project.progress} label={project.name} color={project.color} size={120} stroke={9} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-white via-white to-indigo-50/70 shadow-md shadow-indigo-500/5 hover:shadow-lg transition-shadow duration-300"><div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 opacity-60" /><div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-300/50 to-fuchsia-300/40 blur-2xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"><Users className="h-4 w-4" /></span>
                <CardTitle className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">Team</CardTitle>
              </div>
              <Badge variant="secondary">{members.length} members</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => {
                const memberTasks = tasks.filter((t) => t.assigneeId === member.id && t.status !== "done").length;
                return (
                  <div key={member.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.role}</p>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{memberTasks} tasks</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-white via-white to-indigo-50/70 shadow-md shadow-indigo-500/5 hover:shadow-lg transition-shadow duration-300"><div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 opacity-60" /><div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-300/50 to-fuchsia-300/40 blur-2xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/30"><CheckSquare className="h-4 w-4" /></span>
                <CardTitle className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">Task Overview</CardTitle>
              </div>
              <Link href="/dashboard/tasks" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={statusChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {statusChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-3 mt-1 flex-wrap text-xs text-slate-500">
                {statusChartData.map((s) => (
                  <span key={s.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.fill }} />{s.name}</span>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Overall Progress</span>
                  <span>{tasks.length > 0 ? Math.round((taskStats.done / tasks.length) * 100) : 0}%</span>
                </div>
                <Progress value={tasks.length > 0 ? (taskStats.done / tasks.length) * 100 : 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-white via-white to-indigo-50/70 shadow-md shadow-indigo-500/5 hover:shadow-lg transition-shadow duration-300"><div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 opacity-60" /><div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-300/50 to-fuchsia-300/40 blur-2xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"><Clock className="h-4 w-4" /></span>
                <CardTitle className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">Activity Feed</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[280px] overflow-y-auto">
              {activities.slice(0, 10).map((activity) => {
                const user = members.find((m) => m.id === activity.userId);
                const actionColor = { created: "bg-emerald-500", completed: "bg-blue-500", updated: "bg-amber-500", scheduled: "bg-purple-500" };
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: (actionColor as Record<string, string>)[activity.action] || "#94a3b8" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-800">{user?.name}</span>{" "}
                        {activity.action} a {activity.target}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(activity.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-white via-white to-indigo-50/70 shadow-md shadow-indigo-500/5 hover:shadow-lg transition-shadow duration-300"><div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 opacity-60" /><div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-300/50 to-fuchsia-300/40 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30"><TrendingUp className="h-4 w-4" /></span>
              <CardTitle className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">Projects by Status</CardTitle>
            </div>
            <Link href="/dashboard/projects" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={200} className="max-w-[240px] shrink-0">
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {statusPieData.map((_, i) => <Cell key={i} fill={statusPieColors[i % statusPieColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 w-full">
                  {statusPieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: statusPieColors[i % statusPieColors.length] }} />
                      <span className="text-slate-600 capitalize">{statusPieLabels[d.name] ?? d.name}</span>
                      <span className="text-slate-400 ml-auto font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No projects yet.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
