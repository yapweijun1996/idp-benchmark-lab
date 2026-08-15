import { useCallback, useState } from "react";
import { Layout } from "./app/Layout";
import { useHashRoute } from "./app/useHashRoute";
import { DocumentsPage } from "./pages/DocumentsPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export default function App() {
  const route = useHashRoute();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);

  return (
    <Layout route={route} navOpen={navOpen} onToggleNav={toggleNav} onNavigate={closeNav}>
      {route === "documents" ? <DocumentsPage /> : <PlaceholderPage routeId={route} />}
    </Layout>
  );
}
