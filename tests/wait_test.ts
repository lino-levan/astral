import { assertSnapshot } from "@std/testing/snapshot";
import { assertRejects } from "@std/assert";

import { launch } from "../mod.ts";

Deno.test("Wait for selector", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("https://example.com");

  // Wait for selector
  const selected = await page.waitForSelector("h1");
  console.log(selected);

  // Close browser
  await browser.close();
});

Deno.test("Fail wait for selector", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("https://example.com");

  await assertRejects(
    () => {
      return page.waitForSelector(".font-bold1", { timeout: 1000 });
    },
    Error,
    "Unable to get element from selector",
  );

  await browser.close();
});

Deno.test("Wait for function", async (t) => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("https://pyro.deno.dev");

  // Wait for function (kind of a stupid case, but whatever, make it better if you see this)
  const fetched = await page.waitForFunction(async () => {
    const req = await fetch("https://pyro.deno.dev/guides/");
    return await req.text();
  });
  assertSnapshot(t, fetched);

  // Close browser
  await browser.close();
});
