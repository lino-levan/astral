import {
  assert,
  assertArrayIncludes,
  assertMatch,
  assertNotMatch,
} from "@std/assert";
import { generateBinArgs } from "../mod.ts";

Deno.test("Bin args supports user provided args", () => {
  const args = generateBinArgs("chrome", { args: ["--user-provided"] });
  assertArrayIncludes(args, ["--remote-debugging-port=0", "--user-provided"]);
});

Deno.test("Bin args supports user provided args (by env vars)", () => {
  const env = Deno.env.get("ASTRAL_BIN_ARGS") ?? "";
  try {
    assert(!generateBinArgs("chrome").includes("--env-provided"));
    Deno.env.set("ASTRAL_BIN_ARGS", "--foo --env-provided --bar");
    assert(generateBinArgs("chrome").includes("--env-provided"));
  } finally {
    Deno.env.set("ASTRAL_BIN_ARGS", env);
  }
});

Deno.test("Bin args does not throw if env permission is not provided", {
  permissions: { env: false },
}, () => {
  generateBinArgs("chrome");
});

Deno.test("Bin args for headless", () => {
  assertNotMatch(
    generateBinArgs("chrome", { headless: false }).join(" "),
    /--headless/,
  );
  assertMatch(
    generateBinArgs("chrome", { headless: true }).join(" "),
    /--headless/,
  );
});

Deno.test("Bin args for window size", () => {
  assertNotMatch(generateBinArgs("chrome", {}).join(" "), /--window-size/);
  assertMatch(
    generateBinArgs("chrome", {
      launchPresets: { windowSize: { width: 800, height: 600 } },
    }).join(" "),
    /--window-size=800,600/,
  );
});

Deno.test("Bin args for transparent background", () => {
  assertNotMatch(
    generateBinArgs("chrome", {}).join(" "),
    /--default-background-color=00000000/,
  );
  assertMatch(
    generateBinArgs("chrome", { launchPresets: { bgTransparent: true } }).join(
      " ",
    ),
    /--default-background-color=00000000/,
  );
});

Deno.test("Bin args for hardened chrome", () => {
  assertNotMatch(generateBinArgs("chrome", {}).join(" "), /--no-experiments/);
  assertMatch(
    generateBinArgs("chrome", { launchPresets: { hardened: true } }).join(" "),
    /--no-experiments/,
  );
});

Deno.test("Bin args for containerized chrome", () => {
  assertNotMatch(generateBinArgs("chrome", {}).join(" "), /--no-sandbox/);
  assertMatch(
    generateBinArgs("chrome", { launchPresets: { containerized: true } }).join(
      " ",
    ),
    /--no-sandbox/,
  );
});

Deno.test("Bin args for lambda chrome", () => {
  assertNotMatch(generateBinArgs("chrome", {}).join(" "), /--single-process/);
  assertMatch(
    generateBinArgs("chrome", { launchPresets: { lambdaInstance: true } }).join(
      " ",
    ),
    /--single-process/,
  );
});
