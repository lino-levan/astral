// deno-lint-ignore-file no-constant-condition
import { launch } from "../../../../mod.ts";

await using browser = await launch();
await using page = await browser.newPage("http://example.com", {
  coverage: true,
});

// deno-lint-ignore require-await
await page.evaluate(async function () {
  console.log("covered");
  console.log("covered");
  if (false) {
    console.log("not covered");
  }
  if (true) {
    console.log("covered");
  }
});
