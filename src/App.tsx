import { useCallback, useState } from "react";
import { Layout } from "./app/Layout";
import { useHashRoute } from "./app/useHashRoute";
import { BenchmarksPage } from "./pages/BenchmarksPage";
import { ComparePage } from "./pages/ComparePage";
import { DashboardPage } from "./pages/DashboardPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { GoldenAnswersPage } from "./pages/GoldenAnswersPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { ProvidersPage } from "./pages/ProvidersPage";
import { SettingsPage } from "./pages/SettingsPage";

// Every declared route maps to a real page; unknown hashes fall back to the
// dashboard inside useHashRoute (no placeholder fallback exists anymore).
export default function App() {
  const route = useHashRoute();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);

  return (
    <Layout route={route} navOpen={navOpen} onToggleNav={toggleNav} onNavigate={closeNav}>
      {route === "dashboard" ? <DashboardPage /> : null}
      {route === "documents" ? <DocumentsPage /> : null}
      {route === "profiles" ? <ProfilesPage /> : null}
      {route === "golden" ? <GoldenAnswersPage /> : null}
      {route === "providers" ? <ProvidersPage /> : null}
      {route === "benchmarks" ? <BenchmarksPage /> : null}
      {route === "compare" ? <ComparePage /> : null}
      {route === "settings" ? <SettingsPage /> : null}
    </Layout>
  );
}
