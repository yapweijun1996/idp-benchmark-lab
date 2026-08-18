import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider, useI18n } from "./i18n";

function Harness() {
  const { language, setLanguage, t } = useI18n();

  return (
    <>
      <span data-testid="language">{language}</span>
      <span data-testid="home-label">{t("route.home")}</span>
      <button type="button" onClick={() => setLanguage("zh")}>Mandarin</button>
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
  });
});
