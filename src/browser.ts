import { Page } from "./page.ts";

export interface BrowserOpts {
  path: string;
}

class Browser {
  #path: string;
  #ws?: WebSocket;
  #process?: Deno.ChildProcess;
  pages: Page[] = [];

  constructor(opts: BrowserOpts) {
    this.#path = opts.path;
  }

  get ws() {
    return this.#ws;
  }

  async launch() {
    if (this.#process) {
      throw new Error(
        "You tried to launch the same browser twice. Don't do that.",
      );
    }

    // Launch child process
    const launch = new Deno.Command(this.#path, {
      args: [
        "-remote-debugging-port=9222",
        "--headless=new",
      ],
      stderr: "piped",
    });
    this.#process = launch.spawn();

    // Wait until first write to stdout
    // This probably means that the process is read to accept communication
    const reader = this.#process.stderr
      .pipeThrough(new TextDecoderStream())
      .getReader();
    await reader.read();

    // Fetch browser websocket
    const browserReq = await fetch("http://localhost:9222/json/version");
    const browserRes = await browserReq.json();

    // Set up browser websocket
    this.#ws = new WebSocket(browserRes.webSocketDebuggerUrl);

    // Make sure that websocket is open before continuing
    await new Promise<void>((res) => {
      if (!this.#ws) return res();
      this.#ws.onopen = () => {
        res();
      };
    });
  }

  async newPage(url: string) {
    const browserReq = await fetch(
      `http://localhost:9222/json/new?${encodeURIComponent(url)}`,
      {
        method: "PUT",
      },
    );
    const browserRes = await browserReq.json();
    const websocket = new WebSocket(browserRes.webSocketDebuggerUrl);
    console.log(browserRes);
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
}

export async function launch(opts: BrowserOpts) {
  const browser = new Browser(opts);
  await browser.launch();
  return browser;
}
