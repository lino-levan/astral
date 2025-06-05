import { getDefaultCachePath, InterceptorError, launch } from "../mod.ts";
import { assertEquals, assertMatch, assertStrictEquals } from "@std/assert";

const cache = getDefaultCachePath();

const permissions = { read: [cache], write: true, run: true, env: true };
const status =
  "window.performance.getEntriesByType('navigation')[0].responseStatus";

Deno.test("HTTP interceptor (fulfill request)", {
  permissions: { ...permissions, net: ["127.0.0.1"] },
}, async () => {
  await using browser = await launch();
  await using page = await browser.newPage("http://example.com", {
    interceptor() {
      return new Response(
        "<!DOCTYPE html><html><head><title>Intercepted request!</title></head><body></body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      );
    },
  });
  assertStrictEquals(await page.evaluate(status), 200);
  assertMatch(await page.evaluate("document.title"), /Intercepted request!/i);
});

Deno.test("HTTP interceptor (continue request)", {
  permissions: { ...permissions, net: ["127.0.0.1", "example.com"] },
}, async () => {
  await using browser = await launch();
  await using page = await browser.newPage("http://example.com", {
    interceptor() {
      return null;
    },
  });
  assertStrictEquals(await page.evaluate(status), 200);
  assertMatch(await page.evaluate("document.title"), /Example Domain/i);
});

Deno.test("HTTP interceptor (fail request)", {
  permissions: { ...permissions, net: ["127.0.0.1", "example.com"] },
}, async () => {
  await using browser = await launch();
  await using page = await browser.newPage("http://example.com", {
    interceptor(request) {
      if (new URL(request.url).pathname === "/foo") {
        throw new InterceptorError();
      }
    },
  });
  assertStrictEquals(await page.evaluate(status), 200);
  const response = await page.evaluate(() =>
    fetch("/foo").catch((error) => error.message)
  );
  assertStrictEquals(response, "Failed to fetch");
});

Deno.test("HTTP interceptor, request body interception", {
  permissions: { ...permissions, net: ["127.0.0.1", "example.com"] },
}, async () => {
  await using browser = await launch();
  await using page = await browser.newPage("http://example.com", {
    async interceptor(request) {
      if (request.method === "POST") {
        assertEquals(await request.json(), { foo: "bar" });
        return new Response("foobar", { status: 418 });
      }
      return null;
    },
  });
  assertStrictEquals(await page.evaluate(status), 200);
  let response = await page.evaluate(() =>
    fetch("/", { method: "POST", body: '{"foo":"bar"}' }).then(async (r) => ({
      status: r.status,
      body: await r.text(),
    }))
  );
  assertEquals(response.status, 418);
  assertEquals(response.body, "foobar");
  response = await page.evaluate(() =>
    fetch("/").then(async (r) => ({ status: r.status, body: await r.text() }))
  );
  assertEquals(response.status, 200);
  assertMatch(response.body, /Example Domain/i);
});
