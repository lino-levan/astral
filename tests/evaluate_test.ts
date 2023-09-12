import { assertEquals } from "https://deno.land/std@0.201.0/assert/assert_equals.ts";
import { assertSnapshot } from "https://deno.land/std@0.201.0/testing/snapshot.ts";

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

  // Close browser
  await browser.close();
});
