"use client";

import { create } from "zustand";
import { Project, Milestone, Task, Meeting, Activity, TeamMember, AttendanceRecord, TaskProof } from "@/types";
import { seedData } from "@/lib/data";

const STORAGE_KEY = "achariya_crm_store_v3";

const DELETED_KEY = "achariya_crm_deleted_ids";

function getDeletedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function addDeletedId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = getDeletedIds();
    ids.add(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.warn("Error saving deleted ID:", err);
  }
}

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

let isSyncing = false;
let lastSyncTime = 0;

export const useCRMStore = create<CRMStore>()((set, get) => ({
  members: seedData.members,
  projects: seedData.projects,
  milestones: seedData.milestones,
  tasks: seedData.tasks,
  meetings: seedData.meetings,
  activities: seedData.activities,
  attendance: [],

  load: async (force?: boolean) => {
    const now = Date.now();
    if (isSyncing || (!force && now - lastSyncTime < 5000)) {
      return;
    }
    isSyncing = true;

    const deleted = getDeletedIds();

    // 1. Initial hydration from localStorage if present
    const cached = getLocalData();
    if (cached) {
      set({
        members: (cached.members?.length ? cached.members : seedData.members).filter((m: any) => !deleted.has(m.id)),
        projects: (cached.projects?.length ? cached.projects : seedData.projects).filter((p: any) => !deleted.has(p.id)),
        milestones: (cached.milestones?.length ? cached.milestones : seedData.milestones).filter((m: any) => !deleted.has(m.id)),
        tasks: (cached.tasks?.length ? cached.tasks : seedData.tasks).filter((t: any) => !deleted.has(t.id)),
        meetings: (cached.meetings?.length ? cached.meetings : seedData.meetings).filter((m: any) => !deleted.has(m.id)),
        activities: (cached.activities?.length ? cached.activities : seedData.activities).filter((a: any) => !deleted.has(a.id)),
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

      // Merge function that strictly enforces deleted ID exclusion and avoids resurrecting deleted items
      const merge = <T extends { id: string }>(apiList: T[] | null, currentList: T[], seedList: T[]) => {
        let baseList: T[] = [];
        if (Array.isArray(apiList) && apiList.length > 0) {
          baseList = apiList.filter((item) => !deleted.has(item.id));
        } else if (currentList.length > 0) {
          baseList = currentList.filter((item) => !deleted.has(item.id));
        } else {
          baseList = seedList.filter((item) => !deleted.has(item.id));
        }

        const baseMap = new Map(baseList.map((item) => [item.id, item]));
        const merged = [...baseList];
        for (const item of currentList) {
          if (
            !deleted.has(item.id) &&
            !baseMap.has(item.id) &&
            (item.id.startsWith("task-") || item.id.startsWith("p-") || item.id.startsWith("m-") || item.id.startsWith("u-") || item.id.startsWith("meet-"))
          ) {
            merged.push(item);
          }
        }
        return merged;
      };

      const isSame = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

      const mergedMembers = merge(membersRes, cur.members, seedData.members);
      const mergedProjects = merge(projectsRes, cur.projects, seedData.projects);
      const mergedMilestones = merge(milestonesRes, cur.milestones, seedData.milestones);
      const mergedTasks = merge(tasksRes, cur.tasks, seedData.tasks);
      const mergedMeetings = Array.isArray(meetingsRes) ? meetingsRes : cur.meetings;
      const mergedActivities = Array.isArray(activitiesRes) ? activitiesRes : cur.activities;
      const mergedAttendance = Array.isArray(attendanceRes) ? attendanceRes : cur.attendance;

      const finalMembers = isSame(mergedMembers, cur.members) ? cur.members : mergedMembers;
      const finalProjects = isSame(mergedProjects, cur.projects) ? cur.projects : mergedProjects;
      const finalMilestones = isSame(mergedMilestones, cur.milestones) ? cur.milestones : mergedMilestones;
      const finalTasks = isSame(mergedTasks, cur.tasks) ? cur.tasks : mergedTasks;
      const finalMeetings = isSame(mergedMeetings, cur.meetings) ? cur.meetings : mergedMeetings;
      const finalActivities = isSame(mergedActivities, cur.activities) ? cur.activities : mergedActivities;
      const finalAttendance = isSame(mergedAttendance, cur.attendance) ? cur.attendance : mergedAttendance;

      const hasChanged =
        finalMembers !== cur.members ||
        finalProjects !== cur.projects ||
        finalMilestones !== cur.milestones ||
        finalTasks !== cur.tasks ||
        finalMeetings !== cur.meetings ||
        finalActivities !== cur.activities ||
        finalAttendance !== cur.attendance;

      if (hasChanged) {
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
      }
    } catch (err) {
      console.warn("Store load sync warning:", err);
    } finally {
      isSyncing = false;
      lastSyncTime = Date.now();
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
    addDeletedId(id);
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
    addDeletedId(id);
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
    addDeletedId(id);
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
    addDeletedId(id);
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
    addDeletedId(id);
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
