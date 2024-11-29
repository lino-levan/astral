import { ensureDir, ensureDirSync } from "@std/fs/ensure-dir";
import { exists, existsSync } from "@std/fs/exists";
import { resolve } from "@std/path/resolve";
import { dirname } from "@std/path/dirname";
import { retry } from "@std/async/retry";
import { join } from "@std/path/join";
import { ZipReader } from "@zip-js/zip-js";
import ProgressBar from "@deno-library/progress";

/** The automatically downloaded browser versions that are known to work. */
export const SUPPORTED_VERSIONS = {
  chrome: "125.0.6400.0",
  firefox: "116.0",
} as const;

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

/** Stolen from https://github.com/justjavac/deno_dirs/blob/main/cache_dir/mod.ts
 *
 * Returns the path to the user's cache directory.
 *
 * The returned value depends on the operating system and is either a string,
 * containing a value from the following table, or `null`.
 *
 * |Platform | Value                               | Example                          |
 * | ------- | ----------------------------------- | -------------------------------- |
 * | Linux   | `$XDG_CACHE_HOME` or `$HOME`/.cache | /home/justjavac/.cache           |
 * | macOS   | `$HOME`/Library/Caches              | /Users/justjavac/Library/Caches  |
 * | Windows | `$LOCALAPPDATA`                    | C:\Users\justjavac\AppData\Local |
 */
function cacheDir(): string | null {
  switch (Deno.build.os) {
    case "linux": {
      const xdg = Deno.env.get("XDG_CACHE_HOME");
      if (xdg) return xdg;

      const home = Deno.env.get("HOME");
      if (home) return `${home}/.cache`;
      break;
    }

    case "darwin": {
      const home = Deno.env.get("HOME");
      if (home) return `${home}/Library/Caches`;
      break;
    }

    case "windows":
      return Deno.env.get("LOCALAPPDATA") ?? null;
  }

  return null;
}
export function getDefaultCachePath(): string {
  const path = cacheDir();
  if (!path) throw new Error("couldn't determine default cache directory");
  return join(path, "astral");
}

function getCachedConfig(
  { cache = getDefaultCachePath() } = {},
): Record<string, string> {
  try {
    return JSON.parse(Deno.readTextFileSync(resolve(cache, CONFIG_FILE)));
  } catch {
    return {};
  }
}

/**
 * Clean cache
 */
export async function cleanCache({ cache = getDefaultCachePath() } = {}) {
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
      output: Deno.stderr,
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
    console.error(`\nBrowser saved to ${destination}`);
  }
}

/**
 * Get path for the binary for this OS. Downloads a browser if none is cached.
 */
export async function getBinary(
  browser: "chrome" | "firefox",
  { cache = getDefaultCachePath(), timeout = 60000 } = {},
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
          output: Deno.stderr,
        });
        let downloaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          await archive.write(value);
          downloaded += value.length;
          bar.render(downloaded);
        }
        archive.close();
        console.error(`\nDownload complete (${browser} version ${VERSION})`);
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

  constructor({ cache = getDefaultCachePath() } = {}) {
    this.path = resolve(cache, ".lock");
    this.removeExpiredLockPath();
  }

  /** Clean expired lock path */
  removeExpiredLockPath() {
    // if this.path's create time is older than cacheTTL, remove it
    try {
      const fileInfo = Deno.statSync(this.path);
      const lockTTL = 1800 * 1000;
      if (
        fileInfo.birthtime &&
        Date.now() - fileInfo.birthtime.getTime() > lockTTL
      ) {
        Deno.removeSync(this.path);
        console.log(
          `%c There is an old lock file (${this.path}), this is probably due to a failed download. It has been removed automatically.`,
          "color: #ff0000",
        );
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
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
