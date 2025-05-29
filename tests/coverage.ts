import { launch } from "../mod.ts";

await using browser = await launch();
await using page = await browser.newPage("http://example.com", {
  coverageDir: Deno.env.get("DENO_COVERAGE_DIR"),
});

await page.evaluate(() => {
  console.log("foo");
  console.log("bar");
});
