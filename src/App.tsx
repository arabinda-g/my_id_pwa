import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import FrontPage from "./screens/FrontPage";
import Home from "./screens/Home";
import NotFound from "./screens/NotFound";
import QRScanner from "./screens/QRScanner";
import { getBoolean, setBoolean, storageKeys } from "./utils/storage";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenGetStarted, setHasSeenGetStarted] = useState(false);

  useEffect(() => {
    setHasSeenGetStarted(getBoolean(storageKeys.hasSeenGetStarted, false));
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3EFEF]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-700 border-t-transparent" />
      </div>
    );
  }

  if (!hasSeenGetStarted) {
    return (
      <FrontPage
        onGetStarted={() => {
          setBoolean(storageKeys.hasSeenGetStarted, true);
          setHasSeenGetStarted(true);
        }}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scan" element={<QRScanner />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
