import { launch } from "../mod.ts";

Deno.test("Testing evaluate", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage();

  // listen for dialog events
  page.addEventListener("dialog", async (e) => {
    const dialog = e.detail;
    await dialog.accept();
  });

  // navigate to a page with an alert
  await page.goto("data:text/html,<script>alert('hi');</script>");

  // Close browser
  await browser.close();
});
