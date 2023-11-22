import { delay } from "https://deno.land/std@0.205.0/async/delay.ts";

// deno-lint-ignore no-unused-vars
import { launch, onShutdown, shutdown } from "../mod.ts";

// Register your own shutdown
onShutdown(async () => {
  console.log("Send logs...");
  await delay(1000);
});

onShutdown(async () => {
  console.log("Save data...");
  await delay(1000);
});

// Launch the browser
const browser = await launch();

// Open a new page
const page = await browser.newPage("https://deno.land");

// Take a screenshot of the page and save that to disk
const screenshot = await page.screenshot();
Deno.writeFileSync("screenshot.png", screenshot);

console.log("Terminate the process using the keyboard shortcut Ctrl + C");

// or use a manual shutdown call
// await shutdown()

// Waiting a minute until the end
await page.waitForTimeout(60_000);

// Close the browser
await browser.close();
