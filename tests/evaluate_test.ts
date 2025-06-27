/// <reference lib="dom" />

import { assertEquals } from "@std/assert";
import { assertSnapshot } from "@std/testing/snapshot";

import { launch } from "../mod.ts";

Deno.test("Testing evaluate", async (t) => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("http://example.com");

  // passing arguments to evaluate
  const result = await page.evaluate(
    (x, y) => {
      return x + y;
    },
    {
      args: ["string", "concat"] as const,
    },
  );
  assertEquals(result, "stringconcat");

  // innerHTML / innerText
  const element = (await page.$("div"))!;
  assertSnapshot(t, await element.innerHTML());
  assertSnapshot(t, await element.innerText());

  // Resize the page
  const viewportSize = { width: 1000, height: 1000 };
  await page.setViewportSize(viewportSize);
  const pageSize = await page.evaluate(() => {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
  });
  assertEquals(pageSize, viewportSize);

  // Close browser
  await browser.close();
});

Deno.test(
  "Testing evaluate with primative / simple object values",
  async () => {
    // Launch browser
    await using browser = await launch();

    // Open the webpage
    await using page = await browser.newPage("");

    assertEquals(
      await page.evaluate(() => {
        return undefined;
      }),
      undefined,
    );
    assertEquals(
      await page.evaluate(() => {
        return null;
      }),
      null,
    );
    assertEquals(
      await page.evaluate(() => {
        return 1;
      }),
      1,
    );
    assertEquals(
      await page.evaluate(() => {
        return true;
      }),
      true,
    );
    assertEquals(
      await page.evaluate(() => {
        return "hello world";
      }),
      "hello world",
    );
    assertEquals(
      await page.evaluate(() => {
        return 190n;
      }),
      190n,
    );
    assertEquals(
      await page.evaluate(() => {
        return [
          1,
          190n,
          true,
          null,
          undefined,
          "hi",
          { x: 0, y: 30, z: [1, null, 190n, { max: 10 }] },
        ];
      }),
      [
        1,
        190n,
        true,
        null,
        undefined,
        "hi",
        { x: 0, y: 30, z: [1, null, 190n, { max: 10 }] },
      ],
    );
  },
);

Deno.test("Testing evaluate with top-level typedarray", async () => {
  // Launch browser
  await using browser = await launch();

  // Open the webpage
  await using page = await browser.newPage("");

  const typedArray = await page.evaluate(() => {
    return new Uint8Array([0, 1, 2, 3, 4, 5]);
  });
  assertEquals(typedArray, new Uint8Array([0, 1, 2, 3, 4, 5]));
});
