/// <reference lib="dom" />

import { assertEquals, assertRejects } from "@std/assert";

import { launch } from "../mod.ts";

Deno.test("Testing element evaluate", async () => {
  // Launch browser
  const browser = await launch();

  // Open the webpage
  const page = await browser.newPage("http://example.com");

  const element = (await page.$("div"))!;

  // passing arguments to evaluate
  const result = await element.evaluate(
    (element: HTMLDivElement, key, value) => {
      element.setAttribute(key, value);
      return element.getAttribute(key);
    },
    {
      args: ["astral", "test"],
    },
  );

  assertEquals(result, "test");

  const string_function = await element.evaluate('()=>{return"test"}');

  assertEquals(string_function, "test");

  const result_undefined = await element.evaluate(() => {
    return undefined;
  });

  assertEquals(result_undefined, undefined);

  const result_null = await element.evaluate(() => {
    return null;
  });

  assertEquals(result_null, null);

  const result_number = await element.evaluate(() => {
    return 10.5123;
  });

  assertEquals(result_number, 10.5123);

  const result_nan = await element.evaluate(() => {
    return NaN;
  });

  assertEquals(result_nan, NaN);

  const result_boolean = await element.evaluate(() => {
    return true;
  });

  assertEquals(result_boolean, true);

  const result_void = await element.evaluate(() => {
    return;
  });

  assertEquals(result_void, undefined);

  const input_arguments = await element.evaluate(
    (
      _,
      _null,
      _undefined,
      _number,
      _string,
      _nan,
      _object: { test: boolean },
      _array: [number, null],
    ) => {
      return [
        _null === null,
        _undefined === undefined,
        typeof _number == "number",
        typeof _string == "string",
        Number.isNaN(_nan),
        _object.test === true,
        _array[0] === 1 && _array[1] === null,
      ];
    },
    {
      args: [
        null,
        undefined,
        1,
        "",
        NaN,
        { test: true },
        [1, null],
      ],
    },
  );

  assertEquals(input_arguments, [true, true, true, true, true, true, true]);

  await assertRejects(
    async () => {
      await element.evaluate(
        () => {
          throw new Error("test");
        },
      );
    },
  );

  // Close browser
  await browser.close();
});
