// deno-lint-ignore-file no-constant-condition
import { launch } from "../../../../mod.ts";

class Foo {
  get bar() {
    return (async () => {
      await using browser = await launch();
      await using page = await browser.newPage("http://example.com", {
        coverage: true,
      });

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
    })();
  }
}

await new Foo().bar;
