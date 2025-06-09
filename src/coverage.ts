import { join } from "@std/path/join";
import { exists } from "@std/fs/exists";
import { ensureDir } from "@std/fs/ensure-dir";
import type { Celestial } from "../bindings/celestial.ts";
import { DenoDir } from "@deno/cache-dir";
import { fromFileUrl } from "@std/path";
import { type Debugger, Session } from "node:inspector/promises";

/**
 * This function post-process the coverage results collected by `Profiler.takePreciseCoverage`
 * to make them match with the original source files executed by deno, allowing an unified
 * `deno coverage` experience with code executed within the browser V8 engine.
 */
export async function processPageEvaluateCoverage(
  // deno-lint-ignore ban-types
  func: Function,
  result: Awaited<
    ReturnType<Celestial["Profiler"]["takePreciseCoverage"]>
  >["result"],
) {
  try {
    let cacheDir = new DenoDir().createGenCache().location;
    const coverageDir = Deno.env.get("DENO_COVERAGE_DIR");
    // TODO: we could remove this check in next versions of Deno,
    // as it'll always be populated when coverage is enabled
    // https://github.com/denoland/deno/pull/29363
    if (!coverageDir) {
      throw new TypeError(
        "Enabling coverage requires `DENO_COVERAGE_DIR` environment variable to be set",
      );
    }

    // Locate function and skip non file:// sources
    const { scriptId, lineNumber, columnNumber, url, delta } =
      await locateFunction(func);
    if (new URL(url).protocol !== "file:") {
      return;
    }

    // Read emitted content from deno cache and extract source mapping url
    let filepath = fromFileUrl(url);
    if (Deno.build.os === "windows") {
      // On windows, we need to remove the semicolon from the disk label
      filepath = filepath.replace(/^([A-Z]):/, "$1");
    }
    if (Deno.build.os === "darwin") {
      // https://github.com/denoland/deno_cache_dir/issues/86
      cacheDir = cacheDir.replace("/.cache/deno/", "/Library/Caches/deno/");
    }
    const emittedPath = join(cacheDir, "file", `${filepath}.js`);
    if (!await exists(emittedPath)) {
      throw new TypeError(`Could not find emitted file at: ${emittedPath}`);
    }
    const emittedContent = await Deno.readTextFile(emittedPath);

    // Compute the range offset
    const offset = emittedContent.replace(
      emittedContent.split("\n").slice(lineNumber).join("\n"),
      "",
    ).length + columnNumber - delta - 1;

    // Patch all coverage ranges to reflect the actual position with the computed offset
    // Note: the first coverage result is garbage
    const [coverage] = result;
    coverage.scriptId = scriptId;
    coverage.url = url;
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

/** Local registry to store parsed scripts references */
const scripts = {} as {
  [scriptId: string]: Debugger.ScriptParsedEventDataType;
};

/** Async function constructor. */
const AsyncFunction = (async () => {}).constructor;

/** Function location typing */
type FunctionLocation = {
  name: "[[FunctionLocation]]";
  value: {
    value: { scriptId: string; lineNumber: number; columnNumber: number };
  };
};

/**
 * This helpers locates a given function reference within the associated codebase.
 * It uses the V8 internal inspector to get back the scriptId along with the
 * line and column numbers, and the file reference.
 *
 * It also computes the delta for non-arrow functions as the column number will
 * be slightly offset.
 */
async function locateFunction(
  // deno-lint-ignore ban-types
  func: Function,
): Promise<
  FunctionLocation["value"]["value"] & { url: string; delta: number }
> {
  const uuid = `__coverage__${crypto.randomUUID().replaceAll("-", "")}`;
  (globalThis as Record<string, unknown>)[uuid] = func;

  const session = new Session();
  session.connect();

  // Enable debugging to be able to catch scriptId and retrieve source url later on
  session.on(
    "Debugger.scriptParsed",
    ({ params }) => scripts[params.scriptId] = params,
  );
  await session.post("Debugger.enable");

  // Search function location
  const { result: { objectId } } = await session.post("Runtime.evaluate", {
    expression: `globalThis.${uuid}`,
  });
  const { internalProperties } = await session.post("Runtime.getProperties", {
    objectId,
  }) as unknown as {
    internalProperties: Array<{ name: string; value: unknown }>;
  };
  session.disconnect();

  const internalLocation = internalProperties.find((
    prop,
  ): prop is FunctionLocation => prop.name === "[[FunctionLocation]]");
  if (!internalLocation) {
    throw new ReferenceError(`Failed to find function location: ${func.name}`);
  }

  // Format and return values
  const { scriptId, lineNumber, columnNumber } = internalLocation.value.value;
  const { url } = scripts[scriptId];

  // For non-arrow function, the column number points towards
  // the parenthesis, so we need to offset by the function
  // keywords (including namems if any)
  let delta = 0;
  const header = func.toString().split("\n")[0];
  const isArrowFunc = header.includes("=>{");
  if (!isArrowFunc) {
    delta += "function".length;
    if (func instanceof AsyncFunction) {
      delta += "async ".length;
    }
    if (func.name) {
      delta += ` ${func.name}`.length;
    }
  }

  return { scriptId, lineNumber, columnNumber, url, delta };
}
