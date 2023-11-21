// Import Astral
import { launch } from "../mod.ts";

import { resolve } from "https://deno.land/std@0.205.0/path/resolve.ts";

// Launch the browser
const browser = await launch({
  // Specify whether the browser instance should be persistent or not.
  persistent: true,
  // Setting the directory where the browser will store user-specific data, such as cookies, local storage, and other browsing data.
  userDataDir: resolve("./my-browser-data"),
});

// Open a new page
const page = await browser.newPage("https://deno.land");

// Take a screenshot of the page and save that to disk
const screenshot = await page.screenshot();
Deno.writeFileSync("screenshot.png", screenshot);

// Close the browser
await browser.close();
