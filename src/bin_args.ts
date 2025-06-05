import type { BrowserOptions, LaunchOptions } from "./browser.ts";

/**
 * Generates a list of browser switches according to specified product,
 * environement, and `launchPresets` params.
 *
 * It also adds switches specified in `ASTRAL_BIN_ARGS` environment variable
 * if permission is granted.
 *
 * References for chromium flags:
 * - https://peter.sh/experiments/chromium-command-line-switches/
 */
export function generateBinArgs(
  product: NonNullable<BrowserOptions["product"]>,
  { launchPresets, args = [], headless = true }: {
    launchPresets?: LaunchOptions["launchPresets"];
    args?: string[];
    headless?: boolean;
  } = {},
): string[] {
  const binArgs = [
    "--remote-debugging-port=0",
    "--no-first-run",
    "--password-store=basic",
    "--use-mock-keychain",
  ];

  if (product === "chrome") {
    binArgs.push("--disable-blink-features=AutomationControlled");
  }

  if (headless) {
    binArgs.push(
      product === "chrome" ? "--headless=new" : "--headless",
      "--hide-scrollbars",
    );
  }

  if (launchPresets?.windowSize) {
    binArgs.push(
      `--window-size=${launchPresets.windowSize.width},${launchPresets.windowSize.height}`,
    );
  }

  if ((product === "chrome") && (launchPresets?.hardened)) {
    binArgs.push(
      // Skip additional first run tasks
      "--disable-first-run-ui",
      // Prevent the service process from adding itself as an autorun process
      "--no-service-autorun",
      // Disable default browser and search engine checks
      "--no-default-browser-check",
      "--disable-search-engine-choice-screen",
      // Disable account syncing features
      "--disable-sync",
      // Bypass user interactions for some features
      "--no-user-gesture-required",
      "--allow-pre-commit-input",
      "--deny-permission-prompts",
      "--disable-popup-blocking",
      "--disable-prompt-on-repost",
      "--disable-input-event-activation-protection",
      // Disable plugins, extensions, and defaults apps
      "--disable-plugins",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-component-update",
      "--disable-component-extensions-with-background-pages",
      // Disable telemetry
      "--incognito",
      "--no-pings",
      "--disable-stack-profiler",
      "--disable-field-trial-config",
      "--disable-domain-reliability",
      "--disable-logging",
      "--metrics-recording-only",
      // Disable crash reports
      "--noerrdialogs",
      "--hide-crash-restore-bubble",
      "--disable-crash-reporter",
      "--disable-breakpad",
      "--disable-auto-reload",
      // Performances and caching
      "--aggressive-cache-discard",
      "--disable-back-forward-cache",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-hang-monitor",
      "--disable-ipc-flooding-protection",
      // Rendering
      "--force-color-profile=srgb",
      "--disable-renderer-backgrounding",
      "--disable-software-rasterizer",
      "--disable-gpu",
      "--disable-accelerated-2d-canvas",
      // Disable extras APIs
      "--no-experiments",
      "--mute-audio",
      "--disable-dinosaur-easter-egg",
      "--disable-translate",
      "--disable-virtual-keyboard",
      "--disable-touch-drag-drop",
      "--disable-volume-adjust-sound",
      "--disable-audio-input",
      "--disable-audio-output",
      "--disable-notifications",
      "--disable-file-system",
      "--disable-speech-api",
      "--disable-speech-synthesis-api",
      "--disable-remote-playback-api",
      "--disable-presentation-api",
      "--disable-shared-workers",
      "--disable-features=AcceptCHFrame,Translate,BackForwardCache,MediaRouter,OptimizationHints,DialMediaRouteProvider",
    );
  }

  if ((product === "chrome") && (launchPresets?.bgTransparent)) {
    binArgs.push("--default-background-color=00000000");
  }

  const envArgs = Deno.permissions.querySync({
    name: "env",
    variable: "ASTRAL_BIN_ARGS",
  });
  if ((envArgs.state === "granted") && (Deno.env.has("ASTRAL_BIN_ARGS"))) {
    binArgs.push(...Deno.env.get("ASTRAL_BIN_ARGS")!.split(" "));
  }

  return [...new Set([...binArgs, ...args])];
}
