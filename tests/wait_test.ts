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
