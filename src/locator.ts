import { retry } from "@std/async/retry";
import { deadline } from "@std/async/deadline";
import type { Page } from "./page.ts";
import type { ElementHandle } from "./element_handle.ts";

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

  /** Clicks the element. */
  async click() {
    await retry(async () => {
      const p = this.#click();
      await deadline(p, this.#timeout);
    });
  }

  async #click() {
    await this.#page.waitForSelector(this.#selector);
    const handle = await this.#page.$(this.#selector);
    if (handle === null) {
      throw new Error(`Selector "${this.#selector}" not found.`);
    }

    await handle.click();
  }

  /** Fills the element with the given text. */
  async fill(text: string) {
    await retry(async () => {
      const p = this.#fill(text);
      await deadline(p, this.#timeout);
    });
  }

  async #fill(text: string) {
    await this.#page.waitForSelector(this.#selector);
    const handle = await this.#page.$(this.#selector);
    if (handle === null) {
      throw new Error(`Selector "${this.#selector}" not found.`);
    }

    await handle.type(text);
  }

  /** Waits for the element to appear in the page. */
  async wait(): Promise<ElementHandle> {
    return await this.#page.waitForSelector(this.#selector);
  }

  /** Evaluates the given function in the context of the element. */
  async evaluate<R>(fn: (el: T) => R): Promise<R> {
    return await retry(async () => {
      const p = this.#evaluate(fn);
      return await deadline(p, this.#timeout);
    });
  }

  async #evaluate<R>(fn: (el: T) => R): Promise<R> {
    await this.#page.waitForSelector(this.#selector);
    const handle = await this.#page.$(this.#selector);
    if (handle === null) {
      throw new Error(`Selector "${this.#selector}" not found.`);
    }

    // deno-lint-ignore no-explicit-any
    return await handle.evaluate(fn, { args: [handle] as any }) as R;
  }
}
