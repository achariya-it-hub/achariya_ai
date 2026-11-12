"use client";

import { create } from "zustand";
import { Project, Milestone, Task, Meeting, Activity, TeamMember, AttendanceRecord, TaskProof, SocialPost, CalendarEvent, ChatMessage } from "@/types";
import { seedData } from "@/lib/data";

const STORAGE_KEY = "achariya_crm_store_v4_clean";

const DELETED_KEY = "achariya_crm_deleted_ids_v4";

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
  socialPosts?: SocialPost[];
  calendarEvents?: CalendarEvent[];
  chatMessages?: ChatMessage[];
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
    localStorage.removeItem("achariya_crm_store_v3");
    localStorage.removeItem("achariya_crm_deleted_ids");
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
  socialPosts: SocialPost[];
  calendarEvents: CalendarEvent[];
  chatMessages: ChatMessage[];
  load: (force?: boolean) => Promise<void>;
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
  addCalendarEvent: (event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => Promise<CalendarEvent>;
  bulkImportCalendarEvents: (events: Array<Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">>) => Promise<number>;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  toggleEventProcessed: (id: string, isProcessed: boolean, processedBy?: string) => Promise<void>;
  snoozeCalendarReminder: (id: string, additionalMinutes?: number) => Promise<void>;
  addSocialPost: (post: Omit<SocialPost, "id" | "createdAt" | "updatedAt">) => Promise<SocialPost>;
  bulkImportSocialPosts: (posts: Array<Omit<SocialPost, "id" | "createdAt" | "updatedAt">>) => Promise<number>;
  updateSocialPost: (id: string, updates: Partial<SocialPost>) => Promise<void>;
  deleteSocialPost: (id: string) => Promise<void>;
  snoozeSocialPostReminder: (id: string, additionalMinutes?: number) => Promise<void>;
  toggleSocialPostProcessed: (id: string, isProcessed: boolean) => Promise<void>;
  sendChatMessage: (msg: { senderId: string; receiverId: string; content: string; fileUrl?: string; fileName?: string }) => Promise<ChatMessage>;
  loadChatMessages: (userId?: string, peerId?: string) => Promise<void>;
  resetAllAppData: () => Promise<void>;
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
  socialPosts: seedData.socialPosts || [],
  calendarEvents: seedData.calendarEvents || [],
  chatMessages: seedData.chatMessages || [],

  load: async (force?: boolean) => {
    const now = Date.now();
    if (isSyncing || (!force && now - lastSyncTime < 3000)) {
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
        calendarEvents: (cached.calendarEvents?.length ? cached.calendarEvents : (seedData.calendarEvents || [])).filter((e: any) => !deleted.has(e.id)),
        socialPosts: (cached.socialPosts?.length ? cached.socialPosts : (seedData.socialPosts || [])).filter((s: any) => !deleted.has(s.id)),
        chatMessages: cached.chatMessages?.length ? cached.chatMessages : (seedData.chatMessages || []),
      });
    }

    try {
      let serverDeletedTaskIds: string[] = [];
      const [membersRes, projectsRes, milestonesRes, tasksRes, meetingsRes, activitiesRes, attendanceRes, calendarRes, socialRes, chatRes] = await Promise.all([
        fetch("/api/members", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/projects", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((projects) => (Array.isArray(projects) ? projects.map((p: any) => ({ ...p, memberIds: p.members?.map((m: any) => m.userId) || p.memberIds || [] })) : null)).catch(() => null),
        fetch("/api/milestones", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tasks", { cache: "no-store" })
          .then(async (r) => {
            if (!r.ok) return null;
            const delHeader = r.headers.get("x-deleted-task-ids");
            if (delHeader) {
              serverDeletedTaskIds = delHeader.split(",").map((s) => s.trim()).filter(Boolean);
            }
            return r.json();
          })
          .catch(() => null),
        fetch("/api/meetings", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((meetings) => (Array.isArray(meetings) ? meetings.map((m: any) => ({ ...m, attendeeIds: m.attendees?.map((a: any) => a.userId) || m.attendeeIds || [] })) : null)).catch(() => null),
        fetch("/api/activities", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/attendance", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/calendar", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/social", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/chat", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);

      for (const delId of serverDeletedTaskIds) {
        if (!deleted.has(delId)) {
          deleted.add(delId);
          addDeletedId(delId);
        }
      }

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
        for (const s of seedList) {
          if (!deleted.has(s.id) && !baseMap.has(s.id)) {
            baseMap.set(s.id, s);
            merged.push(s);
          }
        }
        for (const item of currentList) {
          if (
            !deleted.has(item.id) &&
            !baseMap.has(item.id) &&
            (item.id.startsWith("task-") || item.id.startsWith("p-") || item.id.startsWith("m-") || item.id.startsWith("u-") || item.id.startsWith("meet-") || item.id.startsWith("sp-") || item.id.startsWith("cal-"))
          ) {
            baseMap.set(item.id, item);
            merged.push(item);
          }
        }
        return merged;
      };

      const isSame = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

      // Trust authoritative server responses (/api/members, /api/projects, /api/tasks)
      // so creations, updates, and deletions sync across devices without resurrecting seed items!
      const mergedMembers =
        Array.isArray(membersRes) && membersRes.length > 0
          ? membersRes.filter((item: any) => !deleted.has(item.id))
          : merge(membersRes, cur.members, seedData.members);
      const mergedProjects =
        Array.isArray(projectsRes) && projectsRes.length > 0
          ? projectsRes.filter((item: any) => !deleted.has(item.id))
          : merge(projectsRes, cur.projects, seedData.projects);
      const mergedMilestones = merge(milestonesRes, cur.milestones, seedData.milestones);
      const rawMergedTasks = merge(tasksRes, cur.tasks, seedData.tasks);

      // If any local task in cur.tasks wasn't in tasksRes yet, re-push it in the background
      // so serverless instances & other devices stay 100% in sync.
      if (Array.isArray(tasksRes)) {
        const serverTaskIdSet = new Set(tasksRes.map((t: any) => t.id));
        for (const localTask of cur.tasks) {
          if (!deleted.has(localTask.id) && !serverTaskIdSet.has(localTask.id)) {
            fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(localTask),
            }).catch(() => {});
          }
        }
      }
      // Enforce trainee-only payout policy (reset non-trainee & Ramkumar payouts to 0)
      const mergedTasks = rawMergedTasks.map((t) => {
        const assignee = mergedMembers.find((m) => m.id === t.assigneeId);
        const isTrainee = assignee?.role === "trainee";
        if (!isTrainee && (t.payout > 0 || t.payoutStatus)) {
          return { ...t, payout: 0, payoutStatus: undefined };
        }
        return t;
      });
      const mergedMeetings = Array.isArray(meetingsRes) ? meetingsRes : cur.meetings;
      const mergedActivities = Array.isArray(activitiesRes) ? activitiesRes : cur.activities;
      const mergedAttendance = Array.isArray(attendanceRes) ? attendanceRes : cur.attendance;
      const mergedCalendarEvents = merge(calendarRes, cur.calendarEvents, seedData.calendarEvents || []);
      const mergedSocialPosts = merge(socialRes, cur.socialPosts, seedData.socialPosts || []);

      const finalMembers = isSame(mergedMembers, cur.members) ? cur.members : mergedMembers;
      const finalProjects = isSame(mergedProjects, cur.projects) ? cur.projects : mergedProjects;
      const finalMilestones = isSame(mergedMilestones, cur.milestones) ? cur.milestones : mergedMilestones;
      const finalTasks = isSame(mergedTasks, cur.tasks) ? cur.tasks : mergedTasks;
      const finalMeetings = isSame(mergedMeetings, cur.meetings) ? cur.meetings : mergedMeetings;
      const finalActivities = isSame(mergedActivities, cur.activities) ? cur.activities : mergedActivities;
      const finalAttendance = isSame(mergedAttendance, cur.attendance) ? cur.attendance : mergedAttendance;
      const finalSocialPosts = isSame(mergedSocialPosts, cur.socialPosts) ? (cur.socialPosts || []) : mergedSocialPosts;
      const finalCalendarEvents = isSame(mergedCalendarEvents, cur.calendarEvents) ? (cur.calendarEvents || []) : mergedCalendarEvents;

      let mergedChat = cur.chatMessages || [];
      if (Array.isArray(chatRes) && chatRes.length > 0) {
        const chatMap = new Map(mergedChat.map((m) => [m.id, m]));
        for (const msg of chatRes) {
          chatMap.set(msg.id, msg);
        }
        mergedChat = Array.from(chatMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
      const finalChatMessages = isSame(mergedChat, cur.chatMessages) ? cur.chatMessages : mergedChat;

      const hasChanged =
        finalMembers !== cur.members ||
        finalProjects !== cur.projects ||
        finalMilestones !== cur.milestones ||
        finalTasks !== cur.tasks ||
        finalMeetings !== cur.meetings ||
        finalActivities !== cur.activities ||
        finalAttendance !== cur.attendance ||
        finalSocialPosts !== cur.socialPosts ||
        finalCalendarEvents !== cur.calendarEvents ||
        finalChatMessages !== cur.chatMessages;

      if (hasChanged) {
        const newState = {
          members: finalMembers,
          projects: finalProjects,
          milestones: finalMilestones,
          tasks: finalTasks,
          meetings: finalMeetings,
          activities: finalActivities,
          attendance: finalAttendance,
          socialPosts: finalSocialPosts,
          calendarEvents: finalCalendarEvents,
          chatMessages: finalChatMessages,
        };
        set(newState);
        saveLocalData(newState as any);
      }
    } catch (err) {
      console.warn("Store load sync warning:", err);
    } finally {
      isSyncing = false;
      lastSyncTime = Date.now();
    }
  },

  addMember: async (member) => {
    const generatedId = `u-${Date.now()}`;
    const newMember: TeamMember = { ...member, id: generatedId };
    set((s) => {
      const next = { ...s, members: [newMember, ...s.members] };
      saveLocalData(next);
      return next;
    });
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          set((s) => {
            const next = {
              ...s,
              members: s.members.map((m) =>
                m.id === generatedId ? { ...m, ...saved } : m
              ),
            };
            saveLocalData(next);
            return next;
          });
        }
      }
    } catch {}
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
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...project, id: newProj.id }),
    }).catch(() => {});
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
    lastSyncTime = Date.now();
    set((s) => {
      const next = { ...s, tasks: [newTask, ...s.tasks] };
      saveLocalData(next);
      return next;
    });
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTask }),
      });
      lastSyncTime = Date.now();
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          set((s) => {
            const next = {
              ...s,
              tasks: s.tasks.map((t) =>
                t.id === newTask.id ? { ...t, ...saved, id: newTask.id } : t
              ),
            };
            saveLocalData(next);
            return next;
          });
        }
      }
    } catch {}
  },

  updateTask: async (id, updates) => {
    set((s) => {
      const existing = s.tasks.find((t) => t.id === id);
      const assigneeId = updates.assigneeId !== undefined ? updates.assigneeId : existing?.assigneeId;
      const assignee = s.members.find((m) => m.id === assigneeId);
      const isTrainee = assignee?.role === "trainee";

      const safeUpdates = { ...updates };
      if (!isTrainee) {
        safeUpdates.payout = 0;
        safeUpdates.payoutStatus = undefined;
      }

      const next = { ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...safeUpdates } : t)) };
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

  addCalendarEvent: async (event) => {
    const tempId = `cal-${Date.now()}`;
    const newEv: CalendarEvent = {
      ...event,
      id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => {
      const next = { ...s, calendarEvents: [newEv, ...s.calendarEvents] };
      saveLocalData(next as any);
      return next;
    });
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (res.ok) {
        const saved = await res.json();
        set((s) => {
          const next = {
            ...s,
            calendarEvents: s.calendarEvents.map((e) => (e.id === tempId ? saved : e)),
          };
          saveLocalData(next as any);
          return next;
        });
        return saved;
      }
    } catch (e) {
      console.warn("Failed to create calendar event on server:", e);
    }
    return newEv;
  },

  bulkImportCalendarEvents: async (events) => {
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(events),
      });
      if (res.ok) {
        const createdList = await res.json();
        if (Array.isArray(createdList)) {
          set((s) => {
            const next = {
              ...s,
              calendarEvents: [...createdList, ...s.calendarEvents],
            };
            saveLocalData(next as any);
            return next;
          });
          return createdList.length;
        }
      }
    } catch (e) {
      console.warn("Server bulk import failed, falling back to local:", e);
    }

    const now = Date.now();
    const createdList: CalendarEvent[] = events.map((ev, idx) => ({
      ...ev,
      id: `cal-imp-${now}-${idx}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    set((s) => {
      const next = { ...s, calendarEvents: [...createdList, ...s.calendarEvents] };
      saveLocalData(next as any);
      return next;
    });
    return createdList.length;
  },

  updateCalendarEvent: async (id, updates) => {
    set((s) => {
      const next = {
        ...s,
        calendarEvents: s.calendarEvents.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)),
      };
      saveLocalData(next as any);
      return next;
    });
    await fetch(`/api/calendar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});
  },

  toggleEventProcessed: async (id, isProcessed, processedBy) => {
    const updates = {
      isProcessed,
      status: (isProcessed ? "processed" : "pending") as any,
      processedAt: isProcessed ? new Date().toISOString() : null,
      processedBy: isProcessed ? (processedBy || "Current User") : null,
    };
    set((s) => {
      const next = {
        ...s,
        calendarEvents: s.calendarEvents.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)),
      };
      saveLocalData(next as any);
      return next;
    });
    await fetch(`/api/calendar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});
  },

  deleteCalendarEvent: async (id: string) => {
    addDeletedId(id);
    set((s) => {
      const next = {
        ...s,
        calendarEvents: s.calendarEvents.filter((e) => e.id !== id),
      };
      saveLocalData(next as any);
      return next;
    });
    await fetch(`/api/calendar/${id}`, { method: "DELETE" }).catch(() => {});
  },

  snoozeCalendarReminder: async (id, additionalMinutes = 15) => {
    const cur = get().calendarEvents.find((e) => e.id === id);
    if (!cur) return;
    const newCount = (cur.reminderCount || 0) + 1;
    const snoozedUntil = new Date(Date.now() + additionalMinutes * 60 * 1000).toISOString();
    const updates = {
      lastRemindedAt: new Date().toISOString(),
      snoozedUntil,
      reminderCount: newCount,
    };
    set((s) => {
      const next = {
        ...s,
        calendarEvents: s.calendarEvents.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      };
      saveLocalData(next as any);
      return next;
    });
    await fetch(`/api/calendar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});
  },

  addSocialPost: async (post) => {
    const tempId = `post-${Date.now()}`;
    const newPost: SocialPost = {
      ...post,
      id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => {
      const next = { ...s, socialPosts: [newPost, ...(s.socialPosts || [])] };
      saveLocalData(next as any);
      return next;
    });
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });
      if (res.ok) {
        const saved = await res.json();
        set((s) => {
          const next = {
            ...s,
            socialPosts: s.socialPosts.map((p) => (p.id === tempId ? saved : p)),
          };
          saveLocalData(next as any);
          return next;
        });
        return saved;
      }
    } catch (e) {
      console.warn("Failed to create social post on server:", e);
    }
    return newPost;
  },

  bulkImportSocialPosts: async (posts) => {
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(posts),
      });
      if (res.ok) {
        const createdList = await res.json();
        if (Array.isArray(createdList)) {
          set((s) => {
            const next = {
              ...s,
              socialPosts: [...createdList, ...(s.socialPosts || [])],
            };
            saveLocalData(next as any);
            return next;
          });
          return createdList.length;
        }
      }
    } catch (e) {
      console.warn("Server bulk import of social posts failed:", e);
    }

    const now = Date.now();
    const createdList: SocialPost[] = posts.map((p, idx) => ({
      ...p,
      id: `post-imp-${now}-${idx}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    set((s) => {
      const next = { ...s, socialPosts: [...createdList, ...(s.socialPosts || [])] };
      saveLocalData(next as any);
      return next;
    });
    return createdList.length;
  },

  updateSocialPost: async (id, updates) => {
    set((s) => {
      const next = {
        ...s,
        socialPosts: s.socialPosts.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)),
      };
      saveLocalData(next as any);
      return next;
    });
    await fetch(`/api/social/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});
  },

  deleteSocialPost: async (id: string) => {
    addDeletedId(id);
    set((s) => {
      const next = {
        ...s,
        socialPosts: s.socialPosts.filter((p) => p.id !== id),
      };
      saveLocalData(next as any);
      return next;
    });
    await fetch(`/api/social/${id}`, { method: "DELETE" }).catch(() => {});
  },

  snoozeSocialPostReminder: async (id: string, additionalMinutes = 15) => {
    const snoozedUntil = new Date(Date.now() + additionalMinutes * 60 * 1000).toISOString();
    const updates = {
      lastRemindedAt: new Date().toISOString(),
      snoozedUntil,
    };
    set((s) => {
      const next = {
        ...s,
        socialPosts: s.socialPosts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      };
      saveLocalData(next as any);
      return next;
    });
    await fetch(`/api/social/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});
  },

  toggleSocialPostProcessed: async (id: string, isProcessed: boolean) => {
    const updates: Partial<SocialPost> = {
      isProcessed,
      status: isProcessed ? "published" : "scheduled",
      publishedAt: isProcessed ? new Date().toISOString() : null,
    };
    set((s) => {
      const next = {
        ...s,
        socialPosts: s.socialPosts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      };
      saveLocalData(next as any);
      return next;
    });
    await fetch(`/api/social/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});
  },

  sendChatMessage: async ({ senderId, receiverId, content, fileUrl, fileName }) => {
    const tempId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newMsg: ChatMessage = {
      id: tempId,
      senderId,
      receiverId,
      content,
      fileUrl,
      fileName,
      status: "sent",
      timestamp: new Date().toISOString(),
    };

    set((s) => {
      const next = {
        ...s,
        chatMessages: [...(s.chatMessages || []), newMsg],
      };
      saveLocalData(next as any);
      return next;
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId, content, fileUrl, fileName }),
      });
      if (res.ok) {
        const saved = await res.json();
        set((s) => {
          const next = {
            ...s,
            chatMessages: (s.chatMessages || []).map((m) => (m.id === tempId ? { ...m, id: saved.id, status: saved.status || "delivered" } : m)),
          };
          saveLocalData(next as any);
          return next;
        });
        return saved;
      }
    } catch (err) {
      console.warn("Error sending chat message:", err);
    }
    return newMsg;
  },

  loadChatMessages: async (userId?: string, peerId?: string) => {
    try {
      const query = new URLSearchParams();
      if (userId) query.set("userId", userId);
      if (peerId) query.set("peerId", peerId);
      const res = await fetch(`/api/chat?${query.toString()}`);
      if (res.ok) {
        const messages: ChatMessage[] = await res.json();
        if (Array.isArray(messages) && messages.length > 0) {
          set((s) => {
            const map = new Map((s.chatMessages || []).map((m) => [m.id, m]));
            for (const m of messages) {
              map.set(m.id, m);
            }
            const updated = Array.from(map.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            const next = { ...s, chatMessages: updated };
            saveLocalData(next as any);
            return next;
          });
        }
      }
    } catch (err) {
      console.warn("Error loading chat messages:", err);
    }
  },

  resetAllAppData: async () => {
    try {
      await fetch("/api/tasks", { method: "DELETE" });
    } catch (err) {
      console.warn("Error calling DELETE /api/tasks:", err);
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(DELETED_KEY);
        localStorage.removeItem("achariya_crm_store_v3");
        localStorage.removeItem("achariya_crm_deleted_ids");
      } catch {}
    }
    set((s) => {
      const next = {
        ...s,
        projects: s.projects.map((p) => ({ ...p, progress: 0 })),
        milestones: [],
        tasks: [],
        meetings: [],
        activities: [],
        attendance: [],
        socialPosts: [],
        calendarEvents: [],
        chatMessages: [],
      };
      saveLocalData(next as any);
      return next;
    });
  },
}));

export const useMember = (id?: string) => {
  return useCRMStore((state) => state.members.find((m) => m.id === id));
};
