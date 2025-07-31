// deno-lint-ignore-file no-constant-condition
import { launch } from "../../../../mod.ts";
import { serverUrl } from "../../../utils/helpers.ts";

await using browser = await launch();
await using page = await browser.newPage(serverUrl, {
  coverage: true,
});

for (let i = 0; i < 1; i++) {
  await page.evaluate(() => {
    console.log("covered");
    console.log("covered");
    if (false) {
      console.log("not covered");
    }
    if (true) {
      console.log("covered");
    }
  });
}

do {
  await page.evaluate(function () {
    if (true) {
      console.log("covered");
    }
    if (false) {
      console.log("not covered");
    }
    console.log("covered");
    console.log("covered");
  });
} while (false);
