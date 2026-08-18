import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useI18n } from "../i18n";

/**
 * Notifies the user when a new build is available and lets them choose
 * when to update/reload (PWA.md). Never reloads automatically, so an
 * active benchmark is not destroyed without warning.
 */
export function UpdatePrompt() {
  const { t } = useI18n();
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const [dismissed, setDismissed] = useState(false);

  if (!needRefresh[0] || dismissed) {
    return null;
  }

  return (
    <div role="status" className="update-prompt">
      <span>{t("A new app build is available.")}</span>
      <button
        type="button"
        onClick={() => {
          void updateServiceWorker(true);
          setDismissed(true);
        }}
      >
        {t("Update & reload")}
      </button>
      <button type="button" onClick={() => setDismissed(true)}>
        {t("Dismiss")}
      </button>
    </div>
  );
}
