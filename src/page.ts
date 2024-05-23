import { deadline } from "@std/async/deadline";
import { fromFileUrl } from "@std/path/from-file-url";

import { Celestial } from "../bindings/celestial.ts";
import type {
  Fetch_requestPausedEvent,
  Network_Cookie,
  Runtime_consoleAPICalled,
} from "../bindings/celestial.ts";
import type { Browser } from "./browser.ts";
import { ElementHandle } from "./element_handle.ts";
import { convertToUint8Array, retryDeadline } from "./util.ts";
import { Mouse } from "./mouse.ts";
import { Keyboard } from "./keyboard.ts";
import { Touchscreen } from "./touchscreen.ts";
import { Dialog } from "./dialog.ts";
import { FileChooser } from "./file_chooser.ts";

export type DeleteCookieOptions = Omit<
  Parameters<Celestial["Network"]["deleteCookies"]>[0],
  "transferMode"
>;

export type GoToOptions = WaitForOptions & {
  referrer?: string;
};

export type PdfOptions = Omit<
  Parameters<Celestial["Page"]["printToPDF"]>[0],
  "transferMode"
>;

export type ScreenshotOptions = Parameters<
  Celestial["Page"]["captureScreenshot"]
>[0];

export type Cookie = Network_Cookie;

export type WaitForOptions = {
  waitUntil?: "none" | "load" | "networkidle0" | "networkidle2";
};

export interface WaitForSelectorOptions {
  timeout?: number;
}

export type WaitForNetworkIdleOptions = {
  idleTime?: number;
  idleConnections?: number;
};

export type SandboxOptions = {
  sandbox?: boolean;
};

type AnyArray = readonly unknown[];

export type EvaluateFunction<T, R extends AnyArray> =
  | string
  | ((...args: R) => T);

export interface EvaluateOptions<T> {
  args: Readonly<T>;
}

export interface PageEventMap {
  "console": ConsoleEvent;
  "dialog": DialogEvent;
  "filechooser": FileChooserEvent;
  "pageerror": PageErrorEvent;
}

export interface ConsoleEventDetails {
  type: Runtime_consoleAPICalled["type"];
  text: string;
}

export class ConsoleEvent extends CustomEvent<ConsoleEventDetails> {
  constructor(detail: ConsoleEventDetails) {
    super("console", { detail });
  }
}

export class DialogEvent extends CustomEvent<Dialog> {
  constructor(detail: Dialog) {
    super("dialog", { detail });
  }
}

export class FileChooserEvent extends CustomEvent<FileChooser> {
  constructor(detail: FileChooser) {
    super("filechooser", { detail });
  }
}

export class PageErrorEvent extends CustomEvent<Error> {
  constructor(detail: Error) {
    super("pageerror", { detail });
  }
}

/**
 * Page provides methods to interact with a single tab in the browser
 */
export class Page extends EventTarget {
  #id: string;
  #celestial: Celestial;
  #browser: Browser;
  #url: string | undefined;

  readonly timeout = 10000;
  readonly mouse: Mouse;
  readonly keyboard: Keyboard;
  readonly touchscreen: Touchscreen;

  constructor(
    id: string,
    url: string | undefined,
    ws: WebSocket,
    browser: Browser,
    options: SandboxOptions,
  ) {
    super();

    this.#id = id;
    this.#url = url;
    this.#celestial = new Celestial(ws);
    this.#browser = browser;

    this.#celestial.addEventListener("Page.frameNavigated", (e) => {
      const { frame } = e.detail;
      this.#url = frame.urlFragment ?? frame.url;
    });

    this.#celestial.addEventListener("Page.javascriptDialogOpening", (e) => {
      this.dispatchEvent(
        new DialogEvent(new Dialog(this.#celestial, e.detail)),
      );
    });

    this.#celestial.addEventListener("Page.fileChooserOpened", (e) => {
      const { frameId, mode, backendNodeId } = e.detail;
      if (!backendNodeId) return;
      this.dispatchEvent(
        new FileChooserEvent(
          new FileChooser(this.#celestial, { frameId, mode, backendNodeId }),
        ),
      );
    });

    this.#celestial.addEventListener("Runtime.consoleAPICalled", (e) => {
      const { type, args } = e.detail;
      let text = "";

      for (const arg of args) {
        if (text !== "") {
          text += " ";
        }
        // TODO(lino-levan): Extract this out into a function
        if (arg.type === "bigint") {
          text += arg.unserializableValue;
          continue;
        } else if (arg.type === "undefined") {
          text += "undefined";
          continue;
        } else if (arg.type === "object") {
          if (arg.subtype === "null") {
            text += "null";
            continue;
          }
        }
        text += arg.value;
      }

      this.dispatchEvent(new ConsoleEvent({ type, text }));
    });

    this.#celestial.addEventListener("Runtime.exceptionThrown", (e) => {
      const { exceptionDetails } = e.detail;
      // TODO(lino-levan): Do a bettery job at error serialization
      this.dispatchEvent(
        new PageErrorEvent(
          new Error(exceptionDetails.exception?.description ?? "Unknown error"),
        ),
      );
    });

    if (options?.sandbox) {
      this.#celestial.addEventListener("Fetch.requestPaused", async (e) => {
        const { requestId } = e.detail;
        if (!await this.#validateRequest(e.detail)) {
          return this.#celestial.Fetch.failRequest({
            requestId,
            errorReason: "AccessDenied",
          });
        }
        return this.#celestial.Fetch.continueRequest({ requestId });
      });
    }

    this.mouse = new Mouse(this.#celestial);
    this.keyboard = new Keyboard(this.#celestial);
    this.touchscreen = new Touchscreen(this.#celestial);
  }

  //TODO(@lowlighter): change "query" by "request" https://github.com/denoland/deno/issues/14668
  async #validateRequest({ request }: Fetch_requestPausedEvent["detail"]) {
    const { protocol, host, href } = new URL(request.url);
    if (host) {
      const { state } = await Deno.permissions.query({ name: "net", host });
      return (state === "granted");
    }
    if (protocol === "file:") {
      const path = fromFileUrl(href);
      const { state } = await Deno.permissions.query({ name: "read", path });
      return (state === "granted");
    }
    return true;
  }

  async #getRoot() {
    const doc = await retryDeadline(
      (async () => {
        while (true) {
          const root = await this.#celestial.DOM.getDocument({
            depth: 0,
          });
          if (root) return root;
        }
      })(),
      this.timeout,
    );
    return new ElementHandle(doc.root.nodeId, this.#celestial, this);
  }

  // @ts-ignore see below
  addEventListener<K extends keyof PageEventMap>(
    type: K,
    listener: (event: PageEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    // @ts-ignore TODO(lino-levan): Investigate why this is wrong
    super.addEventListener(type, listener, options);
  }

  /**
   * Returns raw celestial bindings for the page. Super unsafe unless you know what you're doing.
   */
  unsafelyGetCelestialBindings(): Celestial {
    return this.#celestial;
  }

  /**
   * Runs `document.querySelector` within the page. If no element matches the selector, the return value resolves to `null`.
   *
   * @example
   * ```ts
   * const elementWithClass = await page.$(".class");
   * ```
   */
  async $(selector: string): Promise<ElementHandle | null> {
    const root = await this.#getRoot();
    return root.$(selector);
  }

  /**
   * The method runs `document.querySelectorAll` within the page. If no elements match the selector, the return value resolves to `[]`.
   *
   * @example
   * ```ts
   * const elementsWithClass = await page.$$(".class");
   * ```
   */
  async $$(selector: string): Promise<ElementHandle[]> {
    const root = await this.#getRoot();
    return retryDeadline(root.$$(selector), this.timeout);
  }

  /**
   * Brings page to front (activates tab).
   *
   * @example
   * ```ts
   * await page.bringToFront();
   * ```
   */
  async bringToFront() {
    await retryDeadline(this.#celestial.Page.bringToFront(), this.timeout);
  }

  /**
   * Get the browser the page belongs to.
   */
  browser(): Browser {
    return this.#browser;
  }

  /**
   * Close this page in the browser
   */
  async close() {
    let success: boolean;
    let res = "";
    if (this.#browser.isRemoteConnection) {
      await this.#celestial.close();
      success = this.#browser.pages.includes(this);
    } else {
      const wsUrl = new URL(this.#celestial.ws.url);
      const req = await fetch(`http://${wsUrl.host}/json/close/${this.#id}`);
      res = await req.text();
      success = res === "Target is closing";
    }

    if (success) {
      const index = this.#browser.pages.indexOf(this);
      if (index > -1) {
        this.#browser.pages.splice(index, 1);
      }
      return;
    }

    await this.#celestial.close();

    throw new Error(`Page has already been closed or doesn't exist (${res})`);
  }

  /**
   * The full HTML contents of the page, including the DOCTYPE.
   */
  async content(): Promise<string> {
    // https://stackoverflow.com/questions/6088972/get-doctype-of-an-html-as-string-with-javascript
    const { result } = await retryDeadline(
      this.#celestial.Runtime.evaluate({
        expression:
          `"<!DOCTYPE " + document.doctype.name + (document.doctype.publicId ? ' PUBLIC "' + document.doctype.publicId + '"' : '') + (!document.doctype.publicId && document.doctype.systemId ? ' SYSTEM' : '') + (document.doctype.systemId ? ' "' + document.doctype.systemId + '"' : '') + '>\\n' + document.documentElement.outerHTML`,
      }),
      this.timeout,
    );

    return result.value;
  }

  /**
   * Set page content
   */
  async setContent(content: string): Promise<void> {
    await this.evaluate(
      (html) => {
        const { document } = globalThis as unknown as {
          document: {
            open: () => void;
            write: (html: string) => void;
            close: () => void;
          };
        };
        document.open();
        document.write(html);
        document.close();
      },
      { args: [content] },
    );
  }

  /**
   * `page.setViewportSize()` will resize the page. A lot of websites don't expect phones to change size, so you should set the viewport size before navigating to the page.
   */
  async setViewportSize(size: { width: number; height: number }) {
    await this.#celestial.Emulation.setDeviceMetricsOverride({
      ...size,
      deviceScaleFactor: 0,
      mobile: false,
    });
  }

  /**
   * If no URLs are specified, this method returns cookies for the current page URL. If URLs are specified, only cookies for those URLs are returned.
   */
  async cookies(...urls: string[]): Promise<Cookie[]> {
    const result = await retryDeadline(
      this.#celestial.Network.getCookies({
        urls: urls.length ? urls : undefined,
      }),
      this.timeout,
    );
    return result.cookies;
  }

  /**
   * Sets the specified cookies.
   */
  async setCookies(cookies: Cookie[]): Promise<void> {
    await retryDeadline(
      this.#celestial.Network.setCookies({
        cookies,
      }),
      this.timeout,
    );
  }

  /**
   * Deletes browser cookies with matching name and url or domain/path pair.
   */
  async deleteCookies(cookieDescription: DeleteCookieOptions): Promise<void> {
    await retryDeadline(
      this.#celestial.Network.deleteCookies(cookieDescription),
      this.timeout,
    );
  }

  // TODO: `Page.emulate` based on https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/common/Device.ts

  /**
   * Enables CPU throttling to emulate slow CPUs.
   */
  async emulateCPUThrottling(factor: number) {
    await retryDeadline(
      this.#celestial.Emulation.setCPUThrottlingRate({ rate: factor }),
      this.timeout,
    );
  }

  /**
   * Runs a function in the context of the page
   *
   * @example
   * ```ts
   * /// <reference lib="dom" />
   * const innerHTML = await page.evaluate(()=>document.body.innerHTML)
   * ```
   */
  async evaluate<T, R extends AnyArray>(
    func: EvaluateFunction<T, R>,
    evaluateOptions?: EvaluateOptions<R>,
  ): Promise<unknown> {
    if (typeof func === "function") {
      const args = evaluateOptions?.args ?? [];
      func = `(${func.toString()})(${
        args.map((arg) => `${JSON.stringify(arg)}`).join(",")
      })`;
    }
    const { result, exceptionDetails } = await retryDeadline(
      this.#celestial.Runtime.evaluate({
        expression: func,
        awaitPromise: true,
        returnByValue: true,
      }),
      this.timeout,
    );

    if (exceptionDetails) {
      throw exceptionDetails;
    }

    if (result.type === "bigint") {
      return BigInt(result.unserializableValue!.slice(0, -1));
    } else if (result.type === "undefined") {
      return undefined;
    } else if (result.type === "object") {
      if (result.subtype === "null") {
        return null;
      }
    }

    return result.value;
  }

  /**
   * This method navigate to the previous page in history.
   */
  // async goBack(options?: GoToOptions) {
  //   await this.waitForNavigation(options)
  // }

  /**
   * This method navigate to the next page in history.
   */
  // async goForward(options?: GoToOptions) {
  //   await this.waitForNavigation(options)
  // }

  /**
   * Navigate to the URL
   */
  async goto(url: string, options?: GoToOptions) {
    options = options ?? {};
    await Promise.all([
      retryDeadline(
        this.#celestial.Page.navigate({ url, ...options }),
        this.timeout,
      ),
      this.waitForNavigation(options),
    ]);
  }

  /**
   * Capture screenshot of page
   *
   * @example
   * ```ts
   * const pdf = await page.pdf();
   * Deno.writeFileSync("page.pdf", pdf)
   * ```
   */
  async pdf(opts?: PdfOptions): Promise<Uint8Array> {
    opts = opts ?? {};
    const { data } = await retryDeadline(
      this.#celestial.Page.printToPDF(opts),
      this.timeout,
    );
    return convertToUint8Array(data);
  }

  /**
   * Reload the given page
   *
   * @example
   * ```ts
   * await page.reload()
   * ```
   */
  async reload(options?: WaitForOptions) {
    await Promise.all([
      retryDeadline(this.#celestial.Page.reload({}), this.timeout),
      this.waitForNavigation(options),
    ]);
  }

  /**
   * Capture screenshot of page
   *
   * @example
   * ```ts
   * const screenshot = await page.screenshot();
   * Deno.writeFileSync("screenshot.png", screenshot)
   * ```
   */
  async screenshot(opts?: ScreenshotOptions): Promise<Uint8Array> {
    opts = opts ?? {};
    const { data } = await retryDeadline(
      this.#celestial.Page.captureScreenshot(opts),
      this.timeout,
    );
    return convertToUint8Array(data);
  }

  /**
   * The current URL of the page
   */
  get url(): string | undefined {
    return this.#url;
  }

  waitForEvent<T extends keyof PageEventMap>(
    event: T,
  ): Promise<PageEventMap[T]["detail"]> {
    return new Promise((resolve) => {
      this.addEventListener(
        event,
        (e) =>
          resolve(e.detail as unknown as Promise<PageEventMap[T]["detail"]>),
        { once: true },
      );
    });
  }

  /**
   * Runs a function in the context of the page until it returns a truthy value.
   */
  async waitForFunction<T, R extends AnyArray>(
    func: EvaluateFunction<T, R>,
    evaluateOptions?: EvaluateOptions<R>,
  ) {
    // TODO(lino-levan): Make this easier to read
    await deadline(
      (async () => {
        while (true) {
          const result = await this.evaluate(func, evaluateOptions);

          if (result) {
            return result;
          }
        }
      })(),
      this.timeout,
    );
  }

  /**
   * Waits for the page to navigate to a new URL or to reload. It is useful when you run code that will indirectly cause the page to navigate.
   */
  async waitForNavigation(options?: WaitForOptions): Promise<void> {
    options = options ?? { waitUntil: "networkidle2" };

    if (options.waitUntil === "none") {
      return;
    }

    if (options.waitUntil !== "load") {
      await this.waitForNavigation({ waitUntil: "load" });
    }

    return retryDeadline(
      new Promise<void>((resolve) => {
        if (options?.waitUntil === "load") {
          this.#celestial.addEventListener(
            "Page.loadEventFired",
            () => resolve(),
            { once: true },
          );
        } else if (options?.waitUntil === "networkidle0") {
          this.waitForNetworkIdle({ idleTime: 500 }).then(() => {
            resolve();
          });
        } else {
          this.waitForNetworkIdle({ idleTime: 500, idleConnections: 2 }).then(
            () => {
              resolve();
            },
          );
        }
      }),
      this.timeout,
    );
  }

  /**
   * Create a promise which resolves when network is idle
   */
  waitForNetworkIdle(options?: WaitForNetworkIdleOptions): Promise<void> {
    const idleTime = options?.idleTime ?? 500;
    const idleConnections = options?.idleConnections ?? 0;

    return retryDeadline(
      new Promise<void>((resolve) => {
        const timeoutDone = () => {
          this.#celestial.removeEventListener(
            "Network.requestWillBeSent",
            requestStarted,
          );
          this.#celestial.removeEventListener(
            "Network.loadingFailed",
            requestFinished,
          );
          this.#celestial.removeEventListener(
            "Network.loadingFinished",
            requestFinished,
          );
          resolve();
        };

        let timeout = setTimeout(timeoutDone, idleTime);

        let inflight = 0;

        const requestStarted = () => {
          inflight++;
          if (inflight > idleConnections) {
            clearTimeout(timeout);
          }
        };

        const requestFinished = () => {
          if (inflight === 0) return;
          inflight--;
          if (inflight === idleConnections) {
            timeout = setTimeout(timeoutDone, idleTime);
          }
        };

        this.#celestial.addEventListener(
          "Network.requestWillBeSent",
          requestStarted,
        );
        this.#celestial.addEventListener(
          "Network.loadingFailed",
          requestFinished,
        );
        this.#celestial.addEventListener(
          "Network.loadingFinished",
          requestFinished,
        );
      }),
      this.timeout,
    );
  }

  /**
   * Wait for the `selector` to appear in page. If at the moment of calling the method the `selector` already exists, the method will return immediately. If the `selector` doesn't appear after the timeout milliseconds (10000 by default) of waiting, the function will throw.
   *
   * @example
   * ```ts
   * await page.waitForSelector(".class");
   * ```
   */
  async waitForSelector(
    selector: string,
    options?: WaitForSelectorOptions,
  ): Promise<ElementHandle> {
    const root = await this.#getRoot();
    return root.waitForSelector(selector, options);
  }

  /**
   * Do not use if there is an alterate way of doing your thing
   *
   * @example
   * ```ts
   * await page.screenshot();
   * await page.waitForTimeout(2000);
   * await page.screenshot();
   * ```
   */
  async waitForTimeout(timeout: number) {
    await new Promise((r) => setTimeout(r, timeout));
  }
}
