import { assert } from "@std/assert/assert";
import { emptyDir, ensureDir } from "@std/fs";
import { fromFileUrl, toFileUrl } from "@std/path";
import { assertEquals } from "@std/assert/equals";

const DEBUG = true;

// CI: On windows, the DENO_DIR points to C:/ but the repository is mapped on D:/
//     which cause resolution issues, skipping support for now
Deno.test(
  "Page.evaluate coverage",
  { ignore: Deno.build.os === "windows" },
  async (t) => {
    const DENO_COVERAGE_DIR = fromFileUrl(
      import.meta.resolve("./coverage_test"),
    );
    const decoder = new TextDecoder();

    for (
      const testcase of [
        "anon",
        //"anon-async",
        "class-method",
        //"named"
        //"named-async"
      ]
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
