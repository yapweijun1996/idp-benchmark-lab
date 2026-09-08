import { useEffect, useState } from "react";
import { PricingService } from "../cost/pricingService";
import { getRuntimeHeaders } from "../providers/keys";
import type { PricingSnapshot, ProviderConfig } from "../storage/types";

export function PricingEditor({ config, onSave }: { config: ProviderConfig; onSave: (config: ProviderConfig) => Promise<ProviderConfig> }) {
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
      setMessage("Pricing saved for future suites. Existing suites keep their frozen pricing.");
    } catch { setMessage("Could not save pricing. Check rates and the maximum-cost source."); }
  };
  return <details><summary>Pricing and hard budget basis</summary>
    <p>Enter verified USD rates for this exact model and tier. A hard budget requires a provider-contract maximum per attempt covering all billable input, output and reasoning. An observed average is not a bound.</p>
    {(["inputPerMillion", "cachedInputPerMillion", "outputPerMillion", "flatPerRequest", "maximumAttemptCostUsd"] as const).map((key) => <label key={key}>{key}<input type="number" min="0" step="any" value={draft[key] ?? ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>)}
    <label>Rate source and tier<input value={draft.sourceNote ?? ""} onChange={(e) => setDraft({ ...draft, sourceNote: e.target.value })} /></label>
    <label>Maximum cost contract source<input value={draft.maximumAttemptCostSource ?? ""} onChange={(e) => setDraft({ ...draft, maximumAttemptCostSource: e.target.value })} /></label>
    <button type="button" className="btn" onClick={() => void save()}>Save pricing snapshot</button>
    {message ? <p role="status">{message}</p> : null}
  </details>;
}
