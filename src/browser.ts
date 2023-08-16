import { Celestial, PROTOCOL_VERSION } from "../bindings/celestial.ts";
import { getBinary } from "./cache.ts";
import { Page, WaitForOptions } from "./page.ts";
import { BASE_URL, websocketReady } from "./util.ts";

async function runCommand(command: Deno.Command) {
  const process = command.spawn();

  // Wait until write to stdout containing the localhost address
  // This probably means that the process is read to accept communication
  const textDecoder = new TextDecoder();
  const stack: string[] = [];
  let error = true;
  for await (const chunk of process.stderr) {
    const message = textDecoder.decode(chunk);
    stack.push(message);

    if (message.includes("127.0.0.1:9222")) {
      error = false;
      break;
    }

    // Recover from garbage "SingletonLock" nonsense
    if (message.includes("SingletonLock")) {
      const path = message.split("Failed to create ")[1].split(":")[0];

      process.kill();
      await process.status;

      Deno.removeSync(path);
      return runCommand(command);
    }
  }

  if (error) {
    console.error(stack.join("\n"));
    throw new Error("Your binary refused to boot");
  }

  return process;
}

export interface BrowserOpts {
  headless?: boolean;
  path?: string;
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
  #options: Required<BrowserOpts>;
  #ws?: WebSocket;
  #process?: Deno.ChildProcess;
  readonly pages: Page[] = [];

  constructor(opts: Required<BrowserOpts>) {
    this.#options = {
      ...opts,
    };
  }

  /**
   * @internal
   * DO NOT USE
   */
  async launch() {
    if (this.#process) {
      throw new Error(
        "You tried to launch the same browser twice. Don't do that.",
      );
    }

    // Launch child process
    const launch = new Deno.Command(this.#options.path, {
      args: [
        "-remote-debugging-port=9222",
        ...(
          this.#options.headless ? ["--headless=new"] : []
        ),
      ],
      stderr: "piped",
    });
    this.#process = await runCommand(launch);

    // Fetch browser websocket
    const browserReq = await fetch(`${BASE_URL}/json/version`);
    const browserRes = await browserReq.json();

    if (browserRes["Protocol-Version"] !== PROTOCOL_VERSION) {
      throw new Error(
        "Differing protocol versions between binary and bindings.",
      );
    }

    // Set up browser websocket
    this.#ws = new WebSocket(browserRes.webSocketDebuggerUrl);

    // Make sure that websocket is open before continuing
    await websocketReady(this.#ws);
  }

  /**
   * Closes the browser and all of its pages (if any were opened). The Browser object itself is considered to be disposed and cannot be used anymore.
   */
  async close() {
    if (!this.#process || !this.#ws) {
      throw new Error(
        "You tried to close a browser you never launched or already closed. Don't do that.",
      );
    }
    this.#ws.close();
    this.#process.kill();
    await this.#process.status;
    this.#process = undefined;
  }

  /**
   * Promise which resolves to a new `Page` object.
   */
  async newPage(url?: string, options?: WaitForOptions) {
    const browserReq = await fetch(
      `${BASE_URL}/json/new`,
      {
        method: "PUT",
      },
    );
    const browserRes = await browserReq.json();
    const websocket = new WebSocket(browserRes.webSocketDebuggerUrl);
    await websocketReady(websocket);

    const page = new Page(browserRes.id, websocket, this);
    this.pages.push(page);

    const celestial = await page.unsafelyGetCelestialBindings();

    if (url) {
      await celestial.Page.enable();

      await Promise.all([
        celestial.Page.setInterceptFileChooserDialog({ enabled: true }),
        page.goto(url, options),
      ]);
    }

    return page;
  }

  /**
   * The browser's original user agent.
   */
  async userAgent() {
    if (!this.#ws) throw "Not connected";

    const celestial = new Celestial(this.#ws);
    const { userAgent } = await celestial.Browser.getVersion();

    return userAgent;
  }

  /**
   * A string representing the browser name and version.
   */
  async version() {
    if (!this.#ws) throw "Not connected";

    const celestial = new Celestial(this.#ws);
    const { product, revision } = await celestial.Browser.getVersion();

    return `${product}/${revision}`;
  }

  /**
   * The browser's websocket endpoint
   */
  wsEndpoint() {
    if (!this.#ws) throw "Not connected";

    return this.#ws.url;
  }
}

/**
 * Launches a browser instance with given arguments and options when specified.
 */
export async function launch(opts?: BrowserOpts) {
  let path = opts?.path;

  if (!path) {
    path = await getBinary();
  }

  const options: Required<BrowserOpts> = {
    headless: opts?.headless ?? true,
    path,
  };

  const browser = new Browser(options);
  await browser.launch();
  return browser;
}
