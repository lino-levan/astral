---
title: Connect to existing browser
description: How to connect an existing browser process with astral
index: 3
---

If you already have a browser process running somewhere else or you're using a
service that provides remote browsers for automation (such as
[browserless.io](https://www.browserless.io/)), it is possible to directly
connect to its endpoint rather than spawning a new process.

## Code

```ts
// Import Astral
import { launch } from "https://deno.land/x/astral/mod.ts";

// Connect to remote endpoint
const browser = await launch({
  wsEndpoint: "wss://remote-browser-endpoint.example.com",
});

// Do stuff
const page = await browser.newPage("http://example.com");
console.log(await page.evaluate(() => document.title));

// Close connection
await browser.close();
```

## Reusing a browser spawned by astral

A browser instance expose its WebSocket endpoint through `browser.wsEndpoint()`.

```ts
// Spawn a browser process
const browser = await launch();

// Connect to first browser instead
const anotherBrowser = await launch({ wsEndpoint: browser.wsEndpoint() });
```

This is especially useful in unit testing as you can setup a shared browser
instance before all your tests, while also properly closing resources to avoid
operations leaks.
