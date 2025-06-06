---
title: Code coverage
description: How to collect coverage from Astral evaluated functions
index: 5
---

If you collect code coverage in your deno tests and print the results, you will
notice that any function within a `Page.evaluate()` will not be covered.

This is expected because the code is actually ran in the browser V8 engine
rather than deno's.

```diff
- cover file:///workspaces/astral/tests/coverage.ts ... 33.333% (4/12)
-   7 | await page.evaluate(() => {
-   8 |   console.log("foo");
-   9 |   console.log("bar");
-  10 | });
```

However, Astral is able to collect the coverage within the browser, and can map
it back to your original source files as if deno was the one collectiong
coverage.

```diff
+ cover file:///workspaces/astral/tests/coverage.ts ... 100.000% (13/13)
```

In order to enable this feature, you will need to pass `coverage: true`, and the
following environment variables must be accessible.

- `DENO_DIR`
  - Astral needs to be able to access the generated files cache to map backs
    sources. This variable is used by `@deno/cache-dir` to compute this path.
- `DENO_COVERAGE_DIR`
  - Astral will directly write coverage files as they're collected (these files
    are prefixed with `astral-` so you can distinguish them from deno coverage
    files)
  - From deno 2.4 and later, this variable is automatically set when coverage is
    enabled

_Note: it is not possible to cover `string` expressions passed to
`Page.evaluate()`_

> ⚠️ Important
>
> This feature uses [`node:inspector`](https://nodejs.org/api/inspector.html)
> ([which relies on the V8 Inspector Protocol](https://v8.dev/docs/inspector))
> and requires `--allow-sys=inspector` permission.
>
> It may impact performances as astral will need to query the inspector to find
> your function location, retrieves its unique identifier, read the emitted
> transpiled JavaScript file and perform various additional tasks. You should
> only enable this feature in non-production environments.

## Code

```ts
// Import Astral
import { launch } from "jsr:@astral/astral";
import { fromFileUrl } from "@std/path/from-file-url";

// Launch a browser page with coverage enabled
await using browser = await launch();
await using page = await browser.newPage("http://example.com", {
  coverage: true,
});

// Run your code
await page.evaluate(() => {
  console.log("foo");
  console.log("bar");
});
```
