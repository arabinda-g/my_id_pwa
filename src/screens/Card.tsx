import { useEffect, useState } from "react";
import { SkeletonCard } from "../components/SkeletonCard";
import { UserCard } from "../components/UserCard";
import type { User } from "../data/types";
import { useUserData } from "../hooks/useUserData";

export default function Card() {
  const { user, loading, error, save, seed } = useUserData();
  const [draft, setDraft] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDraft(user);
    }
  }, [user]);

  // Cleanup sensitive draft data on unmount
  useEffect(() => {
    return () => {
      setDraft(null);
      setMessage(null);
    };
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    await save(draft);
    setMessage("Saved locally. Syncs when online.");
    setTimeout(() => setMessage(null), 2000);
  };

  if (loading) {
    return <SkeletonCard />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
        <p>{error}</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
        <p>No profile available.</p>
        <button
          className="mt-3 rounded-full bg-sky-400 px-3 py-1 text-xs font-semibold text-slate-950"
          onClick={() => seed()}
        >
          Create sample profile
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Card</h2>
        <p className="text-sm text-slate-300">
          Edit your profile details. Changes persist offline.
        </p>
      </div>

      <UserCard user={draft} />

      <form
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
        onSubmit={handleSave}
      >
        <div>
          <label
            htmlFor="name"
            className="text-xs uppercase tracking-wide text-slate-400"
          >
            Name
          </label>
          <input
            id="name"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
            required
          />
        </div>
        <div>
          <label
            htmlFor="title"
            className="text-xs uppercase tracking-wide text-slate-400"
          >
            Title
          </label>
          <input
            id="title"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="text-xs uppercase tracking-wide text-slate-400"
          >
            Email
          </label>
          <input
            id="email"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={draft.email}
            onChange={(event) =>
              setDraft({ ...draft, email: event.target.value })
            }
            type="email"
            required
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="text-xs uppercase tracking-wide text-slate-400"
          >
            Phone
          </label>
          <input
            id="phone"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={draft.phone}
            onChange={(event) =>
              setDraft({ ...draft, phone: event.target.value })
            }
            required
          />
        </div>
        <div>
          <label
            htmlFor="notes"
            className="text-xs uppercase tracking-wide text-slate-400"
          >
            Notes
          </label>
          <textarea
            id="notes"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={draft.notes}
            onChange={(event) =>
              setDraft({ ...draft, notes: event.target.value })
            }
            rows={3}
          />
        </div>
        <button className="w-full rounded-full bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950">
          Save changes
        </button>
        {message ? (
          <p className="text-xs text-slate-400" role="status">
            {message}
          </p>
        ) : null}
      </form>

      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
        Tip: Use Settings to export or reset your local data.
      </div>
    </section>
  );
}
