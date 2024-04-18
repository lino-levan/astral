---
title: Navigation
description: A small example on how to do complex navigation in Astral
index: 1
---

## Running

```bash
deno run -A https://deno.land/x/astral/examples/navigation.ts
```

## Code

```ts
// Import Astral
import { launch } from "jsr:@astral/astral";

// Launch browser in headfull mode
const browser = await launch({ headless: false });

// Open the webpage
const page = await browser.newPage("https://deno.land");

// Click the search button
const button = await page.$("button");
await button!.click();

// Type in the search input
const input = await page.$("#search-input");
await input!.type("pyro", { delay: 1000 });

// Wait for the search results to come back
await page.waitForNetworkIdle({ idleConnections: 0, idleTime: 1000 });

// Click the 'pyro' link
const xLink = await page.$("a.justify-between:nth-child(1)");
await Promise.all([
  xLink!.click(),
  page.waitForNavigation(),
]);

// Click the link to 'pyro.deno.dev'
const dLink = await page.$(
  ".markdown-body > p:nth-child(8) > a:nth-child(1)",
);
await Promise.all([
  dLink!.click(),
  page.waitForNavigation(),
]);

// Close browser
await browser.close();
```
