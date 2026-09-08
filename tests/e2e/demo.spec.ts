import { expect, test, type Page } from "@playwright/test";

async function configure(page: Page, provider: "OpenAI" | "Gemini") {
  await page.goto("/#/settings");
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: provider, exact: true }) });
  await card.getByLabel("API key", { exact: true }).fill("synthetic-e2e-credential");
  await card.getByRole("button", { name: "Save config", exact: true }).click();
  await expect(card.getByText(/Saved\. The API key/)).toBeVisible();
}
async function review(page: Page, provider: "OpenAI" | "Gemini", repeated = false) {
  await page.goto("/#/new-benchmark");
  await expect(page.getByRole("button", { name: /Continue/ })).toBeEnabled();
  const nexabyte = await page.getByText("nexabyte-purchase-order.pdf", { exact: true }).count() > 0;
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: nexabyte ? /Nexabyte/ : /Popular/ }).check();
  await expect(page.getByRole("button", { name: /Continue/ })).toBeEnabled();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: /Expected result v1/ }).check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: new RegExp(provider) }).check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: repeated ? /Benchmark — repeat/ : /Quick Test — run once/ }).check();
  await page.getByRole("radio", { name: provider === "Gemini" ? /Send original PDF/ : /Render pages as images/ }).check();
  await page.getByRole("button", { name: /Continue/ }).click();
}
for (const provider of ["Gemini", "OpenAI"] as const) {
  test(`wizard ${provider} retains real PDF request and redacted malformed evidence`, async ({ page }) => {
    let inputs = 0;
    await page.route(provider === "Gemini" ? "https://generativelanguage.googleapis.com/**" : "https://api.openai.com/**", async (route) => {
      const body = route.request().postDataJSON();
      inputs = provider === "Gemini" ? body.contents[0].parts.filter((p: { inlineData?: unknown }) => p.inlineData).length : body.messages[0].content.filter((p: { type: string }) => p.type === "image_url").length;
      await route.fulfill({ json: provider === "Gemini" ? { candidates: [{ content: { parts: [{ text: "malformed synthetic-e2e-credential" }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 } } : { choices: [{ message: { content: "malformed synthetic-e2e-credential" } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } } });
    });
    await configure(page, provider);
    await review(page, provider);
    await page.getByRole("button", { name: "Run Quick Test", exact: true }).click();
    await expect(page.getByText("Quick Test finished with issues", { exact: true })).toBeVisible();
    expect(inputs).toBeGreaterThan(0);
    await page.goto("/#/runs");
    await page.getByRole("button", { name: /Inspect results/ }).first().click();
    await expect(page.getByRole("table", { name: "Strict and normalized metrics" })).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON", exact: true }).click();
    const stream = await (await download).createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const output = Buffer.concat(chunks).toString();
    expect(output).not.toContain("synthetic-e2e-credential");
    const bundle = JSON.parse(output);
    expect(bundle.runs[0].state).toBe("parse_error");
    expect(bundle.runs[0].usage.inputTokens).toBe(10);
    expect(bundle.runs[0].attempts).toHaveLength(1);
    expect(bundle.suite.snapshot.inputBase64.length).toBeGreaterThan(0);
    await page.reload();
    await expect(page.getByRole("button", { name: /Inspect results/ }).first()).toBeVisible();
  });
}

test("wizard rejects a hard budget with no safe bound without sending a request", async ({ page }) => {
  let calls = 0;
  await page.route("https://generativelanguage.googleapis.com/**", async (route) => { calls += 1; await route.fulfill({ json: {} }); });
  await configure(page, "Gemini");
  await review(page, "Gemini", true);
  await page.getByLabel("Hard budget cap USD (optional)").fill("0");
  await page.getByRole("button", { name: "Start benchmark", exact: true }).click();
  await expect(page.getByText(/no safe bound is configured/)).toBeVisible();
  expect(calls).toBe(0);
});

test("wizard Stop prevents a retry after an in-flight failure", async ({ page }) => {
  let calls = 0;
  await page.route("https://generativelanguage.googleapis.com/**", async (route) => {
    calls += 1;
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await route.fulfill({ status: 429, json: { error: { message: "Synthetic retryable failure" } } });
  });
  await configure(page, "Gemini");
  await review(page, "Gemini", true);
  await page.getByRole("button", { name: "Start benchmark", exact: true }).click();
  await expect(page.getByText(/Stopped manually by the user/)).toBeVisible();
  expect(calls).toBe(1);
});

test("100-run wizard stress preserves results through backup restore and reload", async ({ page }) => {
  test.setTimeout(120000);
  let calls = 0;
  await page.route("https://generativelanguage.googleapis.com/**", async (route) => {
    calls += 1;
    await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: '{"number":"001"}' }] } }], usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 3, totalTokenCount: 15 } } });
  });
  await configure(page, "Gemini");
  await review(page, "Gemini", true);
  await page.getByRole("radio", { name: "100", exact: true }).check();
  await page.getByLabel("Concurrency", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Start benchmark", exact: true }).click();
  await expect(page.getByRole("region", { name: "Benchmark summary" }).getByText("completed", { exact: true })).toBeVisible({ timeout: 30000 });
  expect(calls).toBe(100);
  await page.goto("/#/settings");
  await page.getByRole("tab", { name: "Backup & Restore", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export project backup (JSON)", exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  expect(backup.toString()).not.toContain("synthetic-e2e-credential");
  expect(JSON.parse(backup.toString()).entities.benchmarkRuns).toHaveLength(100);
  await page.locator("#backup-import").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: backup });
  await expect(page.getByText(/records\. Reload the app/)).toBeVisible({ timeout: 30000 });
  await page.reload();
  await page.getByRole("link", { name: "Runs & Results", exact: true }).click();
  await page.getByRole("button", { name: /Inspect results/ }).first().click();
  await expect(page.getByText(/100\/100 runs/)).toBeVisible();
});

test("reload recovers an interrupted suite without replaying provider requests", async ({ page }) => {
  let calls = 0;
  let requestStarted!: () => void;
  const dispatched = new Promise<void>((resolve) => { requestStarted = resolve; });
  await page.route("https://generativelanguage.googleapis.com/**", () => { calls += 1; requestStarted(); });
  await configure(page, "Gemini");
  await review(page, "Gemini", true);
  await page.getByRole("button", { name: "Start benchmark", exact: true }).click();
  await dispatched;
  await page.reload();
  await page.getByRole("link", { name: "Runs & Results", exact: true }).click();
  await page.getByRole("button", { name: /Inspect results/ }).first().click();
  await expect(page.getByRole("region", { name: "Benchmark detail" }).getByText("failed", { exact: true })).toBeVisible();
  expect(calls).toBe(1);
});
