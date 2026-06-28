import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Task } from '@/lib/contracts/task';
import type { ChangeRequest } from '@/lib/contracts/change-request';
import type { Group } from '@/lib/contracts/groups';
import { seedData, seedGroups } from './seed';

/** The full on-disk database shape. */
export interface DbShape {
  tasks: Task[];
  changeRequests: ChangeRequest[];
  groups: Group[];
  counters: { task: number; changeRequest: number; group: number };
}

/**
 * Idempotent migration for data.json files written before `groups` existed:
 * backfill the built-in sections so older stores self-heal. Mutates in place,
 * returns true if anything changed (so the caller can decide whether to persist).
 */
function normalize(db: DbShape): boolean {
  let changed = false;
  if (!Array.isArray(db.groups) || db.groups.length === 0) {
    db.groups = seedGroups();
    changed = true;
  }
  if (!db.counters) {
    db.counters = { task: db.tasks?.length ?? 0, changeRequest: db.changeRequests?.length ?? 0, group: db.groups.length };
    changed = true;
  } else if (typeof db.counters.group !== 'number') {
    db.counters.group = db.groups.length;
    changed = true;
  }
  return changed;
}

const DATA_DIR = path.join(process.cwd(), 'lib', 'server', 'db');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

/**
 * Serializes writes so concurrent mutations never interleave / corrupt the file.
 * Every public mutation chains onto this promise.
 */
let writeChain: Promise<unknown> = Promise.resolve();

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const initial = seedData();
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

/** READ — always pulls the current state straight from the JSON file. */
export async function readDb(): Promise<DbShape> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const db = JSON.parse(raw) as DbShape;
  normalize(db); // self-heal in memory; persisted on the next mutateDb
  return db;
}

/** Atomic write: write to a temp file then rename over the target. */
async function writeDb(db: DbShape): Promise<void> {
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

/**
 * WRITE — read the file, apply `mutator`, persist the result.
 * Mutations are queued so they run one-at-a-time.
 */
export async function mutateDb<T>(mutator: (db: DbShape) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  };
  const next = writeChain.then(run, run);
  // keep the chain alive even if a mutation rejects
  writeChain = next.catch(() => undefined);
  return next;
}
