"use client";

import { create } from "zustand";
import { Project, Milestone, Task, Meeting, Activity, TeamMember, AttendanceRecord, TaskProof } from "@/types";
import { seedData } from "@/lib/data";

const STORAGE_KEY = "achariya_crm_store_v2";

function saveLocalData(data: {
  members: TeamMember[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  meetings: Meeting[];
  activities: Activity[];
  attendance: AttendanceRecord[];
}) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Error saving to localStorage:", err);
  }
}

function getLocalData() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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
    // 1. Initial hydration from localStorage if present
    const cached = getLocalData();
    if (cached) {
      set({
        members: cached.members?.length ? cached.members : seedData.members,
        projects: cached.projects?.length ? cached.projects : seedData.projects,
        milestones: cached.milestones?.length ? cached.milestones : seedData.milestones,
        tasks: cached.tasks?.length ? cached.tasks : seedData.tasks,
        meetings: cached.meetings?.length ? cached.meetings : seedData.meetings,
        activities: cached.activities?.length ? cached.activities : seedData.activities,
        attendance: cached.attendance || [],
      });
    }

    try {
      const [membersRes, projectsRes, milestonesRes, tasksRes, meetingsRes, activitiesRes, attendanceRes] = await Promise.all([
        fetch("/api/members").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/projects").then((r) => r.ok ? r.json() : null).then((projects) => (Array.isArray(projects) ? projects.map((p: any) => ({ ...p, memberIds: p.members?.map((m: any) => m.userId) || p.memberIds || [] })) : null)).catch(() => null),
        fetch("/api/milestones").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tasks").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/meetings").then((r) => r.ok ? r.json() : null).then((meetings) => (Array.isArray(meetings) ? meetings.map((m: any) => ({ ...m, attendeeIds: m.attendees?.map((a: any) => a.userId) || m.attendeeIds || [] })) : null)).catch(() => null),
        fetch("/api/activities").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/attendance").then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);

      const cur = get();

      // Merge function that overlays API data on current state without discarding user edits
      const merge = <T extends { id: string }>(apiList: T[] | null, currentList: T[], seedList: T[]) => {
        if (!apiList || apiList.length === 0) return currentList.length > 0 ? currentList : seedList;
        const apiMap = new Map(apiList.map((item) => [item.id, item]));
        const merged = [...apiList];
        for (const item of currentList) {
          if (!apiMap.has(item.id)) {
            merged.push(item);
          }
        }
        return merged;
      };

      const finalMembers = merge(membersRes, cur.members, seedData.members);
      const finalProjects = merge(projectsRes, cur.projects, seedData.projects);
      const finalMilestones = merge(milestonesRes, cur.milestones, seedData.milestones);
      const finalTasks = merge(tasksRes, cur.tasks, seedData.tasks);
      const finalMeetings = Array.isArray(meetingsRes) ? meetingsRes : cur.meetings;
      const finalActivities = Array.isArray(activitiesRes) ? activitiesRes : cur.activities;
      const finalAttendance = Array.isArray(attendanceRes) ? attendanceRes : cur.attendance;

      const newState = {
        members: finalMembers,
        projects: finalProjects,
        milestones: finalMilestones,
        tasks: finalTasks,
        meetings: finalMeetings,
        activities: finalActivities,
        attendance: finalAttendance,
      };

      set(newState);
      saveLocalData(newState);
    } catch (err) {
      console.warn("Store load sync warning:", err);
    }
  },

  addMember: async (member) => {
    const newMember: TeamMember = { ...member, id: `u-${Date.now()}` };
    set((s) => {
      const next = { ...s, members: [newMember, ...s.members] };
      saveLocalData(next);
      return next;
    });
    await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(member) }).catch(() => {});
  },

  updateMember: async (id, updates) => {
    set((s) => {
      const next = { ...s, members: s.members.map((m) => (m.id === id ? { ...m, ...updates } : m)) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/members/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
  },

  deleteMember: async (id) => {
    set((s) => {
      const next = { ...s, members: s.members.filter((m) => m.id !== id) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/members/${id}`, { method: "DELETE" }).catch(() => {});
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
    set((s) => {
      const next = { ...s, projects: [newProj, ...s.projects] };
      saveLocalData(next);
      return next;
    });
    await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) }).catch(() => {});
  },

  updateProject: async (id, updates) => {
    set((s) => {
      const next = { ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
  },

  deleteProject: async (id) => {
    set((s) => {
      const next = { ...s, projects: s.projects.filter((p) => p.id !== id) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
  },

  addMilestone: async (milestone) => {
    const newMs: Milestone = {
      ...milestone,
      id: `m-${Date.now()}`,
    };
    set((s) => {
      const next = { ...s, milestones: [...s.milestones, newMs] };
      saveLocalData(next);
      return next;
    });
    await fetch("/api/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(milestone) }).catch(() => {});
  },

  updateMilestone: async (id, updates) => {
    set((s) => {
      const next = { ...s, milestones: s.milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/milestones/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
  },

  deleteMilestone: async (id) => {
    set((s) => {
      const next = { ...s, milestones: s.milestones.filter((m) => m.id !== id) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/milestones/${id}`, { method: "DELETE" }).catch(() => {});
  },

  addTask: async (task) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      order: 1,
      proofs: [],
      createdAt: new Date().toISOString(),
    };
    set((s) => {
      const next = { ...s, tasks: [newTask, ...s.tasks] };
      saveLocalData(next);
      return next;
    });
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task) }).catch(() => {});
  },

  updateTask: async (id, updates) => {
    set((s) => {
      const next = { ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
  },

  deleteTask: async (id) => {
    set((s) => {
      const next = { ...s, tasks: s.tasks.filter((t) => t.id !== id) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/tasks/${id}`, { method: "DELETE" }).catch(() => {});
  },

  addTaskProof: async (taskId, proof) => {
    const newProof: TaskProof = {
      ...proof,
      id: `proof-${Date.now()}`,
      taskId,
      createdAt: new Date().toISOString(),
    };
    set((s) => {
      const next = {
        ...s,
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, proofs: [...(t.proofs || []), newProof] } : t)),
      };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/tasks/${taskId}/proofs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(proof) }).catch(() => {});
  },

  removeTaskProof: async (taskId, proofId) => {
    set((s) => {
      const next = {
        ...s,
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, proofs: (t.proofs || []).filter((p) => p.id !== proofId) } : t)),
      };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/tasks/${taskId}/proofs/${proofId}`, { method: "DELETE" }).catch(() => {});
  },

  addMeeting: async (meeting) => {
    const newM: Meeting = { ...meeting, id: `meet-${Date.now()}`, roomName: `room-${Date.now()}` };
    set((s) => {
      const next = { ...s, meetings: [newM, ...s.meetings] };
      saveLocalData(next);
      return next;
    });
    await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(meeting) }).catch(() => {});
  },

  updateMeeting: async (id, updates) => {
    set((s) => {
      const next = { ...s, meetings: s.meetings.map((m) => (m.id === id ? { ...m, ...updates } : m)) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/meetings/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }).catch(() => {});
  },

  deleteMeeting: async (id) => {
    set((s) => {
      const next = { ...s, meetings: s.meetings.filter((m) => m.id !== id) };
      saveLocalData(next);
      return next;
    });
    await fetch(`/api/meetings/${id}`, { method: "DELETE" }).catch(() => {});
  },

  addActivity: async (activity) => {
    const newAct: Activity = { ...activity, id: `act-${Date.now()}`, createdAt: new Date().toISOString() };
    set((s) => {
      const next = { ...s, activities: [newAct, ...s.activities] };
      saveLocalData(next);
      return next;
    });
    await fetch("/api/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(activity) }).catch(() => {});
  },
}));

export const useMember = (id?: string) => {
  return useCRMStore((state) => state.members.find((m) => m.id === id));
};
