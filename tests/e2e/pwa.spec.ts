import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

test("PWA shell and saved PDF preview work offline without caching evidence or provider traffic", async ({ page, context }) => {
  await page.goto("/#/new-benchmark");
  await expect(page.locator(".pdf-page canvas").first()).toBeVisible({ timeout: 15000 });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.locator(".pdf-page canvas").first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  // WebKit's automation Page.reload path can fail with a CacheStorage-backed service worker offline.
  await Promise.all([
    page.waitForLoadState("load"),
    page.evaluate(() => location.reload()),
  ]);
  await expect(page.getByRole("heading", { name: "New Benchmark", exact: true })).toBeVisible();
  await expect(page.locator(".pdf-page canvas").first()).toBeVisible();
  const urls = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (key) => (await (await caches.open(key)).keys()).map((r) => r.url)))).flat());
  expect(urls.some((url) => /pdf\.worker.*\.mjs/.test(url))).toBe(true);
  expect(urls.some((url) => /\.pdf(?:\?|$)|googleapis|api\.openai|apikey/.test(url))).toBe(false);
});

test("PWA update waits for explicit acceptance and preserves stored data", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "One writer changes the local generated service worker for the update probe.");
  const workerPath = "dist/sw.js";
  const original = await readFile(workerPath, "utf8");
  try {
    await page.goto("/#/new-benchmark");
    await expect(page.locator(".pdf-page canvas").first()).toBeVisible();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await writeFile(workerPath, original + "\n// Synthetic update lifecycle probe\n");
    await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
    await expect(page.getByRole("button", { name: "Update & reload", exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("status").filter({ hasText: "A new app build is available." })).toContainText("Current app version: v0.1.0");
    await expect(page.getByRole("button", { name: "Update & reload", exact: true })).toContainText("(v0.1.0)");
    await page.getByRole("button", { name: "Update & reload", exact: true }).click();
    await expect(page.getByRole("heading", { name: "New Benchmark", exact: true })).toBeVisible();
    await expect(page.locator(".pdf-page canvas").first()).toBeVisible();
  } finally { await writeFile(workerPath, original); }
});
