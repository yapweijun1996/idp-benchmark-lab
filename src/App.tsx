import { useCallback, useState } from "react";
import { Layout } from "./app/Layout";
import { useHashRoute } from "./app/useHashRoute";
import { BenchmarksPage } from "./pages/BenchmarksPage";
import { ComparePage } from "./pages/ComparePage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { GoldenAnswersPage } from "./pages/GoldenAnswersPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProvidersPage } from "./pages/ProvidersPage";

export default function App() {
  const route = useHashRoute();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);

  return (
    <Layout route={route} navOpen={navOpen} onToggleNav={toggleNav} onNavigate={closeNav}>
      {route === "documents" ? <DocumentsPage /> : null}
      {route === "profiles" ? <ProfilesPage /> : null}
      {route === "golden" ? <GoldenAnswersPage /> : null}
      {route === "providers" ? <ProvidersPage /> : null}
      {route === "benchmarks" ? <BenchmarksPage /> : null}
      {route === "compare" ? <ComparePage /> : null}
      {route === "settings" ? <SettingsPage /> : null}
      {route !== "documents" && route !== "profiles" && route !== "golden" && route !== "providers" && route !== "benchmarks" && route !== "compare" && route !== "settings" ? (
        <PlaceholderPage routeId={route} />
      ) : null}
    </Layout>
  );
}
