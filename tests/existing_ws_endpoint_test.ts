import { connect, launch } from "../mod.ts";
import { assertThrows } from "@std/assert";
import { assert } from "@std/assert/assert";

import { serverUrl } from "./utils/helpers.ts";

Deno.test("Test existing ws endpoint", async () => {
  // Spawn one browser instance and spawn another one connecting to the first one
  const a = await launch();
  const b = await connect({ endpoint: a.wsEndpoint() });

  // Test that second instance works without any process attached
  const page = await b.newPage(serverUrl);
  await page.waitForSelector("h1");
  await page.close();
  assert(!b.pages.includes(page));

  // Close first instance and ensure that b instance is inactive too
  await a.close();
  assert(a.closed);
  assert(b.closed);
});

Deno.test("Test existing http endpoint", async () => {
  // Spawn one browser instance and spawn another one connecting to the first one
  const a = await launch();
  const b = await connect({ endpoint: new URL(a.wsEndpoint()).host });

  // Test that second instance works without any process attached
  const page = await b.newPage(serverUrl);
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
  const b = await connect({ endpoint: a.wsEndpoint() });

  // Ensure closing existing endpoint properly clean resources
  await b.newPage(serverUrl);
  await b.newPage(serverUrl);
  await b.close();
  assertThrows(() => b.pages[0].close(), "Page has already been closed");
  assertThrows(() => b.pages[1].close(), "Page has already been closed");
  assert(b.closed);
  await a.close();
});
