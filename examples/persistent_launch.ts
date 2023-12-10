// Import Astral
import { launch } from "../mod.ts";

// Launch the browser
const browser = await launch({
  // Setting the directory where the browser will store user-specific data, such as cookies, local storage, and other browsing data.
  userDataDir: "./my-browser-data",
});

// Open a new page
const page = await browser.newPage("https://deno.land");

// Take a screenshot of the page and save that to disk
const screenshot = await page.screenshot();
Deno.writeFileSync("screenshot.png", screenshot);

// Close the browser
await browser.close();
