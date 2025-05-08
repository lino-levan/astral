import { launch } from "../mod.ts";

const browser = await launch();

addEventListener("unload", async () => {
  await browser.close();
});

Deno.test("Opening and closing a page without closing the browser isn't leak", async () => {
  await using _ = await browser.newPage();
});
