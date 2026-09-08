import { expect, test } from "@playwright/test";

const locales = [
  { code: "en", heading: "New Benchmark" },
  { code: "zh", heading: "新建基准测试" },
  { code: "ms", heading: "Penanda Aras Baharu" },
  { code: "ja", heading: "新しいベンチマーク" },
  { code: "vi", heading: "Benchmark mới" },
] as const;

test("active wizard shell switches across all supported locales without source keys", async ({ page }) => {
  await page.goto("/#/new-benchmark");
  const language = page.locator("#topbar-language");

  for (const locale of locales) {
    await language.selectOption(locale.code);
    await expect(language).toHaveValue(locale.code);
    await expect(page.getByRole("heading", { name: locale.heading, exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/(?:nav|route|status|page)\.[A-Za-z]/);
  }
});
