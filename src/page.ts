import { deadline } from "https://deno.land/std@0.196.0/async/deadline.ts";

import { Celestial, Network_Cookie } from "../bindings/celestial.ts";
import { Browser } from "./browser.ts";
import { ElementHandle } from "./elementHandle.ts";
import { BASE_URL, convertToUint8Array } from "./util.ts";
import { Mouse } from "./mouse.ts";
import { Keyboard } from "./keyboard.ts";

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
  waitUntil?: "load" | "networkidle0" | "networkidle2";
};

export type WaitForNetworkIdleOptions = {
  idleTime?: number;
  idleConnections?: number;
};

export class Page {
  #id: string;
  #celestial: Celestial;
  #browser: Browser;
  #timeout = 10000;

  readonly mouse: Mouse;
  readonly keyboard: Keyboard;

  constructor(id: string, ws: WebSocket, browser: Browser) {
    this.#id = id;
    this.#celestial = new Celestial(ws);
    this.#browser = browser;

    this.mouse = new Mouse(this.#celestial);
    this.keyboard = new Keyboard(this.#celestial);

    this.#celestial.Page.enable();
    this.#celestial.Page.setInterceptFileChooserDialog({ enabled: true });
  }

  /**
   * Runs `document.querySelector` within the page. If no element matches the selector, the return value resolves to `null`.
   *
   * @example
   * ```ts
   * const elementWithClass = await page.$(".class");
   * ```
   */
  async $(selector: string) {
    const doc = await deadline(
      this.#celestial.DOM.getDocument({ depth: 0 }),
      this.#timeout,
    );
    const root = new ElementHandle(doc.root.nodeId, this.#celestial, this);
    return deadline(root.$(selector), this.#timeout);
  }

  /**
   * The method runs `document.querySelectorAll` within the page. If no elements match the selector, the return value resolves to `[]`.
   *
   * @example
   * ```ts
   * const elementsWithClass = await page.$$(".class");
   * ```
   */
  async $$(selector: string) {
    const doc = await deadline(
      this.#celestial.DOM.getDocument({ depth: 0 }),
      this.#timeout,
    );
    const root = new ElementHandle(doc.root.nodeId, this.#celestial, this);
    return deadline(root.$$(selector), this.#timeout);
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
    await deadline(this.#celestial.Page.bringToFront(), this.#timeout);
  }

  /**
   * Get the browser the page belongs to.
   */
  browser() {
    return this.#browser;
  }

  /**
   * Close this page in the browser
   */
  async close() {
    const req = await fetch(`${BASE_URL}/json/close/${this.#id}`);
    const res = await req.text();

    if (res === "Target is closing") {
      const index = this.#browser.pages.indexOf(this);
      if (index > -1) {
        this.#browser.pages.splice(index, 1);
      }
      return;
    }

    throw new Error(`Page has already been closed or doesn't exist (${res})`);
  }

  /**
   * The full HTML contents of the page, including the DOCTYPE.
   */
  async content(): Promise<string> {
    // https://stackoverflow.com/questions/6088972/get-doctype-of-an-html-as-string-with-javascript
    const result = await deadline(
      this.#celestial.Runtime.evaluate({
        expression:
          `"<!DOCTYPE " + document.doctype.name + (document.doctype.publicId ? ' PUBLIC "' + document.doctype.publicId + '"' : '') + (!document.doctype.publicId && document.doctype.systemId ? ' SYSTEM' : '') + (document.doctype.systemId ? ' "' + document.doctype.systemId + '"' : '') + '>\\n' + document.documentElement.outerHTML`,
      }),
      this.#timeout,
    );

    return result.result.value;
  }

  /**
   * If no URLs are specified, this method returns cookies for the current page URL. If URLs are specified, only cookies for those URLs are returned.
   */
  async cookies(...urls: string[]): Promise<Cookie[]> {
    const result = await deadline(
      this.#celestial.Network.getCookies({ urls }),
      this.#timeout,
    );
    return result.cookies;
  }

  /**
   * Deletes browser cookies with matching name and url or domain/path pair.
   */
  async deleteCookies(cookieDescription: DeleteCookieOptions) {
    await deadline(
      this.#celestial.Network.deleteCookies(cookieDescription),
      this.#timeout,
    );
  }

  // TODO: `Page.emulate` based on https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/common/Device.ts

  /**
   * Enables CPU throttling to emulate slow CPUs.
   */
  async emulateCPUThrottling(factor: number) {
    await deadline(
      this.#celestial.Emulation.setCPUThrottlingRate({ rate: factor }),
      this.#timeout,
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
  async evaluate<T>(func: string | (() => T)) {
    if (typeof func === "function") {
      func = `(${func.toString()})()`;
    }
    const { result } = await deadline(
      this.#celestial.Runtime.evaluate({
        expression: func,
      }),
      this.#timeout,
    );

    if (result.type === "undefined") {
      return undefined;
    } else if (
      result.type === "string" || result.type === "number" ||
      result.type === "boolean"
    ) {
      return result.value;
    } else if (result.type === "bigint" && result.unserializableValue) {
      return BigInt(result.unserializableValue.slice(0, -1));
    }

    // TODO: investigate more serialization nonsense that we can do
    throw new Error("Unserializable value being returned from page.evaluate()");
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
      deadline(
        this.#celestial.Page.navigate({ url, ...options }),
        this.#timeout,
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
    const { data } = await deadline(
      this.#celestial.Page.printToPDF(opts),
      this.#timeout,
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
      deadline(this.#celestial.Page.reload({}), this.#timeout),
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
  async screenshot(opts?: ScreenshotOptions) {
    opts = opts ?? {};
    const { data } = await deadline(
      this.#celestial.Page.captureScreenshot(opts),
      this.#timeout,
    );
    return convertToUint8Array(data);
  }

  /**
   * Waits for the page to navigate to a new URL or to reload. It is useful when you run code that will indirectly cause the page to navigate.
   */
  async waitForNavigation(options?: WaitForOptions) {
    options = options ?? { waitUntil: "networkidle2" };

    if (options.waitUntil !== "load") {
      await this.waitForNavigation({ waitUntil: "load" });
    }

    return deadline(
      new Promise<void>((resolve) => {
        if (options?.waitUntil === "load") {
          const callback = () => {
            resolve();
            this.#celestial.removeEventListener(
              "Page_loadEventFired",
              callback,
            );
          };
          this.#celestial.addEventListener("Page_loadEventFired", callback);
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
      this.#timeout,
    );
  }

  waitForNetworkIdle(options?: WaitForNetworkIdleOptions) {
    const idleTime = options?.idleTime ?? 500;
    const idleConnections = options?.idleConnections ?? 0;

    return deadline(
      new Promise<void>((resolve) => {
        const timeoutDone = () => {
          this.#celestial.removeEventListener(
            "Network_requestWillBeSent",
            requestStarted,
          );
          this.#celestial.removeEventListener(
            "Network_loadingFailed",
            requestFinished,
          );
          this.#celestial.removeEventListener(
            "Network_loadingFinished",
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
          "Network_requestWillBeSent",
          requestStarted,
        );
        this.#celestial.addEventListener(
          "Network_loadingFailed",
          requestFinished,
        );
        this.#celestial.addEventListener(
          "Network_loadingFinished",
          requestFinished,
        );
      }),
      this.#timeout,
    );
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
