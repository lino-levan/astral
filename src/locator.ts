import { retry } from "@std/async/retry";
import { deadline } from "@std/async/deadline";
import type { Page } from "./page.ts";
import type { ElementHandle } from "./element_handle.ts";
import type { ElementClickOptions } from "./element_handle.ts";

/** Locator provides an api for interacting with elements on a page in a way that avoids race conditions. */
export class Locator<T> {
  #page: Page;
  #selector: string;
  #timeout: number;

  constructor(
    page: Page,
    selector: string,
    timeout: number,
  ) {
    this.#page = page;
    this.#selector = selector;
    this.#timeout = timeout;
  }

  async #runLocator<T>(func: (handle: ElementHandle) => Promise<T>) {
    return await retry(async () => {
      const p = (async () => {
        await this.#page.waitForSelector(this.#selector);
        const handle = await this.#page.$(this.#selector);
        if (handle === null) {
          throw new Error(`Selector "${this.#selector}" not found.`);
        }

        return await func(handle);
      })();
      await deadline(p, this.#timeout);
      return await p;
    });
  }

  /** Clicks the element. */
  async click(opts?: ElementClickOptions) {
    await this.#runLocator(async (handle) => {
      await handle.click(opts);
    });
  }

  /** Evaluates the given function in the context of the element. */
  async evaluate<R>(fn: (el: T) => R): Promise<R> {
    return await this.#runLocator(async (handle) => {
      // deno-lint-ignore no-explicit-any
      return await handle.evaluate(fn, { args: [handle] as any }) as R;
    });
  }

  /** Fills the element with the given text. */
  async fill(text: string) {
    await this.#runLocator(async (handle) => {
      await handle.type(text);
    });
  }

  /** Focuses the element. */
  async focus() {
    await this.#runLocator(async (handle) => {
      await handle.focus();
    });
  }

  /** Waits for the element to appear in the page. */
  async wait(): Promise<ElementHandle> {
    return await this.#page.waitForSelector(this.#selector);
  }
}
