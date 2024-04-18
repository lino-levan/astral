import { getDefaultCachePath, launch } from "../mod.ts";
import { assertStrictEquals } from "@std/assert/assert-strict-equals";
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
  // TODO(lino-levan): Fix the sanitizer to allow this test to pass
  sanitizeOps: false,
  sanitizeResources: false,
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
