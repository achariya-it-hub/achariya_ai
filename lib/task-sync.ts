import fs from "fs";
import os from "os";
import path from "path";
import { seedData, seedMembers } from "@/lib/data";

const SYNC_FILE = path.join(os.tmpdir(), "cwms-tasks-sync-v1.json");
const MEMBER_SYNC_FILE = path.join(os.tmpdir(), "cwms-members-sync-v1.json");

interface SyncState {
  upserted: Record<string, Record<string, unknown>>;
  deleted: string[];
}

const globalForSync = globalThis as unknown as { cwmsTaskSync?: SyncState };

function loadSyncState(): SyncState {
  if (globalForSync.cwmsTaskSync) {
    return globalForSync.cwmsTaskSync;
  }
  try {
    if (fs.existsSync(SYNC_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SYNC_FILE, "utf8")) as SyncState;
      globalForSync.cwmsTaskSync = {
        upserted: parsed.upserted || {},
        deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
      };
      return globalForSync.cwmsTaskSync;
    }
  } catch {}
  globalForSync.cwmsTaskSync = { upserted: {}, deleted: [] };
  return globalForSync.cwmsTaskSync;
}

function saveSyncState(state: SyncState) {
  globalForSync.cwmsTaskSync = state;
  try {
    fs.writeFileSync(SYNC_FILE, JSON.stringify(state), "utf8");
  } catch {}
}

export const PRISMA_TASK_FIELDS = new Set([
  "id",
  "projectId",
  "milestoneId",
  "title",
  "description",
  "status",
  "workflowState",
  "isPaused",
  "priority",
  "assigneeId",
  "assignedByName",
  "dueDate",
  "dueTime",
  "completedAt",
  "order",
  "payout",
  "payoutStatus",
  "reviewFeedback",
  "submissionRemarks",
  "proofNote",
  "marketingType",
  "creativeType",
  "platform",
  "sbu",
  "assetCode",
  "taskCode",
  "workloadPercent",
  "isManualWorkload",
  "estimatedHours",
  "actualHours",
  "assignedAt",
  "officialDeadline",
  "warningDeadline",
  "criticalDeadline",
  "referenceLink",
  "driveLink",
  "finalOutputLink",
  "remarks",
  "commentsJson",
  "activityJson",
]);

export function sanitizePrismaTaskInput(
  raw: Record<string, unknown>,
  isCreate: boolean
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (PRISMA_TASK_FIELDS.has(key) && val !== undefined) {
      clean[key] = val;
    }
  }
  if (raw.comments && !clean.commentsJson) {
    clean.commentsJson = JSON.stringify(raw.comments);
  }
  if (raw.activityLog && !clean.activityJson) {
    clean.activityJson = JSON.stringify(raw.activityLog);
  }
  if (isCreate) {
    if (typeof clean.title !== "string" || !clean.title.trim()) {
      clean.title = "Untitled Task";
    }
    if (typeof clean.description !== "string") {
      clean.description = "";
    }
    if (typeof clean.projectId !== "string" || !clean.projectId.trim()) {
      clean.projectId = "1";
    }
    if (typeof clean.status !== "string" || !clean.status.trim()) {
      clean.status = "todo";
    }
    if (typeof clean.priority !== "string" || !clean.priority.trim()) {
      clean.priority = "medium";
    }
  }
  return clean;
}

export function recordSyncedTaskUpsert(task: Record<string, unknown>) {
  const id = String(task.id || "");
  if (!id) return;
  const state = loadSyncState();
  state.upserted[id] = { ...(state.upserted[id] || {}), ...task };
  state.deleted = state.deleted.filter((d) => d !== id);
  saveSyncState(state);

  // Also keep in-memory seedData.tasks in sync
  const idx = seedData.tasks.findIndex((t) => t.id === id);
  if (idx >= 0) {
    seedData.tasks[idx] = { ...seedData.tasks[idx], ...(task as any) };
  } else {
    seedData.tasks.unshift(task as any);
  }
}

export function recordSyncedTaskDelete(id: string) {
  const state = loadSyncState();
  delete state.upserted[id];
  if (!state.deleted.includes(id)) {
    state.deleted.push(id);
  }
  saveSyncState(state);

  const idx = seedData.tasks.findIndex((t) => t.id === id);
  if (idx >= 0) {
    seedData.tasks.splice(idx, 1);
  }
}

export function mergeTasksWithSyncState<T extends { id: string }>(baseTasks: T[]): T[] {
  const state = loadSyncState();
  const deletedSet = new Set(state.deleted);
  const map = new Map<string, T>();

  for (const t of baseTasks) {
    if (!deletedSet.has(t.id)) {
      const patch = state.upserted[t.id];
      map.set(t.id, patch ? ({ ...t, ...patch } as T) : t);
    }
  }

  for (const [id, item] of Object.entries(state.upserted)) {
    if (!deletedSet.has(id) && !map.has(id)) {
      map.set(id, item as unknown as T);
    }
  }

  return Array.from(map.values());
}

const globalForMemberSync = globalThis as unknown as {
  cwmsMemberSync?: Record<string, Record<string, unknown>>;
  cwmsDeletedMembers?: string[];
  cwmsWorkspaceSettings?: WorkspaceSettings;
};

const MEMBER_DELETED_FILE = path.join(os.tmpdir(), "cwms-members-deleted-v1.json");
const SETTINGS_SYNC_FILE = path.join(os.tmpdir(), "cwms-settings-sync-v1.json");

export interface SbuConfigItem {
  id: string;
  name: string;
  code: string;
  color: string;
  active: boolean;
}

export interface ModuleConfigItem {
  id: string;
  label: string;
  href: string;
  mobileTab?: boolean;
  enabled: boolean;
  roles: string[];
}

export interface LeaderboardConfig {
  enabled: boolean;
  showOnDashboard: boolean;
  pointsPerCompleted: number;
  pointsPerOnTime: number;
  pointsPerUrgent: number;
  penaltyPerCorrection: number;
  manualBonusByUserId: Record<string, number>;
}

export interface PeakPerformersConfig {
  enabled: boolean;
  showBannerOnDashboard: boolean;
  badgeTitle: string;
  periodLabel: string;
  featuredUserIds: string[];
  spotlightNotes: Record<string, string>;
}

export interface WorkspaceSettings {
  // 1. Entity name, logo, details
  entityName: string;
  entitySubtitle: string;
  entityTagline: string;
  logoUrl: string;
  entityEmail: string;
  entityPhone: string;
  entityAddress: string;
  entityWebsite: string;
  // 2. Color scheme
  colorScheme: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  // 3. SBU list
  sbuList: SbuConfigItem[];
  // 5. Modules displayed to users
  modules: ModuleConfigItem[];
  // 6. Leaderboard configuration
  leaderboardConfig: LeaderboardConfig;
  // 7. Peak Performed Users configuration
  peakPerformersConfig: PeakPerformersConfig;
  updatedAt?: string;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  entityName: "Digiventures",
  entitySubtitle: "CREATIVE WORKFLOW OS",
  entityTagline: "CRM & Creative Operations Workspace",
  logoUrl: "/logo.png",
  entityEmail: "ops@achariya.ai",
  entityPhone: "+91 98765 43210",
  entityAddress: "Achariya World Class Education HQ, Puducherry",
  entityWebsite: "https://achariya.ai",
  colorScheme: "navy-pink",
  primaryColor: "#1A3A5C",
  accentColor: "#E91E63",
  secondaryColor: "#4F46E5",
  sbuList: [
    { id: "sbu-1", name: "Achariya", code: "ACH", color: "#4F46E5", active: true },
    { id: "sbu-2", name: "Q School", code: "QSC", color: "#EC4899", active: true },
    { id: "sbu-3", name: "Miway", code: "MIW", color: "#0EA5E9", active: true },
    { id: "sbu-4", name: "WOW", code: "WOW", color: "#F59E0B", active: true },
    { id: "sbu-5", name: "MINDS", code: "MND", color: "#8B5CF6", active: true },
    { id: "sbu-6", name: "RAW", code: "RAW", color: "#10B981", active: true },
    { id: "sbu-7", name: "Institute of Yoga", code: "IOY", color: "#14B8A6", active: true },
    { id: "sbu-8", name: "WIN Real Estate", code: "WIN", color: "#F97316", active: true },
    { id: "sbu-9", name: "DV IA", code: "DVIA", color: "#6366F1", active: true },
  ],
  modules: [
    { id: "dashboard", label: "Dashboard", href: "/dashboard", mobileTab: true, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "tasks", label: "Tasks", href: "/dashboard/tasks", mobileTab: true, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "approvals", label: "Approvals", href: "/dashboard/approvals", mobileTab: true, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "workload", label: "Workload", href: "/dashboard/workload", mobileTab: true, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "analytics", label: "Analytics", href: "/dashboard/productivity", mobileTab: true, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "projects", label: "Projects", href: "/dashboard/projects", mobileTab: false, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "timeline", label: "Timeline", href: "/dashboard/timeline", mobileTab: false, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "team", label: "Team", href: "/dashboard/team", mobileTab: false, enabled: true, roles: ["admin", "manager"] },
    { id: "meetings", label: "Meetings", href: "/dashboard/meetings", mobileTab: false, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "social", label: "Calendar", href: "/dashboard/social", mobileTab: false, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "attendance", label: "Attendance", href: "/dashboard/attendance", mobileTab: false, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "chat", label: "Peer Chat", href: "/dashboard/chat", mobileTab: false, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
    { id: "account", label: "Trainee Payouts", href: "/dashboard/account", mobileTab: false, enabled: true, roles: ["admin"] },
    { id: "whatsapp", label: "WhatsApp Integration", href: "/dashboard/whatsapp", mobileTab: false, enabled: true, roles: ["admin"] },
    { id: "profile", label: "My Profile", href: "/dashboard/profile", mobileTab: false, enabled: true, roles: ["admin", "manager", "member", "trainee"] },
  ],
  leaderboardConfig: {
    enabled: true,
    showOnDashboard: true,
    pointsPerCompleted: 10,
    pointsPerOnTime: 5,
    pointsPerUrgent: 5,
    penaltyPerCorrection: 2,
    manualBonusByUserId: {},
  },
  peakPerformersConfig: {
    enabled: true,
    showBannerOnDashboard: true,
    badgeTitle: "Peak Performer of the Month",
    periodLabel: "November 2026",
    featuredUserIds: [],
    spotlightNotes: {},
  },
};

export function getWorkspaceSettings(): WorkspaceSettings {
  if (globalForMemberSync.cwmsWorkspaceSettings) {
    return globalForMemberSync.cwmsWorkspaceSettings;
  }
  try {
    if (fs.existsSync(SETTINGS_SYNC_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SETTINGS_SYNC_FILE, "utf8"));
      globalForMemberSync.cwmsWorkspaceSettings = {
        ...DEFAULT_WORKSPACE_SETTINGS,
        ...parsed,
        leaderboardConfig: {
          ...DEFAULT_WORKSPACE_SETTINGS.leaderboardConfig,
          ...(parsed.leaderboardConfig || {}),
        },
        peakPerformersConfig: {
          ...DEFAULT_WORKSPACE_SETTINGS.peakPerformersConfig,
          ...(parsed.peakPerformersConfig || {}),
        },
      };
      return globalForMemberSync.cwmsWorkspaceSettings!;
    }
  } catch {}
  globalForMemberSync.cwmsWorkspaceSettings = { ...DEFAULT_WORKSPACE_SETTINGS };
  return globalForMemberSync.cwmsWorkspaceSettings;
}

export function updateWorkspaceSettings(
  patch: Partial<WorkspaceSettings>
): WorkspaceSettings {
  const current = getWorkspaceSettings();
  const next: WorkspaceSettings = {
    ...current,
    ...patch,
    leaderboardConfig: patch.leaderboardConfig
      ? { ...current.leaderboardConfig, ...patch.leaderboardConfig }
      : current.leaderboardConfig,
    peakPerformersConfig: patch.peakPerformersConfig
      ? { ...current.peakPerformersConfig, ...patch.peakPerformersConfig }
      : current.peakPerformersConfig,
    updatedAt: new Date().toISOString(),
  };
  globalForMemberSync.cwmsWorkspaceSettings = next;
  try {
    fs.writeFileSync(SETTINGS_SYNC_FILE, JSON.stringify(next), "utf8");
  } catch {}
  return next;
}

function loadMemberSync(): Record<string, Record<string, unknown>> {
  if (globalForMemberSync.cwmsMemberSync) {
    return globalForMemberSync.cwmsMemberSync;
  }
  try {
    if (fs.existsSync(MEMBER_SYNC_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(MEMBER_SYNC_FILE, "utf8"));
      globalForMemberSync.cwmsMemberSync = parsed || {};
      return globalForMemberSync.cwmsMemberSync!;
    }
  } catch {}
  globalForMemberSync.cwmsMemberSync = {};
  return globalForMemberSync.cwmsMemberSync;
}

function loadDeletedMembers(): Set<string> {
  if (globalForMemberSync.cwmsDeletedMembers) {
    return new Set(globalForMemberSync.cwmsDeletedMembers);
  }
  try {
    if (fs.existsSync(MEMBER_DELETED_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(MEMBER_DELETED_FILE, "utf8"));
      if (Array.isArray(parsed)) {
        globalForMemberSync.cwmsDeletedMembers = parsed;
        return new Set(parsed);
      }
    }
  } catch {}
  globalForMemberSync.cwmsDeletedMembers = [];
  return new Set();
}

export function recordSyncedMemberUpsert(member: Record<string, unknown>) {
  const id = String(member.id || "");
  if (!id) return;
  const state = loadMemberSync();
  state[id] = { ...(state[id] || {}), ...member };
  globalForMemberSync.cwmsMemberSync = state;
  try {
    fs.writeFileSync(MEMBER_SYNC_FILE, JSON.stringify(state), "utf8");
  } catch {}

  const deleted = loadDeletedMembers();
  if (deleted.has(id)) {
    deleted.delete(id);
    globalForMemberSync.cwmsDeletedMembers = Array.from(deleted);
    try {
      fs.writeFileSync(
        MEMBER_DELETED_FILE,
        JSON.stringify(globalForMemberSync.cwmsDeletedMembers),
        "utf8"
      );
    } catch {}
  }

  const idx = seedMembers.findIndex((m) => m.id === id);
  if (idx >= 0) {
    seedMembers[idx] = { ...seedMembers[idx], ...(member as any) };
  } else if (member.name && member.email) {
    seedMembers.push(member as any);
  }
}

export function recordSyncedMemberDelete(id: string) {
  if (!id) return;
  const state = loadMemberSync();
  delete state[id];
  globalForMemberSync.cwmsMemberSync = state;
  try {
    fs.writeFileSync(MEMBER_SYNC_FILE, JSON.stringify(state), "utf8");
  } catch {}

  const deleted = loadDeletedMembers();
  deleted.add(id);
  globalForMemberSync.cwmsDeletedMembers = Array.from(deleted);
  try {
    fs.writeFileSync(
      MEMBER_DELETED_FILE,
      JSON.stringify(globalForMemberSync.cwmsDeletedMembers),
      "utf8"
    );
  } catch {}

  const idx = seedMembers.findIndex((m) => m.id === id);
  if (idx >= 0) {
    seedMembers.splice(idx, 1);
  }
}

export function mergeMembersWithSyncState<T extends { id: string }>(
  baseMembers: T[]
): T[] {
  const state = loadMemberSync();
  const deleted = loadDeletedMembers();
  const seen = new Set<string>();
  const result: T[] = [];

  const normalizeMember = (raw: Record<string, unknown>): T => {
    const merged = { ...raw };
    if (typeof merged.email === "string" && merged.email.includes("@")) {
      const localPart = merged.email.split("@")[0].trim().toLowerCase();
      const domain = merged.email.split("@")[1]?.trim().toLowerCase();
      if (
        domain === "cwms.local" ||
        domain === "achariya.in" ||
        domain === "achariya.org" ||
        domain === "digital-crm.com"
      ) {
        merged.email = `${localPart}@achariya.ai`;
      }
    }
    return merged as unknown as T;
  };

  for (const m of baseMembers) {
    if (deleted.has(m.id)) continue;
    seen.add(m.id);
    const patch = state[m.id];
    result.push(normalizeMember((patch ? { ...m, ...patch } : { ...m }) as Record<string, unknown>));
  }

  for (const [id, item] of Object.entries(state)) {
    if (!deleted.has(id) && !seen.has(id) && item.name && item.email) {
      seen.add(id);
      result.push(normalizeMember({ id, ...item }));
    }
  }

  return result;
}


