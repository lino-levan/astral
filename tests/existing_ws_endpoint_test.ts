import { launch } from "../mod.ts";
import { assertThrows } from "https://deno.land/std@0.204.0/assert/assert_throws.ts";
import { assert } from "https://deno.land/std@0.205.0/assert/assert.ts";

Deno.test("Test existing ws endpoint", async () => {
  // Spawn one browser instance and spawn another one connecting to the first one
  const a = await launch();
  const b = await launch({ wsEndpoint: a.wsEndpoint() });

  // Test that second instance works without any process attached
  const page = await b.newPage("http://example.com");
  await page.waitForSelector("h1");
  await page.close();
  assert(!b.pages.includes(page));

  // Close first instance and ensure that b instance is inactive too
  await a.close();
  assert(a.closed);
  assert(b.closed);
});

Deno.test("Ensure pages are properly closed when closing existing endpoint", async () => {
  // Spawn one browser instance and spawn another one connecting to the first one
  const a = await launch();
  const b = await launch({ wsEndpoint: a.wsEndpoint() });

  // Ensure closing existing endpoint properly clean resources
  await b.newPage("http://example.com");
  await b.newPage("http://example.com");
  await b.close();
  assertThrows(() => b.pages[0].close(), "Page has already been closed");
  assertThrows(() => b.pages[1].close(), "Page has already been closed");
  assert(b.closed);
  await a.close();
});
