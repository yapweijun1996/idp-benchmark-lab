import { expect, test } from "@playwright/test";

function hundredPagePdf(): Buffer {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Count 100 /Kids [${Array.from({ length: 100 }, (_, i) => `${i + 3} 0 R`).join(" ")}] >>`];
  for (let i = 0; i < 100; i++) objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n` + offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

test("100-page PDF upload reads all pages and keeps preview rendering bounded", async ({ page }) => {
  await page.goto("/#/documents");
  await page.locator("#pdf-upload").setInputFiles({ name: "hundred-pages.pdf", mimeType: "application/pdf", buffer: hundredPagePdf() });
  await expect(page.locator(".doc-card__name", { hasText: "hundred-pages.pdf" })).toBeVisible();
  await expect(page.getByText(/100 pages/).first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".pdf-page canvas").first()).toBeVisible();
  expect(await page.locator(".pdf-page canvas").count()).toBeLessThan(100);
});
