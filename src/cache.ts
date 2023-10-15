import { ensureDirSync } from "https://deno.land/std@0.201.0/fs/ensure_dir.ts";
import { resolve } from "https://deno.land/std@0.201.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.201.0/fs/ensure_dir.ts";
import { dirname } from "https://deno.land/std@0.201.0/path/dirname.ts";
import { join } from "https://deno.land/std@0.201.0/path/join.ts";
import { ZipReader } from "https://deno.land/x/zipjs@v2.7.29/index.js";
import ProgressBar from "https://deno.land/x/progress@v1.3.9/mod.ts";
import { exists, existsSync } from "https://deno.land/std@0.203.0/fs/exists.ts";
import { retry } from "https://deno.land/std@0.203.0/async/retry.ts";

export const SUPPORTED_VERSIONS = {
  chrome: "118.0.5943.0",
  firefox: "116.0",
} as const;

const HOME_PATH = Deno.build.os === "windows"
  ? Deno.env.get("USERPROFILE")!
  : Deno.env.get("HOME")!;
const BASE_PATH = resolve(HOME_PATH, ".astral");
const CONFIG_FILE = "cache.json";

const LOCK_FILES = {} as { [cache: string]: { [product: string]: Lock } };

interface KnownGoodVersions {
  timestamps: string;
  versions: {
    version: string;
    revision: string;
    downloads: {
      chrome: {
        platform: "linux64" | "mac-arm64" | "mac-x64" | "win32" | "win64";
        url: string;
      }[];
    };
  }[];
}

async function knownGoodVersions(): Promise<KnownGoodVersions> {
  const req = await fetch(
    "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json",
  );
  return await req.json();
}

function getCachedConfig({ cache = BASE_PATH }): Record<string, string> {
  try {
    return JSON.parse(Deno.readTextFileSync(resolve(cache, CONFIG_FILE)));
  } catch {
    return {};
  }
}

/**
 * Clean cache
 */
export async function cleanCache({ cache = BASE_PATH } = {}) {
  try {
    if (await exists(cache)) {
      delete LOCK_FILES[cache];
      await Deno.remove(cache, { recursive: true });
    }
  } catch (error) {
    console.warn(`Failed to clean cache: ${error}`);
  }
}

async function isQuietInstall() {
  // Hide-progress in CI environment
  const ci = await Deno.permissions.query({
    name: "env",
    variable: "CI",
  });
  if ((ci.state === "granted") && (`${Deno.env.get("CI") ?? ""}`.length)) {
    return true;
  }
  // Hide-progress if asked by user
  const quiet = await Deno.permissions.query({
    name: "env",
    variable: "ASTRAL_QUIET_INSTALL",
  });
  if (quiet.state === "granted") {
    const value = `${Deno.env.get("ASTRAL_QUIET_INSTALL") ?? ""}`;
    return value.length &&
      !/^(0|[Nn]o?|NO|[Oo]ff|OFF|[Ff]alse|FALSE)$/.test(value);
  }
  return false;
}

async function decompressArchive(source: string, destination: string) {
  const quiet = await isQuietInstall();
  const archive = await Deno.open(source);
  const zip = new ZipReader(archive);
  const entries = await zip.getEntries();
  const bar = !quiet
    ? new ProgressBar({
      title: `Inflating ${destination}`,
      total: entries.length,
      clear: true,
      display: ":title :bar :percent",
    })
    : null;
  let progress = 0;
  for (const entry of entries) {
    if ((!entry.directory) && (entry.getData)) {
      const path = join(destination, entry.filename);
      await ensureDir(dirname(path));
      const file = await Deno.open(path, {
        create: true,
        truncate: true,
        write: true,
        mode: 0o755,
      });
      await entry.getData(file, { checkSignature: true, useWebWorkers: false });
    }
    progress++;
    bar?.render(progress);
  }
  await zip.close();
  if (!quiet) {
    console.log(`Browser saved to ${destination}`);
  }
}

/**
 * Get path for the binary for this OS. Downloads a browser if none is cached.
 */
export async function getBinary(
  browser: "chrome" | "firefox",
  { cache = BASE_PATH, timeout = 60000 } = {},
): Promise<string> {
  // TODO(lino-levan): fix firefox downloading
  const VERSION = SUPPORTED_VERSIONS[browser];
  const product = `${browser}-${SUPPORTED_VERSIONS[browser]}`;
  const config = getCachedConfig({ cache });

  // If the config doesn't have the revision and there is a lock file, reload config after release
  if (!config[VERSION] && LOCK_FILES[cache]?.[product]?.exists()) {
    await LOCK_FILES[cache]?.[product]?.waitRelease({ timeout });
    Object.assign(config, getCachedConfig({ cache }));
  }

  // If the config doesn't have the revision, download it and return that
  if (!config[VERSION]) {
    const quiet = await isQuietInstall();
    const versions = await knownGoodVersions();
    const version = versions.versions.filter((val) =>
      val.version === VERSION
    )[0];
    const download = version.downloads.chrome.filter((val) => {
      if (Deno.build.os === "darwin" && Deno.build.arch === "aarch64") {
        return val.platform === "mac-arm64";
      } else if (Deno.build.os === "darwin" && Deno.build.arch === "x86_64") {
        return val.platform === "mac-x64";
      } else if (Deno.build.os === "windows") {
        return val.platform === "win64";
      } else if (Deno.build.os === "linux") {
        return val.platform === "linux64";
      }
      throw new Error(
        "Unsupported platform, provide a path to a chromium or firefox binary instead",
      );
    })[0];

    ensureDirSync(cache);
    const lock = new Lock({ cache });
    LOCK_FILES[cache] ??= {};
    LOCK_FILES[cache][product] = lock;
    if (!lock.create()) {
      return getBinary(browser, { cache, timeout });
    }
    try {
      const req = await fetch(download.url);
      if (!req.body) {
        throw new Error(
          "Download failed, please check your internet connection and try again",
        );
      }
      if (quiet) {
        await Deno.writeFile(resolve(cache, `raw_${VERSION}.zip`), req.body);
      } else {
        const reader = req.body.getReader();
        const archive = await Deno.open(resolve(cache, `raw_${VERSION}.zip`), {
          write: true,
          truncate: true,
          create: true,
        });
        const bar = new ProgressBar({
          title: `Downloading ${browser} ${VERSION}`,
          total: Number(req.headers.get("Content-Length") ?? 0),
          clear: true,
          display: ":title :bar :percent",
        });
        let downloaded = 0;
        do {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          await Deno.write(archive.rid, value);
          downloaded += value.length;
          bar.render(downloaded);
        } while (true);
        Deno.close(archive.rid);
        console.log(`Download complete (${browser} version ${VERSION})`);
      }
      await decompressArchive(
        resolve(cache, `raw_${VERSION}.zip`),
        resolve(cache, VERSION),
      );

      config[VERSION] = resolve(cache, VERSION);
      Deno.writeTextFileSync(
        resolve(cache, CONFIG_FILE),
        JSON.stringify(config),
      );
    } finally {
      LOCK_FILES[cache]?.[product]?.release();
    }
  }

  // It now exists, return the path to the known good binary
  const folder = config[VERSION];

  if (Deno.build.os === "darwin" && Deno.build.arch === "aarch64") {
    return resolve(
      folder,
      "chrome-mac-arm64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing",
    );
  } else if (Deno.build.os === "darwin" && Deno.build.arch === "x86_64") {
    return resolve(
      folder,
      "chrome-mac-x64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing",
    );
  } else if (Deno.build.os === "windows") {
    return resolve(folder, "chrome-win64", "chrome.exe");
  } else if (Deno.build.os === "linux") {
    return resolve(folder, "chrome-linux64", "chrome");
  }
  throw new Error(
    "Unsupported platform, provide a path to a chromium or firefox binary instead",
  );
}

/**
 * Create a lock file in cache
 * Only the process with the same PID can release created lock file through this API
 * TODO: Use Deno.flock/Deno.funlock when stabilized (https://deno.land/api@v1.37.1?s=Deno.flock&unstable)
 */
class Lock {
  readonly path;

  constructor({ cache = BASE_PATH } = {}) {
    this.path = resolve(cache, ".lock");
  }

  /** Returns true if lock file exists */
  exists() {
    return existsSync(this.path);
  }

  /** Create a lock file and returns true if it succeeds, false if it was already existing */
  create() {
    try {
      Deno.writeTextFileSync(this.path, `${Deno.pid}`, { createNew: true });
      return true;
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
      return false;
    }
  }

  /** Release lock file */
  release() {
    try {
      if (Deno.readTextFileSync(this.path) === `${Deno.pid}`) {
        Deno.removeSync(this.path);
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }

  /** Wait for lock release */
  async waitRelease({ timeout = 60000 } = {}) {
    await retry(() => {
      if (this.exists()) {
        throw new Error(
          `Timeout while waiting for lockfile release at: ${this.path}`,
        );
      }
    }, {
      maxTimeout: timeout,
      maxAttempts: Infinity,
      multiplier: 1,
      minTimeout: 100,
    });
  }
}
