/// <reference lib="dom" />

// Import Astral
import { launch } from "../mod.ts";

// Launch the browser
const browser = await launch();

// Open a new page
const page = await browser.newPage("https://deno.land");

// Run code in the context of the browser
const value = await page.evaluate(() => {
  return document.body.innerHTML;
});
console.log(value);

// Close the browser
browser.close();
