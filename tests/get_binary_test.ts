import { assertMatch, assertRejects, assertStringIncludes } from "@std/assert";
import { assert } from "@std/assert/assert";
import { resolve } from "@std/path/resolve";
import { cleanCache, getBinary, launch } from "../mod.ts";

const tempDir = Deno.env.get("TMPDIR") || Deno.env.get("TMP") ||
  Deno.env.get("TEMP") || "/tmp";

// Tests should be performed in directory different from others tests as cache is cleaned during this one
Deno.env.set("ASTRAL_QUIET_INSTALL", "true");
const cache = await Deno.makeTempDir({ prefix: "astral_test_get_binary" });
const permissions = {
  write: [
    cache,
    // Chromium lock on Linux
    `${Deno.env.get("HOME")}/.config/chromium/SingletonLock`,
    // Chromium lock on MacOS
    `${
      Deno.env.get("HOME")
    }/Library/Application Support/Chromium/SingletonLock`,
    // OS temporary directory, used by chromium profile
    tempDir,
  ],
  env: ["CI", "ASTRAL_QUIET_INSTALL"],
  read: [cache],
  net: true,
  run: true,
};

Deno.test("Test download", { permissions }, async () => {
  // Download browser
  await cleanCache({ cache });
  const path = await getBinary("chrome", { cache });
  assertStringIncludes(path, cache);

  // Ensure browser is executable
  // Note: it seems that on Windows the --version flag does not exists and spawn a
  //   browser instance instead. The next test ensure that everything is working
  //   properly anyways
  if (Deno.build.os !== "windows") {
    const command = new Deno.Command(path, {
      args: [
        "--version",
      ],
    });
    const { success, stdout } = await command.output();
    assert(success);
    assertMatch(new TextDecoder().decode(stdout), /Google Chrome/i);
  }

  // Ensure browser is capable of loading pages
  const browser = await launch({ path });
  const page = await browser.newPage("http://example.com");
  await page.waitForSelector("h1");
  await browser.close();
});

Deno.test("Test download after failure", { permissions }, async () => {
  await cleanCache({ cache });
  const testCache = resolve(cache, "test_failure");

  // Test download failure (create a file instead of directory as the cache to force a write error)
  await Deno.mkdir(cache, { recursive: true });
  await Deno.writeTextFile(testCache, "");
  await assertRejects(
    () => getBinary("chrome", { cache: testCache }),
    "Not a directory",
  );

  // Retry download
  await Deno.remove(testCache, { recursive: true });
  assert(await getBinary("chrome", { cache: testCache }));
});

Deno.test("Clean cache after tests", async () => {
  await cleanCache({ cache });
});
