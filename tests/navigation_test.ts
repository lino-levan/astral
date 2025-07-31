import { assertRejects } from "@std/assert";

import { launch } from "../mod.ts";
import { serverUrl } from "./utils/helpers.ts";

Deno.test("Page - back and forth navigation works", async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(serverUrl);
  await page.locator("a").click();
  await page.goBack();
  assertRejects(() => page.goBack(), "No history entry available");
  await page.goForward();
  assertRejects(() => page.goForward(), "No history entry available");
  await page.close();
  await browser.close();
});

Deno.test("Page - back and forth navigation works (hardened browser)", async () => {
  const browser = await launch({ launchPresets: { hardened: true } });
  const page = await browser.newPage();
  await page.goto(serverUrl);
  await page.locator("a").click();
  await page.goBack();
  assertRejects(() => page.goBack(), "No history entry available");
  await page.goForward();
  assertRejects(() => page.goForward(), "No history entry available");
  await page.close();
  await browser.close();
});
