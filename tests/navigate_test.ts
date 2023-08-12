import { launch } from "../mod.ts";

Deno.test("General navigation", async () => {
  console.log("launched browser");
  // Launch browser
  const browser = await launch();

  console.log("opened page");
  // Open the webpage
  const page = await browser.newPage("https://deno.land");

  console.log("clicked search button");
  // Click the search button
  const button = await page.$("button");
  await button!.click();

  console.log("type the search input");
  // Type in the search input
  const input = await page.$("#search-input");
  await input!.type("pyro", { delay: 100 });

  console.log("wait for network idle");
  // Wait for the search results to come back
  await page.waitForNetworkIdle({ idleConnections: 0, idleTime: 1000 });

  console.log("click pyro link");
  // Click the 'pyro' link
  const xLink = await page.$("a.justify-between:nth-child(1)");
  await Promise.all([
    xLink!.click(),
    page.waitForNavigation(),
  ]);

  console.log("click link to pyro.deno.dev");
  // Click the link to 'pyro.deno.dev'
  const dLink = await page.$(
    ".markdown-body > p:nth-child(8) > a:nth-child(1)",
  );
  await Promise.all([
    dLink!.click(),
    page.waitForNavigation(),
  ]);

  console.log("close the browser");
  // Close browser
  await browser.close();
});
