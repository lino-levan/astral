---
title: Introduction
description: A simple introduction to Astral
index: 0
---

Astral is a Puppeteer/Playwright-like library designed with Deno in mind. Before
we go into the depths of the API, let's see a quick demo first:

```ts
import { launch } from "https://deno.land/x/astral/mod.ts";

const browser = await launch();
const page = await browser.newPage("https://google.com");

const screenshot = await page.screenshot();
Deno.writeFileSync("screenshot.png", screenshot);

browser.close();
```
