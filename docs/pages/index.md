---
title: Introduction
description: A simple introduction to Astral
index: 0
---

<img src="/icon.png" height="300" width="300" align="right"/>

> Astral is a Puppeteer/Playwright-like library designed with Deno in mind.

## What can I do?

Most things that you can do manually in the browser can be done using Astral!
Here are a few examples to get you started:

- Generate screenshots and PDFs of pages.
- Crawl a SPA (Single-Page Application) and generate pre-rendered content (i.e.
  "SSR" (Server-Side Rendering)).
- Automate form submission, UI testing, keyboard input, etc.
- Create a reproducable, automated testing environment using the latest
  JavaScript and browser features.
- Stealthy by default. No need to install or setup extra libraries to get
  features that should come by default.

## Usage

Before we go into the depths of the API, let's see a quick demo first:

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

You can run this from the command line using:

```bash
deno run -A https://deno.land/x/astral/examples/screenshot.ts
```
