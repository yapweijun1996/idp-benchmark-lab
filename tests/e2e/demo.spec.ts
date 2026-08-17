import { expect, test } from "@playwright/test";

test("Home demo runs a real benchmark end to end against an intercepted Gemini response", async ({ page }) => {
  // 拦截 Gemini 请求：证明真实链路（内联 data: URL 的 demo PDF blob 抓取 →
  // seedDemoFixture → BenchmarkRunner → executeExtraction → adapter.extract）
  // 全程可用，无需真实 API key/网络访问。
  await page.route("https://generativelanguage.googleapis.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    doc_info: { document_number: "0083217", date: "15.03.2024" },
                    row_data: [
                      { stock_code: "910-006021", description: "LOGITECH M650 M WL WHITE", qty: "2" },
                    ],
                    footer: { remark: null },
                  }),
                },
              ],
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      }),
    });
  });

  await page.goto("/#/home");
  await page.getByLabel(/api key/i).fill("fake-key-for-e2e");
  await page.getByRole("radio", { name: "1" }).click();
  await page.getByRole("button", { name: /run benchmark/i }).click();

  const resultRegion = page.getByRole("region", { name: /demo result/i });
  await expect(resultRegion).toBeVisible({ timeout: 15_000 });
  await expect(resultRegion.getByText(/runs: 1/i)).toBeVisible();
  await expect(resultRegion.getByRole("link", { name: /inspect raw outputs/i })).toHaveAttribute("href", "#/runs");

  // 真正落库：可在 Runs & Results 中检视
  await page.goto("/#/runs");
  await expect(page.getByText(/demo: popular purchase order/i).first()).toBeVisible();
});

test("Home demo renders canonical page images for OpenAI (real pdf.js + canvas render, only the network call faked)", async ({
  page,
}) => {
  // OpenAI/OpenAI-compatible 不支持 native PDF，必须走 canonical_images 模式：
  // 这条链路依赖真实的 pdf.js worker 加载 + canvas 渲染（runtimeDeps.ts 的
  // browserExecuteDeps() 修复的正是这个此前从未被生产代码路径接线过的缺口）。
  // 只拦截 OpenAI 网络请求，其余全部走真实实现，用以证明该修复确实生效。
  let capturedImageCount = 0;
  await page.route("https://api.openai.com/**", async (route) => {
    const body = route.request().postDataJSON() as { messages?: { content?: { type: string }[] }[] };
    const content = body.messages?.[0]?.content ?? [];
    capturedImageCount = content.filter((c) => c.type === "image_url").length;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                doc_info: { document_number: "0083217", date: "15.03.2024" },
                row_data: [
                  { stock_code: "910-006021", description: "LOGITECH M650 M WL WHITE", qty: "2" },
                ],
                footer: { remark: null },
              }),
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    });
  });

  await page.goto("/#/home");
  await page.getByRole("radio", { name: "OpenAI", exact: true }).click();
  await page.getByLabel(/api key/i).fill("fake-key-for-e2e");
  await page.getByRole("radio", { name: "1" }).click();
  await page.getByRole("button", { name: /run benchmark/i }).click();

  const resultRegion = page.getByRole("region", { name: /demo result/i });
  await expect(resultRegion).toBeVisible({ timeout: 15_000 });
  await expect(resultRegion.getByText(/runs: 1/i)).toBeVisible();
  await expect(resultRegion.getByText(/provider: openai/i)).toBeVisible();
  // 证明真的渲染并发送了页面图片，而不是空请求/抛错后被吞掉
  expect(capturedImageCount).toBeGreaterThan(0);
});
