/// <reference lib="dom" />

import { assert } from "@std/assert/assert";

import { launch } from "../mod.ts";
import { serverUrl } from "./utils/helpers.ts";

Deno.test("Testing stealth", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage(serverUrl);

  // passing arguments to evaluate
  const userAgent = await page.evaluate(() => {
    return navigator.userAgent;
  }) as string;
  assert(!userAgent.toLowerCase().includes("headless"));

  // Close browser
  await browser.close();
});
