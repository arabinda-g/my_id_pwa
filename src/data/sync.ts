import type { QueueItem, User } from "./types";
import {
  bumpQueuedAttempts,
  enqueueAction,
  getQueuedActions,
  removeQueuedAction
} from "./db";

const MAX_ATTEMPTS = 5;

export async function queueUpsert(user: User) {
  const item: QueueItem = {
    id: `queue-${user.id}-${Date.now()}`,
    type: "UPSERT_USER",
    payload: user,
    createdAt: Date.now(),
    attempts: 0
  };
  await enqueueAction(item);
}

export async function queueDelete(id: string) {
  const item: QueueItem = {
    id: `queue-delete-${id}-${Date.now()}`,
    type: "DELETE_USER",
    payload: { id },
    createdAt: Date.now(),
    attempts: 0
  };
  await enqueueAction(item);
}

async function defaultRemoteSync(_item: QueueItem) {
  // Replace with a real API call when a backend is available.
  await new Promise((resolve) => setTimeout(resolve, 200));
}

export async function processQueue(
  syncFn: (item: QueueItem) => Promise<void> = defaultRemoteSync
) {
  if (!navigator.onLine) return;
  const items = await getQueuedActions();
  for (const item of items) {
    if (item.attempts >= MAX_ATTEMPTS) continue;
    try {
      await syncFn(item);
      await removeQueuedAction(item.id);
    } catch (error) {
      console.warn("Sync failed, will retry:", error);
      await bumpQueuedAttempts(item.id);
    }
  }
}

export function startQueueProcessor() {
  const handle = () => {
    void processQueue();
  };

  window.addEventListener("online", handle);
  void processQueue();

  return () => {
    window.removeEventListener("online", handle);
  };
}
