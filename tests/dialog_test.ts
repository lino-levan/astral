import { assertEquals } from "@std/assert";

import { launch } from "../mod.ts";

Deno.test("Accepting basic alert", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage();

  // listen for dialog events
  page.addEventListener("dialog", async (e) => {
    const dialog = e.detail;

    assertEquals(dialog.message, "hi");
    assertEquals(dialog.type, "alert");

    await dialog.accept();
  });

  // navigate to a page with an alert
  await page.setContent("<script>alert('hi');</script>");

  // Close browser
  await browser.close();
});

Deno.test({
  name: "Accepting basic alert with playwright-like syntax",
  async fn() {
    // Launch browser
    const browser = await launch();

    // Open the webpage
    const page = await browser.newPage();

    // listen for dialog events
    const dialogPromise = page.waitForEvent("dialog");

    // navigate to a page with an alert
    page.setContent("<script>alert('hi');</script>");

    // handle dialog
    const dialog = await dialogPromise;
    assertEquals(dialog.message, "hi");
    assertEquals(dialog.type, "alert");
    await dialog.accept();

    // Close browser
    await browser.close();
  },
  // TODO(lino-levan): Remove this once this Deno bug is fixed
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test("Accepting prompt", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage();

  // listen for dialog events
  page.addEventListener("dialog", async (e) => {
    const dialog = e.detail;

    assertEquals(dialog.message, "Please type your username");
    assertEquals(dialog.type, "prompt");

    await dialog.accept("John Doe");
  });

  // navigate to a page with an alert
  await page.setContent(
    "<script>prompt('Please type your username');</script>",
  );

  // Close browser
  await browser.close();
});

Deno.test("Declining comfirm", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage();

  // listen for dialog events
  page.addEventListener("dialog", async (e) => {
    const dialog = e.detail;

    assertEquals(dialog.message, "Is this good?");
    assertEquals(dialog.type, "confirm");

    await dialog.dismiss();
  });

  // navigate to a page with an alert
  await page.setContent("<script>confirm('Is this good?');</script>");

  // Close browser
  await browser.close();
});

Deno.test("Input choose file", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage();

  // navigate to a page with an alert
  await page.setContent('<input type="file"></input>');

  // click input and handle file chooser
  const element = await page.$("input");

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    element?.click(),
  ]);

  assertEquals(fileChooser.multiple, false);

  await fileChooser.setFiles(["./tests/assets/file.txt"]);

  // Close browser
  await browser.close();
});
