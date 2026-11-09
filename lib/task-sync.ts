import fs from "fs";
import os from "os";
import path from "path";
import { seedData } from "@/lib/data";

const SYNC_FILE = path.join(os.tmpdir(), "cwms-tasks-sync-v1.json");

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
