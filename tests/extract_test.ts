import { assertSnapshot } from "https://deno.land/std@0.197.0/testing/snapshot.ts";

import { launch } from "../mod.ts";

Deno.test("Extracting page content", async (t) => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("http://example.com");

  // Content of page
  assertSnapshot(t, await page.content());

  // Screenshot page
  assertSnapshot(t, await page.screenshot());

  // TODO(lino-levan): figure out why pdf is causing issues for snapshots
  // PDF of page
  // assertSnapshot(t, await page.pdf())

  // Close browser
  await browser.close();
});
