import { useEffect, useState } from "react";
import { PricingService } from "../cost/pricingService";
import { getRuntimeHeaders } from "../providers/keys";
import type { PricingSnapshot, ProviderConfig } from "../storage/types";
import { useI18n } from "../i18n";

const PRICE_FIELDS: readonly { key: "inputPerMillion" | "cachedInputPerMillion" | "outputPerMillion" | "flatPerRequest" | "maximumAttemptCostUsd"; label: string }[] = [
  { key: "inputPerMillion", label: "Input tokens per million" },
  { key: "cachedInputPerMillion", label: "Cached input tokens per million" },
  { key: "outputPerMillion", label: "Output tokens per million" },
  { key: "flatPerRequest", label: "Flat cost per request" },
  { key: "maximumAttemptCostUsd", label: "Maximum cost per attempt (USD)" },
];

export function PricingEditor({ config, onSave }: { config: ProviderConfig; onSave: (config: ProviderConfig) => Promise<ProviderConfig> }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Partial<PricingSnapshot>>({});
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    if (config.pricingSnapshotId) void new PricingService().get(config.pricingSnapshotId).then((price) => { if (active) setDraft(price ?? {}); });
    return () => { active = false; };
  }, [config.pricingSnapshotId]);
  const save = async () => {
    try {
      const snapshot: PricingSnapshot = { ...draft, id: crypto.randomUUID(), provider: config.kind, model: config.model, currency: "USD", effectiveAt: new Date().toISOString() };
      await new PricingService().save(snapshot);
      await onSave({ ...config, settings: { ...config.settings, customHeaders: getRuntimeHeaders(config.id) }, pricingSnapshotId: snapshot.id });
      setMessage(t("Pricing saved for future suites. Existing suites keep their frozen pricing."));
    } catch { setMessage(t("Could not save pricing. Check rates and the maximum-cost source.")); }
  };
  return <details><summary>{t("Pricing and hard budget basis")}</summary>
    <p>{t("Enter verified USD rates for this exact model and tier. A hard budget requires a provider-contract maximum per attempt covering all billable input, output and reasoning. An observed average is not a bound.")}</p>
    {PRICE_FIELDS.map(({ key, label }) => <label key={key}>{t(label)}<input type="number" min="0" step="any" value={draft[key] ?? ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>)}
    <label>{t("Rate source and tier")}<input value={draft.sourceNote ?? ""} onChange={(e) => setDraft({ ...draft, sourceNote: e.target.value })} /></label>
    <label>{t("Maximum cost contract source")}<input value={draft.maximumAttemptCostSource ?? ""} onChange={(e) => setDraft({ ...draft, maximumAttemptCostSource: e.target.value })} /></label>
    <button type="button" className="btn" onClick={() => void save()}>{t("Save pricing snapshot")}</button>
    {message ? <p role="status">{message}</p> : null}
  </details>;
}
