import { assertEquals } from "https://deno.land/std@0.198.0/assert/assert_equals.ts";

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
  await page.goto("data:text/html,<script>alert('hi');</script>");

  // Close browser
  await browser.close();
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
  await page.goto(
    "data:text/html,<script>prompt('Please type your username');</script>",
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
  await page.goto("data:text/html,<script>confirm('Is this good?');</script>");

  // Close browser
  await browser.close();
});
