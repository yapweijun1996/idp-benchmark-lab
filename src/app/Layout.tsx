import type { ReactNode } from "react";
import { ROUTES, type RouteId } from "./routes";

interface LayoutProps {
  route: RouteId;
  navOpen: boolean;
  onToggleNav: () => void;
  onNavigate: () => void;
  children: ReactNode;
}

export function Layout({ route, navOpen, onToggleNav, onNavigate, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside id="app-sidebar" className={navOpen ? "sidebar sidebar--open" : "sidebar"}>
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            IDP
          </span>
          <span className="brand__name">Benchmark Lab</span>
        </div>
        <nav aria-label="Main navigation">
          <ul className="nav-list">
            {ROUTES.map((r) => (
              <li key={r.id}>
                <a
                  href={r.path}
                  className={r.id === route ? "nav-link nav-link--active" : "nav-link"}
                  aria-current={r.id === route ? "page" : undefined}
                  onClick={onNavigate}
                >
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="content">
        <header className="topbar">
          <button
            type="button"
            className="topbar__toggle"
            aria-expanded={navOpen}
            aria-controls="app-sidebar"
            onClick={onToggleNav}
          >
            <span aria-hidden="true">☰</span>
            <span className="visually-hidden">Toggle navigation</span>
          </button>
          <span className="topbar__title">IDP Benchmark Lab</span>
        </header>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
