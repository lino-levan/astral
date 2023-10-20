import { launch } from "../mod.ts";
import { assertStrictEquals } from "https://deno.land/std@0.201.0/assert/assert_strict_equals.ts";
import { assert } from "https://deno.land/std@0.201.0/assert/assert.ts";

const permissions = { read: true, write: true, run: true, env: true };
const status =
  "window.performance.getEntriesByType('navigation')[0].responseStatus";

Deno.test("Sandbox allow granted permissions", {
  permissions: { ...permissions, net: ["127.0.0.1", "example.com"] },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage("http://example.com", { sandbox: true });
  assertStrictEquals(await page.evaluate(status), 200);
  await browser.close();
});

Deno.test("Sandbox refuse denied permissions", {
  permissions: { ...permissions, net: ["127.0.0.1"] },
}, async () => {
  const browser = await launch();
  const page = await browser.newPage("http://example.com", { sandbox: true });
  assertStrictEquals(await page.evaluate(status), 0);
  await browser.close();
});

Deno.test("Sandbox trying to redirect or fetch with denied permissions fails", {
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
