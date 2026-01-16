import type { User } from "../data/types";

export function UserCard({ user }: { user: User }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Primary profile
          </p>
          <h2 className="text-xl font-semibold text-slate-100">{user.name}</h2>
          <p className="text-sm text-slate-300">{user.title}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-400 text-lg font-semibold text-slate-900">
          {user.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-200">
        <p>
          <span className="text-slate-400">Email:</span> {user.email}
        </p>
        <p>
          <span className="text-slate-400">Phone:</span> {user.phone}
        </p>
        <p>
          <span className="text-slate-400">Notes:</span> {user.notes || "—"}
        </p>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Updated {new Date(user.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}
