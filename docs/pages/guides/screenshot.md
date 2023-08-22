---
title: Screenshots
description: A small example on how to do screenshots in Astral
index: 0
---

## Running

```bash
deno run -A https://deno.land/x/astral/examples/screenshot.ts
```

## Code

```ts
// Import Astral
import { launch } from "https://deno.land/x/astral/mod.ts";

// Launch the browser
const browser = await launch();

// Open a new page
const page = await browser.newPage("https://deno.land");

// Take a screenshot of the page and save that to disk
const screenshot = await page.screenshot();
Deno.writeFileSync("screenshot.png", screenshot);

// Close the browser
await browser.close();
```

## Result

<img src="/examples/screenshot.png">
