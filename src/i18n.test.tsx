import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider, useI18n } from "./i18n";

function Harness() {
  const { language, setLanguage, t } = useI18n();

  return (
    <>
      <span data-testid="language">{language}</span>
      <span data-testid="home-label">{t("route.home")}</span>
      <span data-testid="fallback">{t("Untranslated acceptance probe")}</span>
      <button type="button" onClick={() => setLanguage("zh")}>Mandarin</button>
      {(["ms", "ja", "vi"] as const).map((language) => <button key={language} onClick={() => setLanguage(language)}>{language}</button>)}
    </>
  );
}

describe("i18n", () => {
  it("defaults to English and switches translated shell copy", async () => {
    render(
      <I18nProvider>
        <Harness />
      </I18nProvider>,
    );

    expect(screen.getByTestId("language")).toHaveTextContent("en");
    expect(screen.getByTestId("home-label")).toHaveTextContent("Home");

    fireEvent.click(screen.getByRole("button", { name: "Mandarin" }));

    await waitFor(() => {
      expect(screen.getByTestId("language")).toHaveTextContent("zh");
      expect(screen.getByTestId("home-label")).toHaveTextContent("首页");
    });
    expect(screen.getByTestId("fallback")).toHaveTextContent("Untranslated acceptance probe");
    for (const language of ["ms", "ja", "vi"]) {
      fireEvent.click(screen.getByRole("button", { name: language }));
      await waitFor(() => expect(screen.getByTestId("language")).toHaveTextContent(language));
      expect(screen.getByTestId("fallback")).toHaveTextContent("Untranslated acceptance probe");
      expect(screen.getByTestId("home-label")).not.toHaveTextContent("route.home");
    }
  });
});
