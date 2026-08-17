import { expect, test } from "@playwright/test";

/**
 * Browser smoke (TASK-052 / TESTING.md): the built app loads, the shell
 * renders, hash routing works, and the core pages respond.
 */
test("shell loads with navigation and the Home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/idp benchmark lab/i);
  await expect(page.getByRole("navigation", { name: /main navigation/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^home$/i })).toBeVisible();
});

test("hash routing reaches the Documents tab in Library", async ({ page }) => {
  await page.goto("/#/documents");
  await expect(page.getByRole("heading", { name: /^documents$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /upload pdf/i })).toBeVisible();
});

test("Library and Settings tabs render Extraction Templates and AI Providers", async ({ page }) => {
  await page.goto("/#/library");
  await page.getByRole("tab", { name: /extraction templates/i }).click();
  await expect(page.getByRole("heading", { name: /^extraction templates$/i })).toBeVisible();

  await page.goto("/#/settings");
  await expect(page.getByRole("tab", { name: /ai providers/i })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /^openai$/i })).toBeVisible();
  await expect(page.getByText(/limited\/test key/i)).toBeVisible();
});

test("unknown hash falls back to the Home page", async ({ page }) => {
  await page.goto("/#/does-not-exist");
  await expect(page.getByRole("heading", { name: /^home$/i })).toBeVisible();
});

test("PDF upload renders a preview canvas with lazy page rendering", async ({ page }) => {
  await page.goto("/#/documents");

  const fileInput = page.locator('input[type="file"]#pdf-upload');
  await fileInput.setInputFiles("tests/fixtures/mini.pdf");

  // 文档卡片出现（含大小与 sha256 指纹）
  await expect(page.locator(".doc-card__name", { hasText: "mini.pdf" })).toBeVisible();

  // PDF.js 异步加载 + IntersectionObserver 惰性渲染 → canvas 出现
  const canvas = page.locator(".pdf-page canvas");
  await expect(canvas).toHaveCount(1, { timeout: 15_000 });

  // 页数回写（卡片与预览面板可能各显示一次）
  await expect(page.getByText(/1 page/).first()).toBeVisible();
});
