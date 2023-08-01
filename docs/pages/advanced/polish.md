---
title: 3.3 - Polish
description: How Astral finalizes the polish to make a usable API.
index: 2
---

## Philosophy

When you can't write, read. Browser automation has existed for years, and better
APIs trend towards popularity. People clearly are fans of the
`puppeteer`/`playwright`-style APIs and thus we choose to loosely follow those.

Astral is not trying to be a drop-in replacement for Puppeteer. I personally
believe they made some big mistakes in API design that we have the possibility
of fixing. One instance of this is putting top-level `type` and `click` which
both accept selectors. Another is probably the complexity of the selectors API.
We can and should do better on those regards.

## Actual Implementation

In terms of actual implementation, we essentially do a nice wrapping of our
celestial bindings. A lot of the Puppeteer APIs bind incredibly nicely to the
CDP API, which makes sense given they were built together over at Google.

Sometimes, they don't follow each other as nicely, in which case the
implementation is a lot harder. This can be seen in the `waitFor*` family of
APIs.
