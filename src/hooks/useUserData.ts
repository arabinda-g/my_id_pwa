import { useCallback, useEffect, useState } from "react";
import { sampleUser } from "../data/seed";
import {
  getAllUsers,
  upsertUser,
  clearUsers,
  clearQueue,
  getUser
} from "../data/db";
import { processQueue, queueUpsert, startQueueProcessor } from "../data/sync";
import type { User } from "../data/types";

export function useUserData() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const existing = await getAllUsers();
      if (existing.length) {
        setUser(existing[0]);
        return;
      }

      const saved = await upsertUser({ ...sampleUser, updatedAt: Date.now() });
      setUser(saved);
    } catch {
      setError("Unable to load profile data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const stop = startQueueProcessor();
    return () => stop();
  }, [load]);

  const save = useCallback(async (updates: Partial<User>) => {
    const existing = updates.id ? await getUser(updates.id) : user;
    if (!existing) return;
    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };
    const saved = await upsertUser(updated);
    setUser(saved);
    if (!navigator.onLine) {
      await queueUpsert(saved);
    } else {
      await processQueue();
    }
  }, [user]);

  const reset = useCallback(async () => {
    await clearUsers();
    await clearQueue();
    setUser(null);
  }, []);

  const seed = useCallback(async () => {
    const saved = await upsertUser({ ...sampleUser, updatedAt: Date.now() });
    setUser(saved);
  }, []);

  return { user, loading, error, load, save, reset, seed };
}
