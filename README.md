# Astral

<img src="./docs/static/icon.png" height="200" width="200" align="right"/>

Astral is a high-level puppeteer/playwright-like library that allows for control
over a web browser for automation and testing. It is written from scratch with
Deno in mind.

## Documentation

All of our docs are written in markdown and rendered using
[Pyro](https://pyro.deno.dev). They can be viewed at
[astral.deno.dev](https://astral.deno.dev).

## Basic Usage

```ts
import { launch } from "https://deno.land/x/astral/mod.ts";

const browser = await launch();
const page = await browser.newPage("https://google.com");

const screenshot = await page.screenshot();
Deno.writeFileSync("screenshot.png", screenshot);

browser.close();
```
