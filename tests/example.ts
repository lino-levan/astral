import { launch } from "../mod.ts";

// Launch browser
const browser = await launch();

// Open the webpage
const page = await browser.newPage("https://deno.land");
Deno.writeFileSync("tests/images/1.png", await page.screenshot());

// Click the search button
const button = await page.$("button");
await button!.click();
Deno.writeFileSync("tests/images/2.png", await page.screenshot());

// Type in the search input
const input = await page.$("#search-input");
await input!.type("pyro", { delay: 100 });
Deno.writeFileSync("tests/images/3.png", await page.screenshot());

// Wait for the search results to come back
await page.waitForNetworkIdle({ idleConnections: 0, idleTime: 1000 });

// Click the "pyro" link
const xLink = await page.$("a.justify-between:nth-child(1)");
await Promise.all([
  xLink!.click(),
  page.waitForNavigation(),
]);
Deno.writeFileSync("tests/images/4.png", await page.screenshot());

// Click the link to "pyro.deno.dev"
const dLink = await page.$(".markdown-body > p:nth-child(8) > a:nth-child(1)");
await Promise.all([
  dLink!.click(),
  page.waitForNavigation(),
]);
Deno.writeFileSync("tests/images/5.png", await page.screenshot());

// Close browser
browser.close();
