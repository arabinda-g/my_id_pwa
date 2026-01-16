import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import type { QueueItem, User } from "./types";

interface InfoCardSchema extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: { "by-updatedAt": number };
  };
  queue: {
    key: string;
    value: QueueItem;
    indexes: { "by-createdAt": number };
  };
}

const DB_NAME = "info-card-db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<InfoCardSchema>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<InfoCardSchema>(DB_NAME, DB_VERSION, {
      upgrade: async (db, oldVersion, _newVersion, transaction) => {
        if (oldVersion < 1) {
          const userStore = db.createObjectStore("users", {
            keyPath: "id"
          });
          userStore.createIndex("by-updatedAt", "updatedAt");

          const queueStore = db.createObjectStore("queue", {
            keyPath: "id"
          });
          queueStore.createIndex("by-createdAt", "createdAt");
        }

        if (oldVersion < 2) {
          const userStore = transaction.objectStore("users");
          const users = await userStore.getAll();
          await Promise.all(
            users.map(async (user) => {
              if (typeof user.notes !== "string") {
                const updated = { ...user, notes: "" };
                await userStore.put(updated);
              }
            })
          );
        }
      }
    });
  }

  return dbPromise;
}

function lastWriteWins(existing: User | undefined, incoming: User) {
  // Customize conflict resolution here (currently last-write-wins by updatedAt).
  if (!existing) return incoming;
  return existing.updatedAt >= incoming.updatedAt ? existing : incoming;
}

export async function getUser(id: string) {
  const db = await getDb();
  return db.get("users", id);
}

export async function getAllUsers() {
  const db = await getDb();
  return db.getAll("users");
}

export async function upsertUser(user: User) {
  const db = await getDb();
  const existing = await db.get("users", user.id);
  const resolved = lastWriteWins(existing, user);
  await db.put("users", resolved);
  return resolved;
}

export async function deleteUser(id: string) {
  const db = await getDb();
  await db.delete("users", id);
}

export async function clearUsers() {
  const db = await getDb();
  await db.clear("users");
}

export async function clearQueue() {
  const db = await getDb();
  await db.clear("queue");
}

export async function exportData() {
  const users = await getAllUsers();
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    users
  };
}

export async function importData(data: { users: User[] }) {
  const db = await getDb();
  const tx = db.transaction("users", "readwrite");
  await tx.store.clear();
  await Promise.all(
    data.users.map(async (user) => {
      await tx.store.put(user);
    })
  );
  await tx.done;
}

export async function enqueueAction(item: QueueItem) {
  const db = await getDb();
  await db.put("queue", item);
}

export async function getQueuedActions() {
  const db = await getDb();
  return db.getAllFromIndex("queue", "by-createdAt");
}

export async function removeQueuedAction(id: string) {
  const db = await getDb();
  await db.delete("queue", id);
}

export async function bumpQueuedAttempts(id: string) {
  const db = await getDb();
  const item = await db.get("queue", id);
  if (!item) return;
  await db.put("queue", { ...item, attempts: item.attempts + 1 });
}

export { DB_VERSION };
