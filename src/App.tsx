import React, { Suspense, lazy } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { InstallPrompt } from "./components/InstallPrompt";
import { OfflineBanner } from "./components/OfflineBanner";

const Home = lazy(() => import("./screens/Home"));
const Card = lazy(() => import("./screens/Card"));
const Settings = lazy(() => import("./screens/Settings"));
const Privacy = lazy(() => import("./screens/Privacy"));
const NotFound = lazy(() => import("./screens/NotFound"));

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center gap-1 text-xs ${
    isActive ? "text-sky-300" : "text-slate-400"
  }`;

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Info Card PWA
            </p>
            <h1 className="text-lg font-semibold">Your profile snapshot</h1>
          </div>
          <InstallPrompt />
        </div>
      </header>

      <OfflineBanner />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-6 w-40 animate-pulse rounded bg-slate-800" />
              <div className="h-32 animate-pulse rounded-2xl bg-slate-800" />
              <div className="h-32 animate-pulse rounded-2xl bg-slate-800" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/card" element={<Card />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <NavLink to="/" className={navLinkClass} end>
            <span className="text-base">🏠</span>
            Home
          </NavLink>
          <NavLink to="/card" className={navLinkClass}>
            <span className="text-base">💳</span>
            Card
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            <span className="text-base">⚙️</span>
            Settings
          </NavLink>
          <NavLink to="/privacy" className={navLinkClass}>
            <span className="text-base">🔒</span>
            Privacy
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
