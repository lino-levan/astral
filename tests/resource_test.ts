import { type Browser, launch, type Page } from "../mod.ts";
import { assertRejects } from "@std/assert/assert-rejects";

Deno.test("Page - close with 'using' keyword", async () => {
  const browser = await launch();
  let ref: Page | null = null;
  {
    await using page = await browser.newPage();
    await page.goto("https://example.com");
    await page.waitForNetworkIdle();
    ref = page;
  }

  assertRejects(() => ref.close(), "already been closed");

  await browser.close();
});

Deno.test("Browser - close with 'using' keyword", async () => {
  let ref: Browser | null = null;
  {
    await using browser = await launch();
    ref = browser;
    const page = await browser.newPage();
    await page.goto("https://example.com");
    await page.waitForNetworkIdle();
    await page.close();
  }
  assertRejects(() => ref.close(), "already been closed");
});
