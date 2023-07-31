import { Celestial, PROTOCOL_VERSION } from "../bindings/celestial.ts";
import { getBinary } from "./cache.ts";
import { Page } from "./page.ts";
import { BASE_URL, websocketReady } from "./util.ts";

export interface BrowserOpts {
  path?: string;
  headless?: boolean;
}

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
    this.#process = launch.spawn();

    // Wait until first write to stdout
    // This probably means that the process is read to accept communication
    const reader = this.#process.stderr
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let message: string;
    do {
      message = (await reader.read()).value!;
    } while (!message.includes("127.0.0.1:9222"));

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

  close() {
    if (!this.#process) {
      throw new Error(
        "You tried to close a browser you never launched or already closed. Don't do that.",
      );
    }
    this.#process.kill();
    this.#process = undefined;
  }

  async newPage(url: string) {
    const browserReq = await fetch(
      `${BASE_URL}/json/new?${encodeURIComponent(url)}`,
      {
        method: "PUT",
      },
    );
    const browserRes = await browserReq.json();
    const websocket = new WebSocket(browserRes.webSocketDebuggerUrl);
    await websocketReady(websocket);

    const page = new Page(browserRes.id, websocket, this);
    this.pages.push(page);

    return page;
  }

  async userAgent() {
    if (!this.#ws) throw "Not connected";

    const celestial = new Celestial(this.#ws);
    const { userAgent } = await celestial.Browser.getVersion();

    return userAgent;
  }

  async version() {
    if (!this.#ws) throw "Not connected";

    const celestial = new Celestial(this.#ws);
    const { product, revision } = await celestial.Browser.getVersion();

    return `${product}/${revision}`;
  }

  wsEndpoint() {
    if (!this.#ws) throw "Not connected";

    return this.#ws.url;
  }
}

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
