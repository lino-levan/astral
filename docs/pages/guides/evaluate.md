---
title: Evaluate
description: A small example on how to do complex evaluation in Astral
index: 2
---

## Running

```bash
deno run -A https://deno.land/x/astral/examples/evaluate.ts
```

## Code

```ts
// Import Astral
import { launch } from "https://deno.land/x/astral/mod.ts";

// Launch the browser
const browser = await launch();

// Open a new page
const page = await browser.newPage("https://deno.land");

// Run code in the context of the browser
const value = await page.evaluate(() => {
  return document.body.innerHTML;
});
console.log(value);

// Run code with args
const result = await page.evaluate((x, y) => {
  return `The result of adding ${x}+${y} = ${x + y}`;
}, {
  args: [10, 15],
});
console.log(result);

// Close the browser
await browser.close();
```
