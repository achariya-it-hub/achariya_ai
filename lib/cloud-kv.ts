import fs from "fs";
import os from "os";
import path from "path";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "cwms-cloud-db-v1";
const LOCAL_KV_FILE = path.join(process.cwd(), ".cwms-local-cloud-kv.json");
const TMP_KV_FILE = path.join(os.tmpdir(), "cwms-local-cloud-kv.json");

const memCache: Record<string, unknown> = {};

function hasNetlifyBlobsContext(): boolean {
  return Boolean(
    process.env.NETLIFY_BLOBS_CONTEXT ||
      process.env.NETLIFY ||
      (globalThis as any).netlifyBlobsContext
  );
}

function readLocalFileStore(): Record<string, unknown> {
  for (const filePath of [LOCAL_KV_FILE, TMP_KV_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
      }
    } catch {}
  }
  return {};
}

function writeLocalFileStore(all: Record<string, unknown>) {
  for (const filePath of [LOCAL_KV_FILE, TMP_KV_FILE]) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(all, null, 2), "utf8");
      return;
    } catch {}
  }
}

export async function cloudKvGet<T>(key: string, fallback: T): Promise<T> {
  if (hasNetlifyBlobsContext()) {
    try {
      const store = getStore({ name: STORE_NAME, consistency: "strong" });
      const val = (await store.get(key, { type: "json" })) as T | null;
      if (val !== null && val !== undefined) {
        memCache[key] = val;
        return val;
      }
    } catch (err) {
      console.warn(`Netlify Blobs GET fallback for "${key}":`, err);
    }
  }

  const localStore = readLocalFileStore();
  if (localStore[key] !== undefined) {
    memCache[key] = localStore[key];
    return localStore[key] as T;
  }

  if (memCache[key] !== undefined) {
    return memCache[key] as T;
  }

  return fallback;
}

export async function cloudKvSet<T>(key: string, value: T): Promise<void> {
  memCache[key] = value;

  if (hasNetlifyBlobsContext()) {
    try {
      const store = getStore({ name: STORE_NAME, consistency: "strong" });
      await store.setJSON(key, value);
    } catch (err) {
      console.warn(`Netlify Blobs SET fallback for "${key}":`, err);
    }
  }

  const localStore = readLocalFileStore();
  localStore[key] = value;
  writeLocalFileStore(localStore);
}
