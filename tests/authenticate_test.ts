/// <reference lib="dom" />

import { assertEquals, assertNotEquals } from "@std/assert";

import { launch } from "../mod.ts";

Deno.test("Testing authenticate", async (_t) => {
  // Open the webpage
  const browser = await launch({ headless: true });
  const page = await browser.newPage();

  // Provide credentials for HTTP authentication.
  await page.authenticate({ username: "postman", password: "password" });
  const url = "https://postman-echo.com/basic-auth";
  await page.goto(url, { waitUntil: "networkidle2" });

  // Get JSON response
  const content = await page.evaluate(() => {
    return document.body.innerText;
  });

  // Assert JSON response
  assertNotEquals(content, "");
  const response = JSON.parse(content);
  assertEquals(response.authenticated, true);

  // Close browser
  await browser.close();
});
