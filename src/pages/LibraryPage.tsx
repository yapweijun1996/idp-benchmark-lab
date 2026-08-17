import { Tabs } from "../app/Tabs";
import { DocumentsPage } from "./DocumentsPage";
import { ProfilesPage } from "./ProfilesPage";
import { GoldenAnswersPage } from "./GoldenAnswersPage";

/**
 * Reusable resources kept out of the guided benchmark workflow: documents,
 * extraction templates, and expected results. See DESIGN.md — normal users
 * shouldn't need to visit here to run a benchmark, only to manage assets.
 */
export function LibraryPage() {
  return (
    <section aria-labelledby="library-title">
      <h1 id="library-title">Library</h1>
      <p>Reusable documents, extraction templates, and expected results. Manage them here; pick from them when setting up a benchmark.</p>

      <Tabs
        ariaLabel="Library sections"
        idPrefix="library"
        tabs={[
          { id: "documents", label: "Documents", panel: <DocumentsPage /> },
          { id: "templates", label: "Extraction Templates", panel: <ProfilesPage /> },
          { id: "expected-results", label: "Expected Results", panel: <GoldenAnswersPage /> },
        ]}
      />
    </section>
  );
}
