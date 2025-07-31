// deno-lint-ignore-file no-constant-condition
import { launch } from "../../../../mod.ts";
import { serverUrl } from "../../../utils/helpers.ts";

await using browser = await launch();
await using page = await browser.newPage(serverUrl, {
  coverage: true,
});

await page.evaluate(async function foo() {
  console.log("covered");
  console.log("covered");
  if (false) {
    console.log("not covered");
  }
  if (true) {
    console.log("covered");
  }
  await Promise.resolve();
});
