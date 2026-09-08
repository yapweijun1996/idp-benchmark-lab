import { expect, test } from "@playwright/test";

const gateway = "https://gpt.yapweijun1996.com";

function fivePagePdf(): Buffer {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Count 5 /Kids [${Array.from({ length: 5 }, (_, i) => `${i + 3} 0 R`).join(" ")}] >>`];
  for (let i = 0; i < 5; i += 1) objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n` + offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

for (const truncated of [false, true]) {
test(`Gateway Demo auto-connects and retains ${truncated ? "output-limit failure" : "completed response"}`, async ({ page }) => {
  let sessionCalls = 0;
  let responseCalls = 0;
  await page.route(`${gateway}/**`, async (route) => {
    const request = route.request();
    if (request.url().endsWith("/demo/session")) {
      sessionCalls += 1;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ token: "dmo_e2e_session" }) });
      return;
    }
    if (request.url().endsWith("/demo/v1/models")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "demo-fast" }] }) });
      return;
    }
    if (request.url().endsWith("/demo/v1/responses")) {
      responseCalls += 1;
      const body = request.postDataJSON() as { stream?: boolean; store?: boolean; input?: unknown };
      expect(body.stream).toBe(true);
      expect(body.store).toBe(false);
      expect(JSON.stringify(body.input)).toContain("input_image");
      if (truncated) {
        await route.fulfill({ status: 200, contentType: "text/event-stream", body: [
          `data: ${JSON.stringify({ type: "response.output_text.delta", delta: '{"rows":["dmo_e2e_session"' })}`,
          `data: ${JSON.stringify({ type: "response.incomplete", response: { status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, usage: { input_tokens: 3555, output_tokens: 800, total_tokens: 4355 } } })}`,
          "",
        ].join("\n\n") });
        return;
      }
      const sse = [
        `data: ${JSON.stringify({ type: "response.output_text.delta", delta: '{"doc_info":{},"row_data":[],"footer":{}}' })}`,
        `data: ${JSON.stringify({ type: "response.completed", response: { usage: { input_tokens: 4, output_tokens: 2, total_tokens: 6 } } })}`,
        "data: [DONE]",
        "",
      ].join("\n\n");
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse });
      return;
    }
    await route.continue();
  });

  await page.goto("/#/new-benchmark");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: /Popular/ }).check();
  await page.getByRole("button", { name: /Continue/ }).click();
  const expected = page.getByRole("radio", { name: /Expected result v1/ });
  if (await expected.count()) await expected.check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: /Gateway Demo/ }).check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: /Quick Test — run once/ }).check();
  await page.getByRole("radio", { name: /Render pages as images/ }).check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Run Quick Test/ }).click();
  if (truncated) {
    await expect(page.getByRole("alert")).toContainText("output-token limit", { timeout: 30_000 });
    await page.goto("/#/runs");
    await page.getByRole("button", { name: /Inspect results/ }).first().click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON", exact: true }).click();
    const stream = await (await download).createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const output = Buffer.concat(chunks).toString();
    expect(output).not.toContain("dmo_e2e_session");
    const bundle = JSON.parse(output);
    expect(bundle.runs[0]).toMatchObject({ state: "provider_error", usage: { outputTokens: 800 }, providerCalls: 1, error: { retryable: false }, safeRawResponse: '{"rows":["[REDACTED]"' });
  } else {
    await expect(page.getByText(/Quick Test (completed|finished with issues)/)).toBeVisible({ timeout: 30_000 });
  }
  expect(sessionCalls).toBe(1);
  expect(responseCalls).toBe(1);
  expect(await page.evaluate(() => Object.values(window.sessionStorage).some((value) => value.includes("dmo_")))).toBe(false);
});
}

test("Gateway Demo maps five rendered pages in two calls and reduces them once", async ({ page }) => {
  const calls: { phase: "map" | "reduce"; imageCount: number }[] = [];
  await page.route(`${gateway}/**`, async (route) => {
    const request = route.request();
    if (request.url().endsWith("/demo/session")) {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ token: "dmo_e2e_five_pages" }) });
      return;
    }
    if (request.url().endsWith("/demo/v1/responses")) {
      const body = request.postDataJSON() as { input?: unknown; stream?: boolean; store?: boolean };
      expect(body.stream).toBe(true);
      expect(body.store).toBe(false);
      const map = Array.isArray(body.input);
      const imageCount = map ? JSON.stringify(body.input).split("input_image").length - 1 : 0;
      calls.push({ phase: map ? "map" : "reduce", imageCount });
      const value = map ? { pages: imageCount } : { doc_info: {}, row_data: [], footer: {} };
      const sse = [
        `data: ${JSON.stringify({ type: "response.output_text.delta", delta: JSON.stringify(value) })}`,
        `data: ${JSON.stringify({ type: "response.completed", response: { usage: { input_tokens: 4, output_tokens: 2, total_tokens: 6 } } })}`,
        "data: [DONE]",
        "",
      ].join("\n\n");
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse });
      return;
    }
    if (request.url().endsWith("/demo/v1/models")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "demo-fast" }] }) });
      return;
    }
    await route.continue();
  });

  await page.goto("/#/settings");
  const card = page.locator("article").filter({ hasText: /Custom OpenAI-compatible|Gateway Demo/ }).last();
  await card.getByRole("button", { name: /use gateway demo preset/i }).click();
  await card.getByRole("button", { name: /connect demo session/i }).click();
  await expect(card).toContainText(/15 minutes|15 分钟/);

  await page.goto("/#/new-benchmark");
  await page.locator("#wizard-document-upload").setInputFiles({ name: "five-pages.pdf", mimeType: "application/pdf", buffer: fivePagePdf() });
  await expect(page.getByText("five-pages.pdf", { exact: true })).toBeVisible();
  await expect(page.getByText(/5 pages/).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: /Popular/ }).check();
  await page.getByRole("button", { name: /Continue/ }).click();
  const expected = page.getByRole("radio", { name: /Expected result v1/ });
  if (await expected.count()) await expected.check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: /Gateway Demo/ }).check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio", { name: /Quick Test — run once/ }).check();
  await page.getByRole("radio", { name: /Render pages as images/ }).check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Run Quick Test/ }).click();
  await expect(page.getByText(/Quick Test (completed|finished with issues)/)).toBeVisible({ timeout: 30_000 });
  expect(calls).toEqual([
    { phase: "map", imageCount: 4 },
    { phase: "map", imageCount: 1 },
    { phase: "reduce", imageCount: 0 },
  ]);
});
