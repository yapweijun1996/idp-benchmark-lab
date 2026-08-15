import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Notifies the user when a new build is available and lets them choose
 * when to update/reload (PWA.md). Never reloads automatically, so an
 * active benchmark is not destroyed without warning.
 */
export function UpdatePrompt() {
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const [dismissed, setDismissed] = useState(false);

  if (!needRefresh[0] || dismissed) {
    return null;
  }

  return (
    <div role="status" className="update-prompt">
      <span>A new app build is available.</span>
      <button
        type="button"
        onClick={() => {
          void updateServiceWorker(true);
          setDismissed(true);
        }}
      >
        Update &amp; reload
      </button>
      <button type="button" onClick={() => setDismissed(true)}>
        Dismiss
      </button>
    </div>
  );
}
