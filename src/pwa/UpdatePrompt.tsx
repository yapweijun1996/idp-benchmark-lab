import { useCallback, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useI18n } from "../i18n";
import { BUILD_INFO, formatFriendlyVersion } from "./buildInfo";

/**
 * Notifies the user when a new build is available and lets them choose
 * when to update/reload (PWA.md). Never reloads automatically, so an
 * active benchmark is not destroyed without warning.
 */
export function UpdatePrompt() {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const onNeedRefresh = useCallback(() => setDismissed(false), []);
  const { needRefresh, updateServiceWorker } = useRegisterSW({ onNeedRefresh });
  const refreshAvailable = Boolean(needRefresh[0]);
  const friendlyVersion = formatFriendlyVersion(BUILD_INFO.version);

  if (!refreshAvailable || dismissed) {
    return null;
  }

  return (
    <div role="status" aria-live="polite" className="update-prompt">
      <div className="update-prompt__copy">
        <strong>{t("A new app build is available.")}</strong>
        <span>{t("Current app version")}: {friendlyVersion}</span>
        <span>{t("Reload interrupts active benchmarks and clears memory-only credentials. Stop and wait for requests to finish before updating.")}</span>
      </div>
      <div className="update-prompt__actions">
        <button
          type="button"
          title={`${t("Update & reload")} (${friendlyVersion})`}
          onClick={() => {
            void updateServiceWorker(true);
            setDismissed(true);
          }}
        >
          {t("Update & reload")} <span aria-hidden="true">({friendlyVersion})</span>
        </button>
        <button type="button" onClick={() => setDismissed(true)}>
          {t("Dismiss")}
        </button>
      </div>
    </div>
  );
}
