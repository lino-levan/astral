import { assertEquals } from "@std/assert";

import { launch } from "../mod.ts";
import { serverUrl } from "./utils/helpers.ts";

Deno.test("Testing events", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage(serverUrl);

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
