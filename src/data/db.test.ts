import { describe, expect, it } from "vitest";
import {
  clearUsers,
  exportData,
  getAllUsers,
  importData,
  upsertUser
} from "./db";
import type { User } from "./types";

const baseUser: User = {
  id: "user-1",
  name: "Taylor",
  title: "Engineer",
  email: "taylor@example.com",
  phone: "555-0101",
  notes: "Notes",
  updatedAt: Date.now()
};

describe("data layer", () => {
  it("stores and returns users", async () => {
    await clearUsers();
    await upsertUser(baseUser);
    const users = await getAllUsers();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Taylor");
  });

  it("uses last-write-wins on updates", async () => {
    await clearUsers();
    const older = { ...baseUser, updatedAt: 10, name: "Old" };
    const newer = { ...baseUser, updatedAt: 20, name: "New" };
    await upsertUser(newer);
    await upsertUser(older);
    const users = await getAllUsers();
    expect(users[0].name).toBe("New");
  });

  it("exports and imports data", async () => {
    await clearUsers();
    await upsertUser({ ...baseUser, id: "user-2" });
    const exported = await exportData();
    await clearUsers();
    await importData({ users: exported.users });
    const users = await getAllUsers();
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe("user-2");
  });
});
