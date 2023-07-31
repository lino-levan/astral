import { ensureDirSync } from "https://deno.land/std@0.196.0/fs/ensure_dir.ts";
import { resolve } from "https://deno.land/std@0.196.0/path/mod.ts";

const REVISION = "1176526";
const HOME_PATH = Deno.build.os === "windows"
  ? Deno.env.get("USERPROFILE")!
  : Deno.env.get("HOME")!;
const BASE_PATH = resolve(HOME_PATH, ".astral");
const CONFIG_PATH = resolve(BASE_PATH, "cache.json");

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

function getCache(): Record<string, string> {
  try {
    return JSON.parse(Deno.readTextFileSync(CONFIG_PATH));
  } catch {
    return {};
  }
}

async function decompressArchive(source: string, destination: string) {
  const unzipCommand = new Deno.Command(
    Deno.build.os === "windows" ? "PowerShell" : "unzip",
    {
      args: Deno.build.os === "windows"
        ? [
          "Expand-Archive",
          "-Path",
          `"${source}"`,
          "-DestinationPath",
          `"${destination}"`,
          "-Force",
        ]
        : [
          "-o",
          source,
          "-d",
          destination,
        ],
    },
  );
  await unzipCommand.output();
}

/**
 * Get path for the binary for this OS. Downloads a browser if none is cached.
 */
export async function getBinary(): Promise<string> {
  const config = getCache();

  // If the config doesn't have the revision, download it and return that
  if (!config[REVISION]) {
    ensureDirSync(BASE_PATH);
    const versions = await knownGoodVersions();
    const version = versions.versions.filter((val) =>
      val.revision === REVISION
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

    console.log(
      "Downloading browser... (this may take a while depending on your internet connection)",
    );
    const req = await fetch(download.url);
    if (!req.body) {
      throw new Error(
        "Download failed, please check your internet connection and try again",
      );
    }
    await Deno.writeFile(resolve(BASE_PATH, `raw_${REVISION}.zip`), req.body);
    console.log(`Download complete (chrome revision ${REVISION})`);
    await decompressArchive(
      resolve(BASE_PATH, `raw_${REVISION}.zip`),
      resolve(BASE_PATH, REVISION),
    );

    config[REVISION] = resolve(BASE_PATH, REVISION);
    Deno.writeTextFileSync(CONFIG_PATH, JSON.stringify(config));
  }

  // It now exists, return the path to the known good binary
  const folder = config[REVISION];

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
