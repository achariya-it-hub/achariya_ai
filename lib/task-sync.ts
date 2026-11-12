import { seedData, seedMembers } from "@/lib/data";
import { cloudKvGet, cloudKvSet } from "@/lib/cloud-kv";

interface EntitySyncState {
  upserted: Record<string, Record<string, unknown>>;
  deleted: string[];
}

const TASKS_KV_KEY = "tasks-sync-v3-clean";
const MEMBERS_KV_KEY = "members-sync-v2";
const PROJECTS_KV_KEY = "projects-sync-v3-clean";
const ATTENDANCE_KV_KEY = "attendance-sync-v3-clean";
const SETTINGS_KV_KEY = "workspace-settings-v2";

async function loadEntitySync(key: string): Promise<EntitySyncState> {
  const raw = await cloudKvGet<EntitySyncState>(key, {
    upserted: {},
    deleted: [],
  });
  return {
    upserted: raw?.upserted || {},
    deleted: Array.isArray(raw?.deleted) ? raw.deleted : [],
  };
}

async function saveEntitySync(key: string, state: EntitySyncState): Promise<void> {
  await cloudKvSet(key, state);
}

// ============================================================================
// 1. TASKS SYNC
// ============================================================================
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
      clean.projectId = "p1";
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

export async function recordSyncedTaskUpsert(task: Record<string, unknown>) {
  const id = String(task.id || "");
  if (!id) return;
  const state = await loadEntitySync(TASKS_KV_KEY);
  state.upserted[id] = { ...(state.upserted[id] || {}), ...task };
  state.deleted = state.deleted.filter((d) => d !== id);
  await saveEntitySync(TASKS_KV_KEY, state);

  const idx = seedData.tasks.findIndex((t) => t.id === id);
  if (idx >= 0) {
    seedData.tasks[idx] = { ...seedData.tasks[idx], ...(task as any) };
  } else {
    seedData.tasks.unshift(task as any);
  }
}

export async function recordSyncedTaskDelete(id: string) {
  if (!id) return;
  const state = await loadEntitySync(TASKS_KV_KEY);
  delete state.upserted[id];
  if (!state.deleted.includes(id)) {
    state.deleted.push(id);
  }
  await saveEntitySync(TASKS_KV_KEY, state);

  const idx = seedData.tasks.findIndex((t) => t.id === id);
  if (idx >= 0) {
    seedData.tasks.splice(idx, 1);
  }
}

export async function mergeTasksWithSyncState<T extends { id: string }>(
  baseTasks: T[]
): Promise<T[]> {
  const state = await loadEntitySync(TASKS_KV_KEY);
  const deletedSet = new Set(state.deleted);
  const map = new Map<string, T>();

  for (const [id, item] of Object.entries(state.upserted)) {
    if (!deletedSet.has(id) && item.title) {
      map.set(id, item as unknown as T);
    }
  }

  for (const t of baseTasks) {
    if (!deletedSet.has(t.id)) {
      const patch = state.upserted[t.id];
      map.set(t.id, patch ? ({ ...t, ...patch } as T) : t);
    }
  }

  return Array.from(map.values());
}

export async function getDeletedTaskIds(): Promise<string[]> {
  const state = await loadEntitySync(TASKS_KV_KEY);
  return state.deleted;
}

export async function clearAllSyncedTasksAndData() {
  const prev = await loadEntitySync(TASKS_KV_KEY);
  const allPrevIds = Array.from(
    new Set([
      ...prev.deleted,
      ...Object.keys(prev.upserted),
      ...seedData.tasks.map((t) => t.id),
    ])
  );
  await saveEntitySync(TASKS_KV_KEY, { upserted: {}, deleted: allPrevIds });
  await cloudKvSet(ATTENDANCE_KV_KEY, []);
  seedData.tasks = [];
  seedData.milestones = [];
  seedData.meetings = [];
  seedData.activities = [];
  seedData.attendance = [];
  seedData.calendarEvents = [];
  seedData.socialPosts = [];
  seedData.chatMessages = [];
}

// ============================================================================
// 2. PROJECTS SYNC
// ============================================================================
export async function recordSyncedProjectUpsert(project: Record<string, unknown>) {
  const id = String(project.id || "");
  if (!id) return;
  const state = await loadEntitySync(PROJECTS_KV_KEY);
  state.upserted[id] = { ...(state.upserted[id] || {}), ...project };
  state.deleted = state.deleted.filter((d) => d !== id);
  await saveEntitySync(PROJECTS_KV_KEY, state);
}

export async function recordSyncedProjectDelete(id: string) {
  if (!id) return;
  const state = await loadEntitySync(PROJECTS_KV_KEY);
  delete state.upserted[id];
  if (!state.deleted.includes(id)) {
    state.deleted.push(id);
  }
  await saveEntitySync(PROJECTS_KV_KEY, state);
}

export async function mergeProjectsWithSyncState<T extends { id: string }>(
  baseProjects: T[]
): Promise<T[]> {
  const state = await loadEntitySync(PROJECTS_KV_KEY);
  const deletedSet = new Set(state.deleted);
  const map = new Map<string, T>();

  for (const [id, item] of Object.entries(state.upserted)) {
    if (!deletedSet.has(id) && item.name) {
      map.set(id, item as unknown as T);
    }
  }

  for (const p of baseProjects) {
    if (!deletedSet.has(p.id)) {
      const patch = state.upserted[p.id];
      map.set(p.id, patch ? ({ ...p, ...patch } as T) : p);
    }
  }

  return Array.from(map.values());
}

// ============================================================================
// 3. ATTENDANCE SYNC
// ============================================================================
export async function getSyncedAttendance<T extends { id: string }>(
  dbRecords: T[]
): Promise<T[]> {
  const cloudRecords = await cloudKvGet<T[]>(ATTENDANCE_KV_KEY, []);
  const map = new Map<string, T>();
  for (const r of dbRecords) map.set(r.id, r);
  for (const r of cloudRecords) map.set(r.id, r);
  return Array.from(map.values()).sort(
    (a: any, b: any) =>
      new Date(b.clockInAt || 0).getTime() - new Date(a.clockInAt || 0).getTime()
  );
}

export async function recordSyncedAttendance(record: Record<string, unknown>) {
  const id = String(record.id || "");
  if (!id) return;
  const list = await cloudKvGet<Record<string, unknown>[]>(ATTENDANCE_KV_KEY, []);
  const idx = list.findIndex((r) => String(r.id) === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...record };
  } else {
    list.unshift(record);
  }
  await cloudKvSet(ATTENDANCE_KV_KEY, list);
}

// ============================================================================
// 4. WORKSPACE SETTINGS SYNC
// ============================================================================
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
  entityName: string;
  entitySubtitle: string;
  entityTagline: string;
  logoUrl: string;
  entityEmail: string;
  entityPhone: string;
  entityAddress: string;
  entityWebsite: string;
  colorScheme: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  sbuList: SbuConfigItem[];
  modules: ModuleConfigItem[];
  leaderboardConfig: LeaderboardConfig;
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

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  const stored = await cloudKvGet<Partial<WorkspaceSettings> | null>(
    SETTINGS_KV_KEY,
    null
  );
  if (!stored) return { ...DEFAULT_WORKSPACE_SETTINGS };
  return {
    ...DEFAULT_WORKSPACE_SETTINGS,
    ...stored,
    leaderboardConfig: {
      ...DEFAULT_WORKSPACE_SETTINGS.leaderboardConfig,
      ...(stored.leaderboardConfig || {}),
    },
    peakPerformersConfig: {
      ...DEFAULT_WORKSPACE_SETTINGS.peakPerformersConfig,
      ...(stored.peakPerformersConfig || {}),
    },
  };
}

export async function updateWorkspaceSettings(
  patch: Partial<WorkspaceSettings>
): Promise<WorkspaceSettings> {
  const current = await getWorkspaceSettings();
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
  await cloudKvSet(SETTINGS_KV_KEY, next);
  return next;
}

// ============================================================================
// 5. MEMBERS SYNC
// ============================================================================
export async function isMemberDeleted(id: string): Promise<boolean> {
  const state = await loadEntitySync(MEMBERS_KV_KEY);
  return state.deleted.includes(id);
}

export function sanitizeUserForPrisma(raw: Record<string, unknown>) {
  const cleanEmail =
    typeof raw.email === "string" && raw.email.includes("@")
      ? `${raw.email.split("@")[0].trim().toLowerCase()}@achariya.ai`
      : `${String(raw.name || "user")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "")}@achariya.ai`;

  return {
    ...(typeof raw.id === "string" && raw.id.trim() ? { id: raw.id.trim() } : {}),
    name: String(raw.name || "New Member").trim(),
    email: cleanEmail,
    password: String(raw.password || "demo123"),
    role: String(raw.role || "member"),
    avatar:
      typeof raw.avatar === "string" && raw.avatar.trim()
        ? raw.avatar.trim()
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            String(raw.name || "User")
          )}`,
    department: String(raw.department || "Design"),
    title: String(raw.title || "Creative Specialist"),
    phone: String(raw.phone || "+91 98765 43220"),
    joinDate: String(raw.joinDate || new Date().toISOString().slice(0, 10)),
    status: String(raw.status || "active"),
    attendanceEnabled:
      typeof raw.attendanceEnabled === "boolean" ? raw.attendanceEnabled : true,
  };
}

export async function recordSyncedMemberUpsert(member: Record<string, unknown>) {
  const id = String(member.id || "");
  if (!id) return;
  const state = await loadEntitySync(MEMBERS_KV_KEY);
  state.upserted[id] = { ...(state.upserted[id] || {}), ...member };
  state.deleted = state.deleted.filter((d) => d !== id);
  await saveEntitySync(MEMBERS_KV_KEY, state);

  const idx = seedMembers.findIndex((m) => m.id === id);
  if (idx >= 0) {
    seedMembers[idx] = { ...seedMembers[idx], ...(member as any) };
  } else if (member.name && member.email) {
    seedMembers.push(member as any);
  }
}

export async function recordSyncedMemberDelete(id: string) {
  if (!id) return;
  const state = await loadEntitySync(MEMBERS_KV_KEY);
  delete state.upserted[id];
  if (!state.deleted.includes(id)) {
    state.deleted.push(id);
  }
  await saveEntitySync(MEMBERS_KV_KEY, state);

  const idx = seedMembers.findIndex((m) => m.id === id);
  if (idx >= 0) {
    seedMembers.splice(idx, 1);
  }
}

export async function mergeMembersWithSyncState<T extends { id: string }>(
  baseMembers: T[]
): Promise<T[]> {
  const state = await loadEntitySync(MEMBERS_KV_KEY);
  const deleted = new Set(state.deleted);
  const seen = new Set<string>();
  const result: T[] = [];

  const normalizeMember = (raw: Record<string, unknown>): T => {
    const seedMatch = seedMembers.find((s) => s.id === raw.id);
    const merged: Record<string, unknown> = {
      ...(seedMatch?.employeeId ? { employeeId: seedMatch.employeeId } : {}),
      ...raw,
    };
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
    const patch = state.upserted[m.id];
    result.push(
      normalizeMember(
        (patch ? { ...m, ...patch } : { ...m }) as Record<string, unknown>
      )
    );
  }

  for (const [id, item] of Object.entries(state.upserted)) {
    if (!deleted.has(id) && !seen.has(id) && item.name && item.email) {
      seen.add(id);
      result.push(normalizeMember({ id, ...item }));
    }
  }

  return result;
}
