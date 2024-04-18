---
title: Sandbox permissions
description: How to use Deno permissions to sandbox pages
index: 4
---

`Browser.newPage()` supports a `sandbox` mode, which use
[Deno permissions](https://docs.deno.com/runtime/manual/basics/permissions) to
validate network requests (using `--allow-net` permissions) and file requests
(using `--allow-read` permissions) on the opened page.

## Code

```ts
// Import Astral
import { launch } from "jsr:@astral/astral";
import { fromFileUrl } from "@std/path/from-file-url";

// Launch browser
const browser = await launch();

// Open the page if permission granted, or throws Deno.errors.PermissionDenied
{
  const { state } = await Deno.permissions.query({
    name: "net",
    path: "example.com",
  });
  await browser.newPage("https://example.com", { sandbox: true });
}

// Open the page if permission granted, or throws Deno.errors.PermissionDenied
{
  const { state } = await Deno.permissions.query({
    name: "read",
    path: fromFileUrl(import.meta.url),
  });
  await browser.newPage(fromFileUrl(import.meta.url), { sandbox: true });
}

// Close browser
await browser.close();
```
