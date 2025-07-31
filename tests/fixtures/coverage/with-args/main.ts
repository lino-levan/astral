import { launch } from "../../../../mod.ts";
import { serverUrl } from "../../../utils/helpers.ts";

await using browser = await launch();
await using page = await browser.newPage(serverUrl, {
  coverage: true,
});

await page.evaluate(function (foo: boolean) {
  console.log("covered");
  console.log("covered");
  if (!foo) {
    console.log("not covered");
  }
  if (foo) {
    console.log("covered");
  }
}, { args: [true] });

await page.evaluate((foo: boolean) => {
  console.log("covered");
  console.log("covered");
  if (!foo) {
    console.log("not covered");
  }
  if (foo) {
    console.log("covered");
  }
}, { args: [true] });
