import { launch } from "../../../../mod.ts";
import { serverUrl } from "../../../utils/helpers.ts";

await using browser = await launch();
await using page = await browser.newPage(serverUrl, {
  coverage: true,
});

// The following will appear as covered entirely
// because it is passed as a string value
await page.evaluate(`
  console.log("covered");
  console.log("covered");
  if (false) {
    console.log("not covered");
  }
  if (true) {
    console.log("covered");
  }
`);
