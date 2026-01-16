export default function Privacy() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
      <h2 className="text-xl font-semibold text-slate-100">Privacy</h2>
      <p>
        This app stores your profile data only on your device using IndexedDB.
        No tracking, analytics, or third-party services are enabled by default.
      </p>
      <p>
        If you connect a backend later, route secrets through a secure server
        proxy and avoid embedding API keys in the client.
      </p>
    </section>
  );
}
