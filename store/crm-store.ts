"use client";

import { create } from "zustand";
import { Project, Milestone, Task, Meeting, Activity, TeamMember, AttendanceRecord, TaskProof } from "@/types";
import { seedData } from "@/lib/data";

interface CRMStore {
  members: TeamMember[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  meetings: Meeting[];
  activities: Activity[];
  attendance: AttendanceRecord[];
  load: () => Promise<void>;
  addMember: (member: Omit<TeamMember, "id">) => Promise<void>;
  updateMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  checkInOut: (action: "in" | "out", userId?: string) => Promise<{ error?: string }>;
  addProject: (project: Omit<Project, "id" | "createdAt">) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addMilestone: (milestone: Omit<Milestone, "id">) => Promise<void>;
  updateMilestone: (id: string, updates: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  addTask: (task: Omit<Task, "id" | "createdAt" | "order" | "proofs">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskProof: (taskId: string, proof: Omit<TaskProof, "id" | "taskId" | "createdAt">) => Promise<void>;
  removeTaskProof: (taskId: string, proofId: string) => Promise<void>;
  addMeeting: (meeting: Omit<Meeting, "id" | "roomName">) => Promise<void>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  addActivity: (activity: Omit<Activity, "id" | "createdAt">) => Promise<void>;
}

export const useCRMStore = create<CRMStore>()((set, get) => ({
  members: seedData.members,
  projects: seedData.projects,
  milestones: seedData.milestones,
  tasks: seedData.tasks,
  meetings: seedData.meetings,
  activities: seedData.activities,
  attendance: [],

  load: async () => {
    try {
      const [membersRes, projectsRes, milestonesRes, tasksRes, meetingsRes, activitiesRes, attendanceRes] = await Promise.all([
        fetch("/api/members").then((r) => r.ok ? r.json() : seedData.members).catch(() => seedData.members),
        fetch("/api/projects").then((r) => r.ok ? r.json() : seedData.projects).then((projects) => (Array.isArray(projects) && projects.length > 0 ? projects : seedData.projects).map((p: any) => ({ ...p, memberIds: p.members?.map((m: any) => m.userId) || p.memberIds || [] }))).catch(() => seedData.projects),
        fetch("/api/milestones").then((r) => r.ok ? r.json() : seedData.milestones).catch(() => seedData.milestones),
        fetch("/api/tasks").then((r) => r.ok ? r.json() : seedData.tasks).catch(() => seedData.tasks),
        fetch("/api/meetings").then((r) => r.ok ? r.json() : seedData.meetings).then((meetings) => (Array.isArray(meetings) ? meetings : seedData.meetings).map((m: any) => ({ ...m, attendeeIds: m.attendees?.map((a: any) => a.userId) || m.attendeeIds || [] }))).catch(() => seedData.meetings),
        fetch("/api/activities").then((r) => r.ok ? r.json() : seedData.activities).catch(() => seedData.activities),
        fetch("/api/attendance").then((r) => r.ok ? r.json() : []).catch(() => []),
      ]);

      set({
        members: Array.isArray(membersRes) && membersRes.length > 0 ? membersRes : seedData.members,
        projects: Array.isArray(projectsRes) && projectsRes.length > 0 ? projectsRes : seedData.projects,
        milestones: Array.isArray(milestonesRes) && milestonesRes.length > 0 ? milestonesRes : seedData.milestones,
        tasks: Array.isArray(tasksRes) && tasksRes.length > 0 ? tasksRes : seedData.tasks,
        meetings: Array.isArray(meetingsRes) ? meetingsRes : seedData.meetings,
        activities: Array.isArray(activitiesRes) ? activitiesRes : seedData.activities,
        attendance: Array.isArray(attendanceRes) ? attendanceRes : [],
      });
    } catch (err) {
      console.warn("Store load error, preserving seedData fallback:", err);
    }
  },

  addMember: async (member) => {
    await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(member) }).catch(() => {});
    await get().load();
  },

  updateMember: async (id, updates) => {
    await fetch(`/api/members/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
    await get().load();
  },

  deleteMember: async (id) => {
    set((s) => ({ members: s.members.filter((m) => m.id !== id) }));
    await fetch(`/api/members/${id}`, { method: "DELETE" }).catch(() => {});
    await get().load();
  },

  checkInOut: async (action, userId) => {
    try {
      const res = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, userId }) });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Failed to update attendance" };
      await get().load();
      return {};
    } catch (err) {
      return { error: "Network error updating attendance" };
    }
  },

  addProject: async (project) => {
    const newProj: Project = {
      ...project,
      id: `p-${Date.now()}`,
      progress: project.progress || 0,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ projects: [newProj, ...s.projects] }));
    await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) }).catch(() => {});
    await get().load();
  },

  updateProject: async (id, updates) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    await fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
    await get().load();
  },

  deleteProject: async (id) => {
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
    await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
    await get().load();
  },

  addMilestone: async (milestone) => {
    const newMs: Milestone = {
      ...milestone,
      id: `m-${Date.now()}`,
    };
    set((s) => ({ milestones: [...s.milestones, newMs] }));
    await fetch("/api/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(milestone) }).catch(() => {});
    await get().load();
  },

  updateMilestone: async (id, updates) => {
    set((s) => ({
      milestones: s.milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
    await fetch(`/api/milestones/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
    await get().load();
  },

  deleteMilestone: async (id) => {
    set((s) => ({ milestones: s.milestones.filter((m) => m.id !== id) }));
    await fetch(`/api/milestones/${id}`, { method: "DELETE" }).catch(() => {});
    await get().load();
  },

  addTask: async (task) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      order: 1,
      proofs: [],
      createdAt: new Date().toISOString(),
    };
    // Optimistic store update
    set((s) => ({ tasks: [newTask, ...s.tasks] }));
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task) }).catch(() => {});
    await get().load();
  },

  updateTask: async (id, updates) => {
    // Optimistic store update
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    await fetch(`/api/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
    await get().load();
  },

  deleteTask: async (id) => {
    // Optimistic store update
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" }).catch(() => {});
    await get().load();
  },

  addTaskProof: async (taskId, proof) => {
    await fetch(`/api/tasks/${taskId}/proofs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(proof) }).catch(() => {});
    await get().load();
  },

  removeTaskProof: async (taskId, proofId) => {
    await fetch(`/api/tasks/${taskId}/proofs/${proofId}`, { method: "DELETE" }).catch(() => {});
    await get().load();
  },

  addMeeting: async (meeting) => {
    await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(meeting) }).catch(() => {});
    await get().load();
  },

  updateMeeting: async (id, updates) => {
    await fetch(`/api/meetings/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
    await get().load();
  },

  deleteMeeting: async (id) => {
    await fetch(`/api/meetings/${id}`, { method: "DELETE" }).catch(() => {});
    await get().load();
  },

  addActivity: async (activity) => {
    await fetch("/api/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(activity) }).catch(() => {});
    await get().load();
  },
}));

export const useMember = (id?: string) => {
  return useCRMStore((state) => state.members.find((m) => m.id === id));
};
