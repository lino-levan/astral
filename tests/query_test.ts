import { assertExists } from "@std/assert";
import { launch } from "../mod.ts";

Deno.test("Set content", async () => {
  // Launch browser
  const browser = await launch();
  const content = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Astral</title>
    </head>
    <body>
      <span>Hello world</span>
    </body>
  </html>`;

  // Open the webpage and set content
  const page = await browser.newPage();
  await page.setContent(content);

  // Basic selector
  const body = await page.$("body");
  assertExists(body);

  // Basic selector
  const nonsense = await page.$(".fake");
  assertExists(!nonsense);

  // Set media queries
  await page.emulateMediaFeatures([{
    name: "prefers-reduced-motion",
    value: "reduce",
  }]);
  await page.emulateMediaFeatures([{
    name: "prefers-color-scheme",
    value: "dark",
  }]);

  // Close browser
  await browser.close();
});
