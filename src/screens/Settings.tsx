import { useRef, useState } from "react";
import { exportData, importData, clearQueue, clearUsers } from "../data/db";
import type { User } from "../data/types";
import { useTheme } from "../hooks/useTheme";

function isValidUser(user: User) {
  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.title === "string" &&
    typeof user.email === "string" &&
    typeof user.phone === "string" &&
    typeof user.notes === "string" &&
    typeof user.updatedAt === "number"
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string | null>(null);

  const getExportFilename = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `myid-export-${timestamp}.json`;
  };

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getExportFilename();
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Exported JSON file.");
    setError(null);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as { users?: User[] };
      if (!data.users || !Array.isArray(data.users)) {
        throw new Error("Missing users array.");
      }
      if (!data.users.every(isValidUser)) {
        throw new Error("Invalid user data.");
      }
      await importData({ users: data.users });
      setMessage("Import completed.");
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Import failed.");
      setMessage(null);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleReset = async () => {
    await clearUsers();
    await clearQueue();
    setMessage("Local data cleared.");
    setError(null);
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setNotifications("Notifications are not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifications(
      permission === "granted"
        ? "Notifications enabled. iOS only shows notifications for installed PWAs."
        : "Notifications denied."
    );
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-slate-300">
          Manage theme and local data.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-100">Theme</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          {(["system", "light", "dark"] as const).map((option) => (
            <button
              key={option}
              className={`rounded-xl border px-3 py-2 ${
                theme === option
                  ? "border-sky-400 bg-sky-400/10 text-sky-200"
                  : "border-slate-700 text-slate-300"
              }`}
              onClick={() => setTheme(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">Data</p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            className="rounded-xl border border-slate-700 px-3 py-2 text-left text-sm text-slate-200"
            onClick={handleExport}
          >
            Export as JSON
          </button>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
              aria-label="Import JSON data"
            />
            <button
              className="w-full rounded-xl border border-slate-700 px-3 py-2 text-left text-sm text-slate-200"
              onClick={() => fileInputRef.current?.click()}
            >
              Import JSON data
            </button>
          </div>
          <button
            className="rounded-xl border border-rose-500/50 px-3 py-2 text-left text-sm text-rose-200"
            onClick={handleReset}
          >
            Reset local data
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">Notifications (optional)</p>
        <p className="mt-1 text-xs text-slate-400">
          iOS requires the app to be installed before prompts show.
        </p>
        <button
          className="mt-3 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200"
          onClick={requestNotifications}
        >
          Request permission
        </button>
        {notifications ? (
          <p className="mt-2 text-xs text-slate-400">{notifications}</p>
        ) : null}
      </div>

      {(message || error) && (
        <div
          className={`rounded-2xl border p-3 text-xs ${
            error
              ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
          }`}
          role="status"
        >
          {error || message}
        </div>
      )}
    </section>
  );
}
