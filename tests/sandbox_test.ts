import { getDefaultCachePath, launch } from "../mod.ts";
import { serverHost, serverUrl } from "./utils/helpers.ts";
import { assertStrictEquals } from "@std/assert";
import { fromFileUrl } from "@std/path/from-file-url";
import { assert } from "@std/assert/assert";

const cache = getDefaultCachePath();

const permissions = { read: [cache], write: true, run: true, env: true };
const status =
  "window.performance.getEntriesByType('navigation')[0].responseStatus";

Deno.test("Sandbox fulfill granted net permissions", {
  permissions: { ...permissions, net: ["127.0.0.1", serverHost] },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage(serverUrl, { sandbox: true });
  assertStrictEquals(await page.evaluate(status), 200);
  await browser.close();
});

Deno.test("Sandbox reject denied net permissions", {
  permissions: { ...permissions, net: ["127.0.0.1"] },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage(serverUrl, { sandbox: true });
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
  permissions: { ...permissions, net: ["127.0.0.1", serverHost] },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage(serverUrl, { sandbox: true });
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
        url: serverUrl,
        code: 200,
        sandbox: { permissions: "inherit" as const },
      },
      {
        url: serverUrl,
        code: 200,
        sandbox: { permissions: { net: "inherit" as const } },
      },
      {
        url: serverUrl,
        code: 200,
        sandbox: { permissions: { net: true } },
      },
      {
        url: serverUrl,
        code: 200,
        sandbox: { permissions: { net: undefined } },
      },
      {
        url: serverUrl,
        code: 200,
        sandbox: { permissions: { net: [serverHost] } },
      },
      {
        url: serverUrl,
        code: 0,
        sandbox: { permissions: "none" as const },
      },
      {
        url: serverUrl,
        code: 0,
        sandbox: { permissions: { net: false } },
      },
      {
        url: serverUrl,
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
