import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const TEMPLATE_PATH = path.join(process.cwd(), "src", "server", "legacy", "data", "store.json.template");
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const EMPTY_STORE = { surveys: [], questions: [] };

let writeQueue: Promise<void> = Promise.resolve();

async function initStore() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(STORE_PATH);
  } catch {
    let initialPayload = JSON.stringify(EMPTY_STORE, null, 2);
    try {
      const template = await fsp.readFile(TEMPLATE_PATH, "utf8");
      initialPayload = template.trim() ? template : initialPayload;
    } catch {
      // Fallback to empty store when template is not available.
    }
    await fsp.writeFile(STORE_PATH, initialPayload, "utf8");
  }
}

export async function ensureUploadsDir() {
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function readStore() {
  await initStore();
  const raw = await fsp.readFile(STORE_PATH, "utf8");
  if (!raw.trim()) {
    return { ...EMPTY_STORE };
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`store.json contains invalid JSON: ${(error as Error).message}`);
  }
}

function enqueueWrite(task: () => Promise<void>) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

export async function writeStore(data: unknown) {
  await initStore();
  const serialized = JSON.stringify(data, null, 2);
  return enqueueWrite(async () => {
    const tempPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(tempPath, serialized, "utf8");
    try {
      await fsp.rename(tempPath, STORE_PATH);
    } catch {
      await fsp.writeFile(STORE_PATH, serialized, "utf8");
      await fsp.unlink(tempPath).catch(() => {});
    }
  });
}

export { STORE_PATH, UPLOAD_DIR, fs };
