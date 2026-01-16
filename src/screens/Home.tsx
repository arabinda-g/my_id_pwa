import { Link } from "react-router-dom";
import { SkeletonCard } from "../components/SkeletonCard";
import { UserCard } from "../components/UserCard";
import { useUserData } from "../hooks/useUserData";

export default function Home() {
  const { user, loading, error, load, seed } = useUserData();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Home</h2>
        <p className="text-sm text-slate-300">
          Your card is available offline and ready to share.
        </p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p>{error}</p>
          <button
            className="mt-3 rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-900"
            onClick={() => load()}
          >
            Retry loading
          </button>
        </div>
      ) : user ? (
        <UserCard user={user} />
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
          <p>No profile stored yet.</p>
          <button
            className="mt-3 rounded-full bg-sky-400 px-3 py-1 text-xs font-semibold text-slate-950"
            onClick={() => seed()}
          >
            Create sample profile
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">Quick actions</p>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200"
            to="/card"
          >
            Update card details
          </Link>
          <Link
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200"
            to="/settings"
          >
            Manage settings and data
          </Link>
        </div>
      </div>
    </section>
  );
}
