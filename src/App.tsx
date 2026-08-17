import { useCallback, useState } from "react";
import { Layout } from "./app/Layout";
import { useHashRoute } from "./app/useHashRoute";
import { NewBenchmarkWizard } from "./pages/NewBenchmarkWizard";
import { ComparePage } from "./pages/ComparePage";
import { DashboardPage } from "./pages/DashboardPage";
import { LibraryPage } from "./pages/LibraryPage";
import { RunsResultsPage } from "./pages/RunsResultsPage";
import { SettingsHubPage } from "./pages/SettingsHubPage";

// Every declared route maps to a real page; unknown hashes fall back to
// home inside useHashRoute (no placeholder fallback exists anymore).
export default function App() {
  const route = useHashRoute();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);

  return (
    <Layout route={route} navOpen={navOpen} onToggleNav={toggleNav} onNavigate={closeNav}>
      {route === "home" ? <DashboardPage /> : null}
      {route === "new-benchmark" ? <NewBenchmarkWizard /> : null}
      {route === "runs" ? <RunsResultsPage /> : null}
      {route === "compare" ? <ComparePage /> : null}
      {route === "library" ? <LibraryPage /> : null}
      {route === "settings" ? <SettingsHubPage /> : null}
    </Layout>
  );
}
