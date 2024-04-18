---
title: Attributes
description: A small example on how to do get attributes in Astral
index: 3
---

## Code

```ts
// Import Astral
import { launch } from "jsr:@astral/astral";

// Launch the browser
const browser = await launch();

// Open a new page
const page = await browser.newPage("https://deno.land");

// Take an element
const element = await page.$("img");

// Take attributes from an element
const attributes = await element.getAttributes();

console.log(attributes);
/*
{
  class: "max-w-[28rem] hidden lg:block",
  src: "/runtime/deno-looking-up.svg?__frsh_c=6f92b045bc7486e03053e1977adceb7e4aa071f4",
  alt: "",
  width: "670",
  height: "503"
}
*/

// Take only one attribute from an element
const src = await element.getAttribute("src");

console.log(src);
/*
  "/runtime/deno-looking-up.svg?__frsh_c=6f92b045bc7486e03053e1977adceb7e4aa071f4"
*/

// Close the browser
await browser.close();
```
