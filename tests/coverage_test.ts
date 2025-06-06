import { assert } from "@std/assert/assert";
import { emptyDir, ensureDir } from "@std/fs";
import { fromFileUrl, toFileUrl } from "@std/path";
import { assertEquals } from "@std/assert/equals";

Deno.test("Page.evaluate coverage", async () => {
  // TODO(@lowlighter): find how to compute this variable
  const DENO_CACHE_DIR = "/home/codespace/.cache/deno"; 
  const DENO_COVERAGE_DIR = fromFileUrl(import.meta.resolve("./coverage_test"));

  const testFile = fromFileUrl(
    import.meta.resolve("./fixtures/coverage/test_script.ts"),
  );
  const scriptFile = fromFileUrl(
    import.meta.resolve("./fixtures/coverage/script.ts"),
  );
  const expectFile = fromFileUrl(
    import.meta.resolve("./fixtures/coverage/expect.out"),
  );

  await ensureDir(DENO_COVERAGE_DIR);
  await emptyDir(DENO_COVERAGE_DIR);

  // Run deno test --coverage
  const denoTest = new Deno.Command(Deno.execPath(), {
    args: [
      "test",
      "--allow-all",
      `--coverage=${DENO_COVERAGE_DIR}`,
      testFile,
    ],
    env: {
      DENO_CACHE_DIR,
    },
  });
  let output = await denoTest.output();
  assert(output.success);

  // Run deno coverage
  const denoCoverage = new Deno.Command(Deno.execPath(), {
    args: [
      "coverage",
      "--detailed",
      `--include=${scriptFile}`,
      DENO_COVERAGE_DIR,
    ],
    env: {
      NO_COLOR: "true",
    },
  });
  output = await denoCoverage.output();
  assert(output.success);

  // Check that coverage files matches
  assertEquals(
    Deno.readTextFileSync(expectFile).replace(
      "[import.meta.url]",
      toFileUrl(scriptFile).href,
    ).trim(),
    new TextDecoder().decode(output.stdout).trim(),
  );
});
