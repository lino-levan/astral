/// <reference lib="dom" />

import { assertEquals } from "@std/assert";
import { assertSnapshot } from "@std/testing/snapshot";

import { launch } from "../mod.ts";

Deno.test("Testing evaluate", async (t) => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("http://example.com");

  // passing arguments to evaluate
  const result = await page.evaluate((x, y) => {
    return x + y;
  }, {
    args: ["string", "concat"] as const,
  });
  assertEquals(result, "stringconcat");

  // innerHTML / innerText
  const element = (await page.$("div"))!;
  assertSnapshot(t, await element.innerHTML());
  assertSnapshot(t, await element.innerText());

  // Resize the page
  const viewportSize = { width: 1000, height: 1000 };
  await page.setViewportSize(viewportSize);
  const pageSize = await page.evaluate(() => {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
  });
  assertEquals(pageSize, viewportSize);

  // Close browser
  await browser.close();
});
