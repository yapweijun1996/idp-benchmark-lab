import type { ReactNode } from "react";
import { ROUTES, type RouteId } from "./routes";
import { LANGUAGES, type I18nKey, useI18n } from "../i18n";

interface LayoutProps {
  route: RouteId;
  navOpen: boolean;
  onToggleNav: () => void;
  onNavigate: () => void;
  children: ReactNode;
}

const NAV_GROUPS: readonly { label: I18nKey; routes: readonly RouteId[] }[] = [
  { label: "nav.workspace", routes: ["home", "new-benchmark"] },
  { label: "nav.analyze", routes: ["runs", "compare"] },
  { label: "nav.manage", routes: ["library", "settings"] },
];

function routeLabelKey(route: RouteId): I18nKey {
  return `route.${route}` as I18nKey;
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
    </svg>
  );
}

export function Layout({ route, navOpen, onToggleNav, onNavigate, children }: LayoutProps) {
  const currentRoute = ROUTES.find((item) => item.id === route);
  const { language, setLanguage, t } = useI18n();

  return (
    <div className={navOpen ? "app-shell" : "app-shell app-shell--sidebar-hidden"}>
      <aside id="app-sidebar" className="sidebar">
        <nav aria-label={t("nav.mainNavigation")}>
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group__label">{t(group.label)}</p>
              <ul className="nav-list">
                {ROUTES.filter((r) => group.routes.includes(r.id)).map((r) => (
                  <li key={r.id}>
                    <a
                      href={r.path}
                      className={r.id === route ? "nav-link nav-link--active" : "nav-link"}
                      aria-current={r.id === route ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      {t(routeLabelKey(r.id))}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="sidebar__footer">
          <span className="status-dot" aria-hidden="true" />
          <span>
            <strong>{t("status.workspace")}</strong>
            <small>{t("status.browserData")}</small>
          </span>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <button
            type="button"
            className="topbar__toggle"
            aria-expanded={navOpen}
            aria-controls="app-sidebar"
            aria-label={navOpen ? t("nav.hideSidebar") : t("nav.showSidebar")}
            title={navOpen ? t("nav.hideSidebar") : t("nav.showSidebar")}
            onClick={onToggleNav}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div className="topbar__brand brand">
            <span className="brand__mark" aria-hidden="true">
              IDP
            </span>
            <span className="brand__copy">
              <span className="brand__name">Benchmark Lab</span>
              <span className="brand__sub">{t("brand.subtitle")}</span>
            </span>
          </div>
          <div className="topbar__right">
            <label className="topbar__language" htmlFor="topbar-language">
              <span className="topbar__language-icon"><GlobeIcon /></span>
              <span className="visually-hidden">{t("language.label")}</span>
              <select
                id="topbar-language"
                value={language}
                aria-label={t("language.label")}
                onChange={(event) => setLanguage(event.target.value as typeof language)}
              >
                {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
            </label>
            <span className="topbar__status">
              <span className="status-dot" aria-hidden="true" />
              {t("status.localFirst")}
            </span>
          </div>
        </header>
        <main id="main">
          <div className="page-context" aria-label={t("page.currentLocation")}>
            <span>{t("nav.workspace")}</span>
            <span className="page-context__separator" aria-hidden="true">
              /
            </span>
            <strong>{t(routeLabelKey(currentRoute?.id ?? "home"))}</strong>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
