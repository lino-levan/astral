import { assertEquals } from "https://deno.land/std@0.198.0/assert/assert_equals.ts";

import { launch } from "../mod.ts";

Deno.test("Testing evaluate", async () => {
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

  // Close browser
  await browser.close();
});
