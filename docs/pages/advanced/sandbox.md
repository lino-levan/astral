---
title: Sandbox permissions
description: How to use Deno permissions to sandbox pages
index: 4
---

`Browser.newPage()` supports a `sandbox` mode, which use
[Deno permissions](https://docs.deno.com/runtime/manual/basics/permissions) to
validate network requests (using `--allow-net` permissions), file requests
(using `--allow-read` permissions) and imported `<script>` requests (using
`--allow-import` permissions) on the opened page.

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

## Using permissions subsets

By default, using `sandbox: true` will inherit all permissions from current
thread.

You can choose to pass a
[`Deno.PermissionOptionsObject`](https://docs.deno.com/api/deno/~/Deno.PermissionOptionsObject)
to use a subset of these permissions instead and further restrict what a given
page can access.

Currently
[`Deno.ReadPermissionDescriptor`](https://docs.deno.com/api/deno/~/Deno.ReadPermissionDescriptor),
[`Deno.NetPermissionDescriptor`](https://docs.deno.com/api/deno/~/Deno.NetPermissionDescriptor),
and
[`Deno.ImportPermissionDescriptor`](https://docs.deno.com/api/deno/~/Deno.ImportPermissionDescriptor)
are supported.

Using `true` (e.g. `net: true` / `read: true` / `import: true`) is the same as
using `"inherit"` and will not throw any permission escalation error.

```ts
await using browser = await launch();
await using page = await browser.newPage("https://example.com", {
  sandbox: { permissions: { net: ["example.com"] } },
});
```

Under the hood, this option spawns a self-closing `Worker` with the given
permissions subset and validates permissions from within the restricted thread,
meaning that this feature actually use Deno's own permission system.

Using permissions subsets requires the `--unstable-worker-options` flag.
