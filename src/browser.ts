import { retry } from "@std/async/retry";
import { deadline } from "@std/async/deadline";

import { Celestial, PROTOCOL_VERSION } from "../bindings/celestial.ts";
import { getBinary } from "./cache.ts";
import {
  Page,
  type SandboxOptions,
  type UserAgentOptions,
  type WaitForOptions,
} from "./page.ts";
import { WEBSOCKET_ENDPOINT_REGEX, websocketReady } from "./util.ts";
import { DEBUG } from "./debug.ts";

async function runCommand(
  command: Deno.Command,
  { retries = 60 } = {},
): Promise<{ process: Deno.ChildProcess; endpoint: string }> {
  const process = command.spawn();
  let endpoint = undefined as string | undefined;

  // Wait until write to stdout containing the localhost address
  // This probably means that the process is read to accept communication
  const textDecoder = new TextDecoder();
  const stack: string[] = [];
  let error = true;
  for await (const chunk of process.stderr) {
    const message = textDecoder.decode(chunk);
    stack.push(message);

    endpoint = message.trim().match(WEBSOCKET_ENDPOINT_REGEX)?.[1];
    if (endpoint) {
      error = false;
      break;
    }

    // Recover from garbage "SingletonLock" nonsense
    if (message.includes("SingletonLock")) {
      const path = message.split("Failed to create ")[1].split(":")[0];

      process.kill();
      await process.status;

      try {
        Deno.removeSync(path);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        }
      }
      return runCommand(command);
    }
  }

  if (error) {
    const { code } = await process.status;
    stack.push(`Process exited with code ${code}`);
    // Handle recoverable error code 21 on Windows
    // https://source.chromium.org/chromium/chromium/src/+/main:net/base/net_error_list.h;l=90-91
    if (Deno.build.os === "windows" && code === 21 && retries > 0) {
      return runCommand(command, { retries: retries - 1 });
    }
    console.error(stack.join("\n"));
    // https://github.com/lino-levan/astral/issues/82
    if (stack.join("").includes("error while loading shared libraries")) {
      throw new Error(
        "Your binary refused to boot due to missing system dependencies. This can happen if you are using a minimal Docker image. If you're running in a Debian-based container, the following code could work:\n\nRUN apt-get update && apt-get install -y wget gnupg && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && sh -c 'echo \"deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main\" >> /etc/apt/sources.list.d/google.list' && apt-get update && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 --no-install-recommends && rm -rf /var/lib/apt/lists/*\n\nLook at puppeteer docs for more information: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker",
      );
    }
    throw new Error("Your binary refused to boot");
  }

  if (!endpoint) throw new Error("Somehow did not get a websocket endpoint");

  return { process, endpoint };
}

/** Options for launching a browser */
export interface BrowserOptions {
  headless?: boolean;
  product?: "chrome" | "firefox";
  userAgent?: string;
}

/**
 * The browser class is instantiated when you run the `launch` method.
 *
 * @example
 * ```ts
 * const browser = await launch();
 * ```
 */
export class Browser {
  #options: BrowserOptions;
  #celestial: Celestial;
  #process: Deno.ChildProcess | null;
  readonly pages: Page[] = [];

  constructor(
    ws: WebSocket,
    process: Deno.ChildProcess | null,
    opts: BrowserOptions,
  ) {
    this.#celestial = new Celestial(ws);
    this.#process = process;
    this.#options = opts;
  }

  [Symbol.asyncDispose](): Promise<void> {
    if (this.isRemoteConnection) return this.disconnect();

    return this.close();
  }

  /** Returns true if browser is connected remotely instead of using a subprocess */
  get isRemoteConnection(): boolean {
    return !this.#process;
  }

  /**
   * Returns raw celestial bindings for the browser. Super unsafe unless you know what you're doing.
   */
  unsafelyGetCelestialBindings(): Celestial {
    return this.#celestial;
  }

  /**
   * Disconnects the browser from the websocket connection. This is useful if you want to keep the browser running but don't want to use it anymore.
   */
  async disconnect() {
    await this.#celestial.close();
  }

  /**
   * Closes the browser and all of its pages (if any were opened). The Browser object itself is considered to be disposed and cannot be used anymore.
   */
  async close() {
    await this.#celestial.Browser.close();
    await this.#celestial.close();

    // First we get the process, if this is null then this is a remote connection
    const process = this.#process;

    // If we use a remote connection, then close all pages websockets
    if (!process) {
      await Promise.allSettled(this.pages.map((page) => page.close()));
    } else {
      try {
        // ask nicely first
        process.kill();
        await deadline(process.status, 10 * 1000);
      } catch {
        // then force
        process.kill("SIGKILL");
        await process.status;
      }
    }
  }

  /**
   * Promise which resolves to a new `Page` object.
   */
  async newPage(
    url?: string,
    options?: WaitForOptions & SandboxOptions & UserAgentOptions,
  ): Promise<Page> {
    const { targetId } = await this.#celestial.Target.createTarget({
      url: "",
    });
    const browserWsUrl = new URL(this.#celestial.ws.url);
    const wsUrl =
      `${browserWsUrl.origin}/devtools/page/${targetId}${browserWsUrl.search}`;
    const websocket = new WebSocket(wsUrl);
    await websocketReady(websocket);

    const { waitUntil, sandbox } = options ?? {};
    const page = new Page(targetId, url, websocket, this, { sandbox });
    this.pages.push(page);

    const celestial = page.unsafelyGetCelestialBindings();
    const { userAgent: defaultUserAgent } = await celestial.Browser
      .getVersion();

    const userAgent = options?.userAgent ||
      this.#options.userAgent ||
      defaultUserAgent.replaceAll("Headless", "");

    await Promise.all([
      celestial.Emulation.setUserAgentOverride({ userAgent }),
      celestial.Page.enable(),
      celestial.Runtime.enable(),
      celestial.Network.enable({}),
      celestial.Page.setInterceptFileChooserDialog({ enabled: true }),
      sandbox ? celestial.Fetch.enable({}) : null,
    ]);

    if (url) {
      await page.goto(url, { waitUntil });
    }

    return page;
  }

  /**
   * The browser's original user agent.
   */
  async userAgent(): Promise<string> {
    const { userAgent } = await this.#celestial.Browser.getVersion();
    return userAgent;
  }

  /**
   * A string representing the browser name and version.
   */
  async version(): Promise<string> {
    const { product, revision } = await this.#celestial.Browser.getVersion();
    return `${product}/${revision}`;
  }

  /**
   * The browser's websocket endpoint
   */
  wsEndpoint(): string {
    return this.#celestial.ws.url;
  }

  /**
   * Returns true if the browser and its websocket have been closed
   */
  get closed(): boolean {
    return this.#celestial.ws.readyState === WebSocket.CLOSED;
  }
}

export type ConnectOptions =  string | (
  {product?: "chrome" | "firefox"} & ({
    wsEndpoint: string; // example: ws://localhost:9222/devtools/browser/<id>
  } | {
    endpoint: string;   // example: http://localhost:9222
  })
);


/**
 * Get the websocket endpoint for the browser.
 * You can pass either a URL or an object with the `endpoint` or `wsEndpoint` property.
 */
async function getWebsocketEndpoint (opts: ConnectOptions) : Promise<string> {

  if(typeof opts === "string"){
    if(opts.startsWith("ws://") || opts.startsWith("wss://")) return opts;
    opts = { endpoint: opts }
  } 

  if("wsEndpoint" in opts) return opts.wsEndpoint
  if(!("endpoint" in opts)) throw new Error("Either wsEndpoint or endpoint must be provided");

  const endpoint = opts.endpoint.startsWith("http") ?  opts.endpoint : `http://${opts.endpoint}` ;

  const browserRes = await retry(async () => {
    const browserReq = await fetch(`${endpoint}/json/version`);
    return await browserReq.json();
  })
  
  if (browserRes["Protocol-Version"] !== PROTOCOL_VERSION) {
    throw new Error("Differing protocol versions between binary and bindings.");
  }

  return browserRes.webSocketDebuggerUrl
}




/**
 * Connects to a given browser over a Http/WebSocket endpoint.
 */
export async function connect(opts: ConnectOptions): Promise<Browser> {
  const product = typeof opts == "string" ? "chrome" : (opts.product ?? "chrome");
  const options: BrowserOptions = {
    product,
  };

  const ws = new WebSocket(await getWebsocketEndpoint(opts));
  await websocketReady(ws);
  return new Browser(ws, null, options);
}



/**
 * Options for launching a browser instance.
 */
export type LaunchOptions = BrowserOptions & {
  path?: string;
  args?: string[];
  cache?: string;
};


/**
 * Launches a browser instance with given arguments and options when specified.
 * Connects to an existing browser if an URL is passed instead.
 */
export async function launch(opts?: string | LaunchOptions): Promise<Browser> {
  if(typeof opts === "string") return connect(opts);
  if(opts && ("endpoint" in opts || "wsEndpoint" in opts)) return connect(opts as ConnectOptions);

  const headless = opts?.headless ?? true;
  const product = opts?.product ?? "chrome";
  const args = opts?.args ?? [];
  const cache = opts?.cache;
  let path = opts?.path;

  const options: BrowserOptions = {
    headless,
    product,
  };

  if (!path) {
    path = await getBinary(product, { cache });
  }

  if (!args.find((arg) => arg.startsWith("--user-data-dir="))) {
    const tempDir = Deno.makeTempDirSync();
    args.push(`--user-data-dir=${tempDir}`);
  }

  // Launch child process
  const binArgs = [
    "--remote-debugging-port=0",
    "--no-first-run",
    "--password-store=basic",
    "--use-mock-keychain",
    // "--no-startup-window",
    ...(headless
      ? [
        product === "chrome" ? "--headless=new" : "--headless",
        "--hide-scrollbars",
      ]
      : []),
    ...args,
  ];

  if (DEBUG) {
    console.log(`Launching: ${path} ${binArgs.join(" ")}`);
  }

  const launch = new Deno.Command(path, {
    args: binArgs,
    stderr: "piped",
  });
  const { process, endpoint } = await runCommand(launch);


  const ws = new WebSocket(await getWebsocketEndpoint(endpoint));
  await websocketReady(ws);

  // Construct browser and return
  return new Browser(ws, process, options);
}
