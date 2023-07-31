import { launch } from "../mod.ts";

// Launch browser
const browser = await launch({ headless: false });

// Open the webpage
const page = await browser.newPage("https://deno.land");
await page.waitForNavigation();
Deno.writeFileSync("tests/images/1.png", await page.screenshot());

// Click the search button
const button = await page.$("button");
await button!.click();
Deno.writeFileSync("tests/images/2.png", await page.screenshot());

// Type in the search input
const input = await page.$("#search-input");
await input!.type("pyro", { delay: 100 });
Deno.writeFileSync("tests/images/3.png", await page.screenshot());

// Close browser
browser.close();
