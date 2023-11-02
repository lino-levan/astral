import { assertStrictEquals } from "https://deno.land/std@0.205.0/assert/assert_strict_equals.ts";
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

  // Wait for selector
  assertStrictEquals(
    content.replace(/\s/g, ""),
    `${await page.content()}`.replace(/\s/g, ""),
  );
  const selected = await page.waitForSelector("span");
  assertStrictEquals(await selected.innerText(), "Hello world");

  // Close browser
  await browser.close();
});
