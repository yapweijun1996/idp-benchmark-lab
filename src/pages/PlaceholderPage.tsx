import { ROUTES, type RouteId } from "../app/routes";

const DESCRIPTIONS: Record<RouteId, string> = {
  dashboard:
    "Shows the last benchmark, active document/profile/model, exact pass rate, field accuracy, consistency, spend, latency, and recent suites.",
  documents:
    "Upload and preview local PDFs, choose the active document and input mode (Native PDF or Canonical Rendered Images).",
  profiles:
    "Create and version modular extraction profiles: base prompt, extraction contract, JSON schema, and normalization policy.",
  golden: "Edit the expected JSON, validate it against the active schema, and approve each version.",
  providers: "Configure BYOK OpenAI, Gemini, or Custom OpenAI-compatible providers and test connectivity.",
  benchmarks: "Build and run 5/10/20/50/100-run benchmarks with Stop and a hard budget cap.",
  compare: "Compare providers, models, prompts, schemas, and input modes side by side.",
  settings: "App settings, pricing snapshots, export, backup, and import.",
};

export function PlaceholderPage({ routeId }: { routeId: RouteId }) {
  const route = ROUTES.find((r) => r.id === routeId);
  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title">{route?.label ?? routeId}</h1>
      <p>{DESCRIPTIONS[routeId]}</p>
      <p>
        <span className="chip chip--todo">TODO</span> Not implemented yet.
      </p>
    </section>
  );
}
