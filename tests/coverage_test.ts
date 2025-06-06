import { assert } from "@std/assert/assert";
import { emptyDir, ensureDir } from "@std/fs";
import { fromFileUrl, toFileUrl } from "@std/path";
import { assertEquals } from "@std/assert/equals";

// Toggle this variable print the stdout for easier debugging
const DEBUG = true;

// To add a new coverage test case:
//
// 1. Create a new folder in tests/fixtures/coverage
// 2. Create a `main.ts` file containing the code to cover
// 3. Create a `test_main.ts` file importing the `main.ts` file
//    It is important to NOT name it `main_test.ts`, or any file that
//    would be automatically caught by `deno test`, to ensure results
//    are not tampered with external ones
// 4. Create a `expect.out` file containing the expected `deno coverage` stdout,
//    and replace the file url in it by `[import.meta.url]`
//    This special value will automatically be replaced by the correct url,
//    as the path may change depending on where the code is being tested
// 5. Register the folder name in array of test cases below
//
// That'it!

// CI: On windows/macos seems that deno cache dir is resolved incorrectly
//     which makes the coverage functions not able to find emitted files
Deno.test(
  "Page.evaluate coverage",
  // { ignore: Deno.build.os !== "linux" },
  async (t) => {
    const DENO_COVERAGE_DIR = fromFileUrl(
      import.meta.resolve("./coverage_test"),
    );
    const decoder = new TextDecoder();

    for (
      const testcase of [
        "anon",
        "anon-async",
        "named",
        "named-async",
        "named-ref",
        "arrow",
        "arrow-async",
        "class-method",
        "class-getter",
        "misc_1",
        "misc_2",
        "unsupported_coverage",
        "with-args",
      ] as const
    ) {
      await t.step(testcase, async () => {
        await ensureDir(DENO_COVERAGE_DIR);
        await emptyDir(DENO_COVERAGE_DIR);

        const testFile = fromFileUrl(
          import.meta.resolve(`./fixtures/coverage/${testcase}/test_main.ts`),
        );
        const scriptFile = fromFileUrl(
          import.meta.resolve(`./fixtures/coverage/${testcase}/main.ts`),
        );
        const expectFile = fromFileUrl(
          import.meta.resolve(`./fixtures/coverage/${testcase}/expect.out`),
        );

        // Run deno test --coverage
        const denoTest = new Deno.Command(Deno.execPath(), {
          args: [
            "test",
            "--allow-all",
            `--coverage=${DENO_COVERAGE_DIR}`,
            testFile,
          ],
          env: {
            NO_COLOR: "true",
          },
        });
        let output = await denoTest.output();
        if (DEBUG) {
          console.log(
            decoder.decode(output.stdout).replace(
              /ok \| 0 passed \| 0 failed[\s\S]+/,
              "",
            ),
          );
          console.log(decoder.decode(output.stderr));
        }
        assert(output.success, "deno test --coverage");

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
        assert(output.success, "deno coverage");

        // Check that coverage files matches
        const stdout = decoder.decode(output.stdout).trim();
        if (DEBUG) {
          console.log(stdout);
        }
        assertEquals(
          stdout,
          Deno.readTextFileSync(expectFile).replace(
            "[import.meta.url]",
            toFileUrl(scriptFile).href,
          ).trim(),
        );
      });
    }
  },
);
