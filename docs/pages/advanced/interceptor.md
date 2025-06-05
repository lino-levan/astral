---
title: HTTP interceptor
description: Capturing requests and customizing responses
index: 5
---

## Using the HTTP interceptor

You can define a `interceptor` that lets you override response from intercepted
requests. This is very useful for testing environment where you need to use
fixtures rather than actual performing network requests on an actual domain, or
to simulate network errors, etc.

The interceptor will receive a `Request` object along with an info record which
contains a `resourceType: Network_ResourceType`, which can be used to filter
requests by type (e.g. `Document`, `Stylesheet`, `Image`, etc.).

The control flow of an intercepted request depends on the return of the
`interceptor` handler.

- If `null`, `undefined` or a void return is returned, the request will continue
  its processing
- If a `Response` object is sent back, the request will be fulfilled with the
  provided return
- If an `InterceptorError` is thrown, the request will be failed with the
  provided reason

Note that the HTTP interceptor is executed before the sandbox permissions
checks, meaning that any intercepted request is not affected by permission
restrictions.

## Code

```ts
await using browser = await launch();
await using page = await browser.newPage("http://example.com", {
  interceptor(request: Request) {
    if (new URL(request.url).pathname === "/blocked") {
      throw new InterceptorError("BlockedByClient");
    }

    return new Response(
      "<!DOCTYPE html><html><head><title>Intercepted request!</title></head><body></body></html>",
      { status: 200, headers: { "content-type": "text/html" } },
    );
  },
});
```
