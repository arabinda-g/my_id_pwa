import type { User } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function fetchRemoteUser() {
  const response = await fetch(`${API_BASE}/user.json`, {
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    throw new Error("Failed to fetch remote user");
  }
  const data = (await response.json()) as Omit<User, "updatedAt">;
  return { ...data, updatedAt: Date.now() } as User;
}
