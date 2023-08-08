import { launch } from "../mod.ts";

for (let i = 0; i < 20; i++) {
  Deno.test("Open browser, open page, and close browser", async () => {
    // Launch browser
    const browser = await launch();

    // Open the webpage
    await browser.newPage("http://example.com");

    // Close browser
    await browser.close();
  });
}
