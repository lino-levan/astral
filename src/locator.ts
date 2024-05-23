import { retry } from "@std/async/retry";
import { deadline } from "@std/async/deadline";
import type { Page } from "./page.ts";
import type { ElementHandle } from "./element_handle.ts";

export class Locator<T extends Element> {
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

  async wait(): Promise<ElementHandle> {
    return await this.#page.waitForSelector(this.#selector);
  }

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
