---
title: Binaries
description: How Astral deals with binaries
index: 0
---

The simplest part of Astral is the actual **CDP-compatible** binary that you
use. What does that actually mean?

## CDP (Chrome DevTools Protocol)

Ignoring all of the complexities of implementation, all Astral does is interface
with a well-defined protocol which is the Chrome DevTools Protocol.

The best documentation that exists on this protocol can be found
[here](https://chromedevtools.github.io/devtools-protocol/), from the official
github repo. I should note that while this documentation is extensive (it's
auto-generated), there are no good examples on how to interact with the protocol
itself. Most of the learnings I've had on that side were by reading the code on
how others interface with the protocol.

Ideally we'd interact with the protocol through a unix pipe, but we currently do
it through an exposed port and a websocket.

All of this is to say that all browsers that implement the CDP protocol _should_
just work out of the box with Astral. This includes Firefox, though I haven't
tested it. I believe Webkit-backed browsers do not work yet, though we'll see
about that in the future.
