# Astral

<img src="./docs/static/icon.png" height="200" width="200" align="right"/>

Astral is a high-level puppeteer/playwright-like library that allows for control
over a web browser (primarily for automation and testing). It is written from
scratch with Deno in mind.

## Documentation

All of our docs are written in markdown and rendered using
[Pyro](https://pyro.deno.dev). They can be viewed at
[astral.deno.dev](https://astral.deno.dev).

## Basic Usage

```ts
// Import Astral
import { launch } from "jsr:@astral/astral";

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
