/// <reference lib="dom" />

// Import Astral
import { launch } from "../mod.ts";

// Launch the browser
const browser = await launch();

// Open the webpage
const page = await browser.newPage("https://deno.land");

// Click the search button
const button = await page.$("button");
await button!.click();

// Type in the search input
const input = await page.$("#search-input");
await input!.type("astral", { delay: 50 });

// Get the entered value
const inputValue: string = await input!.evaluate((el: HTMLInputElement) => {
  return el.value;
});

console.log(inputValue);

// Close the browser
await browser.close();
