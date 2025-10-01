/// <reference lib="dom" />
import { assertEquals, assertExists } from "@std/assert";
import { launch } from "../mod.ts";
import * as path from "@std/path";

const dirname = import.meta.dirname!;

async function serveFixture(name: string) {
  const file = path.join(dirname, name);

  // Ensure we don't traverse outside of intended dir
  if (path.relative(path.join(dirname, "fixtures"), file).startsWith(".")) {
    throw new Error(`fixture: "${name}" resolved outside fixture directory`);
  }

  const html = await Deno.readFile(file);

  const server = Deno.serve({ port: 0 }, () => {
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  });

  return {
    address: `http://localhost:${server.addr.port}`,
    async [Symbol.asyncDispose]() {
      await server.shutdown();
      await server.finished;
    },
  };
}

Deno.test("Locator - click()", async () => {
  await using server = await serveFixture("fixtures/counter.html");

  const browser = await launch();
  const page = await browser.newPage(server.address);

  await page.waitForNetworkIdle();
  await page.locator("button").click();

  const res = await page.evaluate(() => {
    return document.querySelector("output")!.textContent;
  });

  assertEquals(res, "1");

  await page.close();
  await browser.close();
});

Deno.test("Locator - wait()", async () => {
  await using server = await serveFixture("fixtures/wait_for_element.html");

  const browser = await launch();
  const page = await browser.newPage(server.address);

  await page.waitForNetworkIdle();
  await page.locator("h1").wait();

  const res = await page.evaluate(() => {
    return document.querySelector("h1") !== null;
  });

  assertEquals(res, true);

  await page.close();
  await browser.close();
});

Deno.test("Locator - evaluate()", async () => {
  await using server = await serveFixture("fixtures/evaluate.html");

  const browser = await launch();
  const page = await browser.newPage(server.address);
  await page.waitForNetworkIdle();

  const text = await page.locator<HTMLElement>("#target").evaluate((el) =>
    el.textContent
  );
  assertEquals(text, "hello");

  await page.close();
  await browser.close();
});

Deno.test("Locator - fill()", async () => {
  await using server = await serveFixture("fixtures/fill.html");

  const browser = await launch();
  const page = await browser.newPage(server.address);
  await page.waitForNetworkIdle();

  await page.locator("#target").fill("hello");

  const text = await page.locator<HTMLInputElement>("#target").evaluate((el) =>
    el.value
  );
  assertEquals(text, "hello");

  await page.close();
  await browser.close();
});

Deno.test("Locator - locator()", async () => {
  await using server = await serveFixture("fixtures/wait_for_element.html");

  await using browser = await launch();
  await using page = await browser.newPage(server.address);
  const targetLocator = page.locator<HTMLDivElement>("#target");

  const h1Locator = targetLocator.locator<HTMLHeadingElement>("h1");

  const res = await h1Locator.evaluate((el) => {
    return document.querySelector("h1") === el;
  });
  assertEquals(res, true);
});

Deno.test("Locator - $()", async () => {
  await using server = await serveFixture("fixtures/wait_for_element.html");

  await using browser = await launch();
  await using page = await browser.newPage(server.address);
  const targetLocator = page.locator<HTMLDivElement>("#target");

  const h1El = await targetLocator.$("h1");
  assertExists(h1El);

  const res = await h1El.evaluate((el) => {
    return document.querySelector("h1") === el;
  });
  assertEquals(res, true);
});

Deno.test("Locator - $$()", async () => {
  await using server = await serveFixture("fixtures/wait_for_element.html");

  await using browser = await launch();
  await using page = await browser.newPage(server.address);
  const targetLocator = page.locator<HTMLDivElement>("#target");

  const children = await targetLocator.$$("h1");
  assertEquals(children.length, 1);

  const res = await children[0].evaluate((el) => {
    return document.querySelector("h1") === el;
  });
  assertEquals(res, true);
});
