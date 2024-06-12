// Import Astral
import { launch } from "jsr:@astral/astral";

// Connect to remote endpoint
const browser = await launch({
  wsEndpoint: "ws://localhost:1337",
  // args: ["--no-sandbox"],
  // product: "chrome",
  headless: false,
});

console.log(browser.wsEndpoint());

// Do stuff
const page = await browser.newPage("http://example.com");
console.log(await page.evaluate(() => document.title));

// Close connection
await browser.close();
