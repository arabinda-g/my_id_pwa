import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
      <h2 className="text-xl font-semibold text-slate-100">Page not found</h2>
      <p className="mt-2">That page does not exist.</p>
      <Link
        to="/"
        className="mt-4 inline-flex rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
      >
        Back to home
      </Link>
    </section>
  );
}
