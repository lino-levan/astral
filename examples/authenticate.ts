/// <reference lib="dom" />

// Import Astral
import { launch } from "../mod.ts";

// Launch the browser
const browser = await launch();

// Open a new page
const page = await browser.newPage();

// Provide credentials for HTTP authentication.
await page.authenticate({ username: "postman", password: "password" });
const url = "https://postman-echo.com/basic-auth";
await page.goto(url, { waitUntil: "networkidle2" });

// Get response
const content = await page.evaluate(() => {
  return document.body.innerText;
});
console.log(content);

// Close the browser
await browser.close();
