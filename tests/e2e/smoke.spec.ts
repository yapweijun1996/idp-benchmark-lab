import { expect, test } from "@playwright/test";

/**
 * Browser smoke (TASK-052 / TESTING.md): the built app loads, the shell
 * renders, hash routing works, and the core pages respond.
 */
test("shell loads with navigation and dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/idp benchmark lab/i);
  await expect(page.getByRole("navigation", { name: /main navigation/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
});

test("hash routing reaches the Documents page", async ({ page }) => {
  await page.goto("/#/documents");
  await expect(page.getByRole("heading", { name: /documents/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /upload pdf/i })).toBeVisible();
});

test("Profiles and Providers pages render", async ({ page }) => {
  await page.goto("/#/profiles");
  await expect(page.getByRole("heading", { name: /extraction profiles/i })).toBeVisible();
  await page.goto("/#/providers");
  await expect(page.getByRole("heading", { name: /^openai$/i })).toBeVisible();
  await expect(page.getByText(/limited\/test key/i)).toBeVisible();
});

test("unknown hash falls back to the dashboard", async ({ page }) => {
  await page.goto("/#/does-not-exist");
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
});
