---
title: 2.2 - Bindings
description: How Astral generates bindings
index: 1
---

One of the two big components of what Astral actually is, is the bindings we
generate for the [CDP protocol](/advanced/binary). These bindings are generated
from a hand-rolled script. They should be fully typed and JSDoc'd.

They can be re-generated for a binary by using `deno task bind`.

## How do work???

All of this work actually happens in `bindings/_tools`, with `mod.ts` being the
file to run to generate the bindings. This script can be broken down into three
parts:

1. Extract the protocol JSON from the browser

- Essentially, just make a request to `http://localhost:9222/json/protocol`

2. Extract the types from the JSON
3. Generate bindings for the methods and the events

When generating bindings, we essentially use some clever format strings. There's
nothing too crazy on that front. To avoid making the code look awful, we run
`deno fmt` right after the bindings are generated.
