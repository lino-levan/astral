import { assertEquals } from "https://deno.land/std@0.205.0/assert/assert_equals.ts";

import { launch } from "../mod.ts";

Deno.test("Testing events", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("http://example.com");

  // page.addEventListener()

  // log something to console
  const [consoleEvent] = await Promise.all([
    page.waitForEvent("console"),
    page.evaluate(() => {
      console.log("hey");
    }),
  ]);
  assertEquals(consoleEvent.type, "log");
  assertEquals(consoleEvent.text, "hey");

  const [pageErrorEvent] = await Promise.all([
    page.waitForEvent("pageerror"),
    page.goto('data:text/html,<script>throw new Error("Test")</script>'),
  ]);
  assertEquals(
    pageErrorEvent.message,
    'Error: Test\n    at data:text/html,<script>throw new Error("Test")</script>:1:15',
  );

  // Close browser
  await browser.close();
});
