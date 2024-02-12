/// <reference lib="dom" />

import { assert } from "https://deno.land/std@0.215.0/assert/assert.ts";

import { launch } from "../mod.ts";

Deno.test("Testing stealth", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("http://example.com");

  // passing arguments to evaluate
  const userAgent: string = await page.evaluate(() => {
    return navigator.userAgent;
  });
  assert(!userAgent.toLowerCase().includes("headless"));

  // Close browser
  await browser.close();
});
