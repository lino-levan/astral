import { getDefaultCachePath, launch } from "../mod.ts";
import { assertEquals, assertMatch, assertStrictEquals } from "@std/assert";
import { fromFileUrl } from "@std/path/from-file-url";
import { assert } from "@std/assert/assert";

const cache = getDefaultCachePath();

const permissions = { read: [cache], write: true, run: true, env: true };
const status =
  "window.performance.getEntriesByType('navigation')[0].responseStatus";

Deno.test("Sandbox fulfill granted net permissions", {
  permissions: { ...permissions, net: ["127.0.0.1", "example.com"] },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage("http://example.com", { sandbox: true });
  assertStrictEquals(await page.evaluate(status), 200);
  await browser.close();
});

Deno.test("Sandbox reject denied net permissions", {
  permissions: { ...permissions, net: ["127.0.0.1"] },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage("http://example.com", { sandbox: true });
  assertStrictEquals(await page.evaluate(status), 0);
  await browser.close();
});

Deno.test("Sandbox fulfill granted read permissions", {
  permissions: {
    ...permissions,
    read: [...permissions.read, fromFileUrl(import.meta.url)],
    net: ["127.0.0.1"],
  },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage(import.meta.url, { sandbox: true });
  assertStrictEquals(await page.evaluate(status), 200);
  await browser.close();
});

Deno.test("Sandbox reject denied read permissions", {
  permissions: { ...permissions, net: ["127.0.0.1"] },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage(import.meta.url, { sandbox: true });
  assertStrictEquals(await page.evaluate(status), 0);
  await browser.close();
});

Deno.test("Sandbox cannot be escaped with redirects or scripts", {
  permissions: { ...permissions, net: ["127.0.0.1", "example.com"] },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage("http://example.com", { sandbox: true });
  assertStrictEquals(await page.evaluate(status), 200);
  await page.evaluate("location = 'http://google.com'");
  assertStrictEquals(await page.evaluate(status), 0);
  assert(
    await page.evaluate(
      "fetch('https://deno.land').then(() => false).catch(() => true)",
    ),
  );
  await browser.close();
});

Deno.test("Sandbox supports granular permissions", {
  permissions: {
    ...permissions,
    read: [...permissions.read, fromFileUrl(import.meta.url)],
    net: true,
  },
}, async (t) => {
  for (
    const { url, code, sandbox } of [
      {
        url: "http://example.com",
        code: 200,
        sandbox: { permissions: "inherit" as const },
      },
      {
        url: "http://example.com",
        code: 200,
        sandbox: { permissions: { net: "inherit" as const } },
      },
      {
        url: "http://example.com",
        code: 200,
        sandbox: { permissions: { net: true } },
      },
      {
        url: "http://example.com",
        code: 200,
        sandbox: { permissions: { net: undefined } },
      },
      {
        url: "http://example.com",
        code: 200,
        sandbox: { permissions: { net: ["example.com"] } },
      },
      {
        url: "http://example.com",
        code: 0,
        sandbox: { permissions: "none" as const },
      },
      {
        url: "http://example.com",
        code: 0,
        sandbox: { permissions: { net: false } },
      },
      {
        url: "http://example.com",
        code: 0,
        sandbox: { permissions: { net: [] } },
      },
      {
        url: import.meta.url,
        code: 200,
        sandbox: { permissions: "inherit" as const },
      },
      {
        url: import.meta.url,
        code: 200,
        sandbox: { permissions: { read: "inherit" as const } },
      },
      {
        url: import.meta.url,
        code: 200,
        sandbox: { permissions: { read: true } },
      },
      {
        url: import.meta.url,
        code: 200,
        sandbox: { permissions: { read: undefined } },
      },
      {
        url: import.meta.url,
        code: 200,
        sandbox: { permissions: { read: [fromFileUrl(import.meta.url)] } },
      },
      {
        url: import.meta.url,
        code: 0,
        sandbox: { permissions: "none" as const },
      },
      {
        url: import.meta.url,
        code: 0,
        sandbox: { permissions: { read: false } },
      },
      { url: import.meta.url, code: 0, sandbox: { permissions: { read: [] } } },
    ]
  ) {
    await t.step(
      `${new URL(url).protocol} with permissions ${
        JSON.stringify(sandbox.permissions)
      }`,
      async () => {
        await using browser = await launch();
        await using page = await browser.newPage(url, { sandbox });
        assertStrictEquals(await page.evaluate(status), code);
      },
    );
  }
});

Deno.test("Sandbox with HTTP interceptor", {
  permissions: { ...permissions, net: ["127.0.0.1"] },
}, async () => {
  await using browser = await launch();
  await using page = await browser.newPage("http://example.com", {
    sandbox: true,
    sandboxInterceptor() {
      return new Response(
        "<!DOCTYPE html><html><head><title>Intercepted request!</title></head><body></body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      );
    },
  });
  assertStrictEquals(await page.evaluate(status), 200);
  assertMatch(await page.evaluate("document.title"), /Intercepted request!/i);
});

Deno.test("Sandbox with conditional HTTP interceptor and request body", {
  permissions: { ...permissions, net: ["127.0.0.1", "example.com"] },
}, async () => {
  await using browser = await launch();
  await using page = await browser.newPage("http://example.com", {
    sandbox: true,
    async sandboxInterceptor(request) {
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
