import * as sourceMap from "source-map";
import { toFileUrl } from "@std/path/to-file-url";
import { join } from "@std/path/join";
import { exists } from "@std/fs/exists";
import { ensureDir } from "@std/fs/ensure-dir";
import type { Celestial } from "../bindings/celestial.ts";
import { DenoDir } from "@deno/cache-dir";
import { fromFileUrl } from "@std/path";

/** V8 CallSite (subset). */
type CallSite = {
  getFileName: () => string;
  getFunctionName: () => string | null;
  getLineNumber: () => number;
  getColumnNumber: () => number;
};

/**
 * This function uses the internal V8 stacktrace engine to get the caller source file.
 * We remove all `ext:` files (deno internals), and also this file itself from the stacktrace.
 */
function getCaller() {
  const Trace = Error as unknown as {
    prepareStackTrace: (error: Error, stack: CallSite[]) => unknown;
  };
  const _ = Trace.prepareStackTrace;
  Trace.prepareStackTrace = (_, stack) => stack;
  const { stack } = new Error();
  Trace.prepareStackTrace = _;
  const callers = (stack as unknown as CallSite[])
    .map((callsite) => ({
      filename: callsite.getFileName(),
      line: callsite.getLineNumber(),
      column: callsite.getColumnNumber(),
    }))
    .filter((callsite) =>
      !callsite.filename.startsWith("ext:") &&
      callsite.filename !== import.meta.filename
    )
    .map((callsite) => ({
      ...callsite,
      url: toFileUrl(callsite.filename).href,
    }));
  return callers;
}

/**
 * This function post-process the coverage results collected by `Profiler.takePreciseCoverage`
 * to make them match with the original source files executed by deno, allowing an unified
 * `deno coverage` experience with code executed within the browser V8 engine.
 */
export async function processPageEvaluateCoverage(
  result: Awaited<
    ReturnType<Celestial["Profiler"]["takePreciseCoverage"]>
  >["result"],
) {
  try {
    const cacheDir = new DenoDir().root;
    const coverageDir = Deno.env.get("DENO_COVERAGE_DIR");
    // TODO: we could remove this check in next versions of Deno,
    // as it'll always be populated when coverage is enabled
    // https://github.com/denoland/deno/pull/29363
    if (!coverageDir) {
      throw new TypeError(
        "Enabling coverage requires `DENO_COVERAGE_DIR` environment variable to be set",
      );
    }

    // Get the caller file
    // Caller is at `[1]` since `[0]` will be `src/page.ts`
    const [_, caller] = getCaller();

    // Read emitted content from deno cache and extract source mapping url
    const emittedPath = join(cacheDir, "/gen/file", `${caller.filename}.js`);
    if (!await exists(emittedPath)) {
      throw new TypeError(`Could not find emitted file at: ${emittedPath}`);
    }
    const emittedContent = await Deno.readTextFile(emittedPath);
    const sourceMapContent = emittedContent.match(
      /^\/\/# sourceMappingURL=data:application\/json;base64,(?<sourceMap>[A-Za-z0-9+/=]+)$/m,
    )?.groups?.sourceMap;
    if (!sourceMapContent) {
      throw new TypeError(
        `Failed to extract sourceMappingURL at: ${emittedPath}`,
      );
    }

    // Map back generated position from original position
    const consumer = await new sourceMap.SourceMapConsumer(
      atob(sourceMapContent),
    );
    const { line, column } = consumer.generatedPositionFor({
      source: caller.url,
      line: caller.line - 1,
      column: caller.column - 1,
    });
    if ((line === null) || (column === null)) {
      throw new TypeError(
        `Failed to map back generated position for: ${caller.url}`,
      );
    }

    // Compute the range offset
    // ======================== Why this works/does not work ?
    const originalContent = await Deno.readTextFile(fromFileUrl(caller.url));
    const originalMappedContent = originalContent.split("\n").slice(
      caller.line - 1,
    );
    const mappedContent = emittedContent.split("\n").slice(line);
    const offset = emittedContent.replace(mappedContent.join("\n"), "")
      .length +
      commonPrefix(mappedContent[0], originalMappedContent[0]).length - 3;
    console.log({
      caller,
      LEAST_UPPER_BOUND: consumer.generatedPositionFor({
        source: caller.url,
        line: caller.line - 1,
        column: caller.column - 1,
        bias: sourceMap.SourceMapConsumer.LEAST_UPPER_BOUND,
      }),
      GREATEST_LOWER_BOUND: consumer.generatedPositionFor({
        source: caller.url,
        line: caller.line - 1,
        column: caller.column - 1,
        bias: sourceMap.SourceMapConsumer.GREATEST_LOWER_BOUND,
      }),
      mappedContent0: mappedContent[0],
      originalMappedContent0: originalMappedContent[0],
      commonPrefixBetween0:
        commonPrefix(mappedContent[0], originalMappedContent[0]).length,
      offsetEmittedMinusMappedContent:
        emittedContent.replace(mappedContent.join("\n"), "")
          .length,
      attemptedPatchOffset: offset,
    });
    console.log(
      "The following content should match the source code (it is the position returned by the source map)",
    );
    console.log({ mappedContent });
    // ==========================================

    // Patch all coverage ranges to reflect the actual position with the computed offset
    // Note: the first coverage result is garbage
    const [coverage] = result;
    coverage.url = caller.url;
    coverage.functions.shift();
    coverage.functions.forEach(({ ranges }) =>
      ranges.forEach((range) => {
        range.startOffset += offset;
        range.endOffset += offset;
      })
    );

    // Save coverage
    await ensureDir(coverageDir);
    await Deno.writeTextFile(
      join(coverageDir, `astral-${crypto.randomUUID()}.json`),
      JSON.stringify(coverage, null, 2),
    );
  } catch (error) {
    // We don't want to make the user app crash if we somehow
    // fail to collect coverage
    console.warn(
      `Failed to generate coverage: ${error}\nIf you see this message, please open an issue at lino-levan/astral`,
    );
  }
}

function commonPrefix(a: string, b: string) {
  const minLength = Math.min(a.length, b.length);
  let i = 0;
  while (i < minLength && a[i] === b[i]) i++;
  return { prefix: a.slice(0, i), length: i };
}
