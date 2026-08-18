import { Tabs } from "../app/Tabs";
import { DocumentsPage } from "./DocumentsPage";
import { ProfilesPage } from "./ProfilesPage";
import { GoldenAnswersPage } from "./GoldenAnswersPage";
import { useI18n } from "../i18n";

/**
 * Reusable resources kept out of the guided benchmark workflow: documents,
 * extraction templates, and expected results. See DESIGN.md — normal users
 * shouldn't need to visit here to run a benchmark, only to manage assets.
 */
export function LibraryPage() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="library-title">
      <h1 id="library-title">{t("Library")}</h1>
      <p>{t("Reusable documents, extraction templates, and expected results. Manage them here; pick from them when setting up a benchmark.")}</p>

      <Tabs
        ariaLabel={t("Library sections")}
        idPrefix="library"
        tabs={[
          { id: "documents", label: t("Documents"), panel: <DocumentsPage /> },
          { id: "templates", label: t("Extraction Templates"), panel: <ProfilesPage /> },
          { id: "expected-results", label: t("Expected Results"), panel: <GoldenAnswersPage /> },
        ]}
      />
    </section>
  );
}
