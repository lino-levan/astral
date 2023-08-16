import { assertSnapshot } from "https://deno.land/std@0.198.0/testing/snapshot.ts";
import { launch } from "../mod.ts";

Deno.test("Wait for selector", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("http://deno.land");

  // Wait for selector
  const selected = await page.waitForSelector(".font-bold");
  console.log(selected);

  // Close browser
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
