import { getDefaultCachePath, launch } from "../mod.ts";
import { assertStrictEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path/from-file-url";
import { assert } from "@std/assert/assert";

const cache = getDefaultCachePath();

const permissions = {
  read: [cache],
  write: true,
  run: true,
  env: true,
  import: true,
};
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
    import: ["127.0.0.1"],
  },
}, async (t) => {
  await using server = Deno.serve((request) => {
    switch (new URL(request.url).pathname) {
      case "/redirect.js":
        return new Response(
          `location = "http://127.0.0.1:${server.addr.port}/ok"`,
          { status: 200, headers: { "content-type": "text/javascript" } },
        );
      case "/ok":
        return new Response("<!DOCTYPE html><body>IMPORT_SUCCESS</body>", {
          status: 202,
          headers: { "content-type": "text/html" },
        });
      default:
        return new Response("Not Found", { status: 404 });
    }
  }) as Deno.HttpServer<Deno.NetAddr>;
  const importPermissionTestUrl =
    `data:text/html,<!DOCTYPE html><body>IMPORT_PENDING<script src="http://127.0.0.1:${server.addr.port}/redirect.js"></script></body>`;
  for (
    const { url, code, sandbox, includes } of [
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
      {
        url: importPermissionTestUrl,
        code: 202,
        sandbox: { permissions: "inherit" as const },
        includes: "IMPORT_SUCCESS",
      },
      {
        url: importPermissionTestUrl,
        code: 202,
        sandbox: { permissions: { import: true } },
        includes: "IMPORT_SUCCESS",
      },
      {
        url: importPermissionTestUrl,
        code: 202,
        sandbox: { permissions: { import: undefined } },
        includes: "IMPORT_SUCCESS", // inherit from parent context
      },
      {
        url: importPermissionTestUrl,
        code: 202,
        sandbox: { permissions: { import: ["127.0.0.1"] } },
        includes: "IMPORT_SUCCESS",
      },
      {
        url: importPermissionTestUrl,
        code: 200,
        sandbox: { permissions: "none" as const },
        includes: "IMPORT_PENDING",
      },
      {
        url: importPermissionTestUrl,
        code: 200,
        sandbox: { permissions: { import: false } },
        includes: "IMPORT_PENDING",
      },
      {
        url: importPermissionTestUrl,
        code: 200,
        sandbox: { permissions: { import: [] } },
        includes: "IMPORT_PENDING",
      },
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
        if (includes) {
          assertStringIncludes(await page.content(), includes);
        }
      },
    );
  }
});
