import { assertSnapshot } from "@std/testing/snapshot";

import { launch } from "../mod.ts";
import { serverUrl } from "./utils/helpers.ts";

Deno.test("Extracting page content", async (t) => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage(serverUrl);

  // Content of page
  assertSnapshot(t, await page.content());

  // Close browser
  await browser.close();
});

Deno.test("Screenshot page content", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage(serverUrl);

  // TODO(lino-levan): figure out why screenshot is causing issues for snapshots
  // Screenshot page
  // assertSnapshot(t, await page.screenshot());
  await page.screenshot();

  // Close browser
  await browser.close();
});

Deno.test("Make a PDF of page content", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage(serverUrl);

  // TODO(lino-levan): figure out why pdf is causing issues for snapshots
  // PDF of page
  // assertSnapshot(t, await page.pdf())
  await page.pdf();

  // Close browser
  await browser.close();
});
