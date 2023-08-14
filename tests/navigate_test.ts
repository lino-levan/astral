import { launch } from "../mod.ts";

Deno.test("General navigation", async () => {
  // Launch browser
  const browser = await launch();
  console.log("launched browser");

  // Open the webpage
  const page = await browser.newPage("https://deno.land");
  console.log("opened page");

  // Click the search button
  const button = await page.$("button");
  console.log("obtaining button from page...");
  await button!.click();
  console.log("clicked search button");

  // Type in the search input
  const input = await page.$("#search-input");
  await input!.type("pyro", { delay: 100 });
  console.log("type the search input");

  // Wait for the search results to come back
  await page.waitForNetworkIdle({ idleConnections: 0, idleTime: 1000 });
  console.log("wait for network idle");

  // Click the 'pyro' link
  const xLink = await page.$("a.justify-between:nth-child(1)");
  await Promise.all([
    xLink!.click(),
    page.waitForNavigation(),
  ]);
  console.log("click pyro link");

  // Click the link to 'pyro.deno.dev'
  const dLink = await page.$(
    ".markdown-body > p:nth-child(8) > a:nth-child(1)",
  );
  await Promise.all([
    dLink!.click(),
    page.waitForNavigation(),
  ]);
  console.log("click link to pyro.deno.dev");

  // Close browser
  await browser.close();
  console.log("close the browser");
});
