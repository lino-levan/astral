import { deadline } from "@std/async/deadline";

import type { Celestial, Runtime_CallArgument } from "../bindings/celestial.ts";
import type { KeyboardTypeOptions } from "./keyboard/mod.ts";
import type { MouseClickOptions } from "./mouse.ts";
import type {
  Page,
  ScreenshotOptions,
  WaitForSelectorOptions,
} from "./page.ts";
import { retryDeadline } from "./util.ts";
import { query, queryAll, type QueryStrategy } from "./query.ts";
export { type QueryStrategy } from "./query.ts";

/** The x and y coordinates of a point. */
export interface Offset {
  x: number;
  y: number;
}

/** The x and y coordinates of a point. */
export type Point = Offset;

/** The xywh model of an element. */
export interface BoundingBox extends Point {
  height: number;
  width: number;
}

/** The box model of an element. */
export interface BoxModel {
  border: Point[];
  content: Point[];
  height: number;
  margin: Point[];
  padding: Point[];
  width: number;
}

/** Click options on an element */
export type ElementClickOptions = { offset?: Offset } & MouseClickOptions;

function intoPoints(pointsRaw: number[]) {
  const points: Point[] = [];

  for (let pair = 0; pair < pointsRaw.length; pair += 2) {
    points.push({
      x: pointsRaw[pair],
      y: pointsRaw[pair + 1],
    });
  }

  return points;
}

function getTopLeft(points: Point[]) {
  let result = points[0];

  for (const point of points) {
    if (point.x < result.x && point.y < result.y) {
      result = point;
    }
  }

  return result;
}

type AnyArray = readonly unknown[];

/** The evaluate function for `ElementHandle.evaluate` method. */
export type ElementEvaluateFunction<
  E extends unknown,
  R extends AnyArray,
  T,
> = (element: E, ...args: R) => T;

/** The options for `ElementHandle.evaluate` method. */
export interface ElementEvaluateOptions<T> {
  args: Readonly<T>;
}

/** The options for selector methods. */
export type SelectorOptions = {
  strategy?: QueryStrategy;
};

/**
 * ElementHandle represents an in-page DOM element.
 */
export class ElementHandle {
  #id: number;
  #celestial: Celestial;
  #page: Page;

  constructor(id: number, celestial: Celestial, page: Page) {
    this.#id = id;
    this.#celestial = celestial;
    this.#page = page;
  }

  /**
   * Queries the current element for an element matching the given selector.
   *
   * @example
   * ```ts
   * const elementWithClass = await element.$(".class");
   * ```
   */
  async $(
    selector: string,
    opts?: SelectorOptions,
  ): Promise<ElementHandle | null> {
    const nodeId = await retryDeadline(
      query(this.#celestial, {
        nodeId: this.#id,
        selector,
        strategy: opts?.strategy || "native",
      }),
      this.#page.timeout,
    );

    if (!nodeId) {
      return null;
    }

    return new ElementHandle(nodeId, this.#celestial, this.#page);
  }

  /**
   * Queries the current element for all elements matching the given selector.
   *
   * @example
   * ```ts
   * const elementsWithClass = await element.$$(".class");
   * ```
   */
  async $$(selector: string, opts?: SelectorOptions): Promise<ElementHandle[]> {
    const nodeIds = await retryDeadline(
      queryAll(this.#celestial, {
        nodeId: this.#id,
        selector,
        strategy: opts?.strategy || "native",
      }),
      this.#page.timeout,
    );

    return nodeIds.map((nodeId) =>
      new ElementHandle(nodeId, this.#celestial, this.#page)
    );
  }

  /**
   * This method returns boxes of the element, or `null` if the element is not visible.
   */
  async boundingBox(): Promise<BoundingBox | null> {
    const result = await this.boxModel();

    if (!result) {
      return null;
    }

    const { x, y } = getTopLeft(result.content);

    return {
      x,
      y,
      width: result.width,
      height: result.height,
    };
  }

  /**
   * This method returns boxes of the element, or `null` if the element is not visible.
   */
  async boxModel(): Promise<BoxModel | null> {
    const result = await retryDeadline(
      this.#celestial.DOM.getBoxModel({ nodeId: this.#id }),
      this.#page.timeout,
    );

    if (!result) {
      return null;
    }

    const { model } = result;

    return {
      border: intoPoints(model.border),
      content: intoPoints(model.content),
      height: model.height,
      margin: intoPoints(model.margin),
      padding: intoPoints(model.padding),
      width: model.width,
    };
  }

  /**
   * This method scrolls element into view if needed, and then uses `Page.mouse` to click in the center of the element.
   */
  async click(opts?: ElementClickOptions) {
    await this.scrollIntoView();

    const model: BoxModel | null = await this.boxModel();
    if (!model) throw new Error("Unable to get stable box model to click on");

    const { x, y } = getTopLeft(model.content);

    if (opts?.offset) {
      await this.#page.mouse.click(
        x + opts.offset.x,
        y + opts.offset.y,
        opts,
      );
    } else {
      await this.#page.mouse.click(
        x + (model.width / 2),
        y + (model.height / 2),
        opts,
      );
    }
  }

  /**
   * Calls `focus` on the element.
   */
  async focus() {
    await retryDeadline(
      this.#celestial.DOM.focus({ nodeId: this.#id }),
      this.#page.timeout,
    );
  }

  /**
   * Returns the `element.innerHTML`
   */
  async innerHTML(): Promise<string> {
    return await retryDeadline(
      (async () => {
        const { object } = await this.#celestial.DOM.resolveNode({
          nodeId: this.#id,
        });

        const result = await this.#celestial.Runtime.callFunctionOn({
          functionDeclaration: "(element)=>element.innerHTML",
          objectId: object.objectId,
          arguments: [
            {
              objectId: object.objectId,
            },
          ],
          awaitPromise: true,
          returnByValue: true,
        });

        return result.result.value;
      })(),
      this.#page.timeout,
    );
  }

  /**
   * Returns the `element.innerText`
   */
  async innerText(): Promise<string> {
    return await retryDeadline(
      (async () => {
        const { object } = await this.#celestial.DOM.resolveNode({
          nodeId: this.#id,
        });

        const result = await this.#celestial.Runtime.callFunctionOn({
          functionDeclaration: "(element)=>element.innerText",
          objectId: object.objectId,
          arguments: [
            {
              objectId: object.objectId,
            },
          ],
          awaitPromise: true,
          returnByValue: true,
        });

        return result.result.value;
      })(),
      this.#page.timeout,
    );
  }

  /**
   * This method scrolls element into view if needed, and then uses `Page.screenshot()` to take a screenshot of the element.
   */
  async screenshot(
    opts?: Omit<ScreenshotOptions, "clip"> & { scale?: number },
  ): Promise<Uint8Array> {
    await this.scrollIntoView();

    const boxModel = await this.boxModel();
    if (!boxModel) {
      throw new Error(
        "No bounding box found when trying to screenshot element",
      );
    }

    return await this.#page.screenshot({
      ...opts,
      clip: {
        x: boxModel.border[0].x,
        y: boxModel.border[0].y,
        width: boxModel.border[2].x - boxModel.border[0].x,
        height: boxModel.border[2].y - boxModel.border[0].y,
        scale: opts?.scale ?? 1,
      },
    });
  }

  /**
   * Scrolls the element into view using the automation protocol client.
   */
  async scrollIntoView() {
    await retryDeadline(
      this.#celestial.DOM.scrollIntoViewIfNeeded({ nodeId: this.#id }),
      this.#page.timeout,
    );
  }

  /**
   * Focuses the element, and then sends a `keydown`, `keypress`/`input`, and `keyup` event for each character in the text.
   */
  async type(text: string, opts?: KeyboardTypeOptions) {
    await this.focus();
    await this.#page.keyboard.type(text, opts);
  }

  /**
   * Wait for an element matching the given selector to appear in the current element.
   */
  async waitForSelector(
    selector: string,
    options?: WaitForSelectorOptions & SelectorOptions,
  ): Promise<ElementHandle> {
    // TODO(lino-levan): Make this easier to read, it's a little scuffed
    try {
      return await deadline<ElementHandle>(
        (async () => {
          while (true) {
            const nodeId = await query(this.#celestial, {
              nodeId: this.#id,
              selector,
              strategy: options?.strategy || "native",
            });

            if (!nodeId) {
              continue;
            }

            return new ElementHandle(
              nodeId,
              this.#celestial,
              this.#page,
            );
          }
        })(),
        options?.timeout || this.#page.timeout,
      );
    } catch {
      throw new Error(`Unable to get element from selector: ${selector}`);
    }
  }

  /**
   * Retrieve the attributes of an element.
   * Returns the key-value object
   */
  async getAttributes(): Promise<Record<string, string>> {
    return await retryDeadline(
      (async () => {
        const { attributes } = await this.#celestial.DOM.getAttributes({
          nodeId: this.#id,
        });

        const map: Record<string, string> = {};

        for (let i = 0; i < attributes.length; i += 2) {
          const key = attributes[i];
          const value = attributes[i + 1];
          map[key] = value;
        }

        return map;
      })(),
      this.#page.timeout,
    );
  }

  /**
   * Returns the `element.getAttribute`
   */
  async getAttribute(name: string): Promise<string | "" | null> {
    return await retryDeadline(
      (async () => {
        const { object } = await this.#celestial.DOM.resolveNode({
          nodeId: this.#id,
        });

        const result = await this.#celestial.Runtime.callFunctionOn({
          functionDeclaration: "(element,name)=>element.getAttribute(name)",
          objectId: object.objectId,
          arguments: [
            {
              objectId: object.objectId,
            },
            {
              value: name,
            },
          ],
          awaitPromise: true,
          returnByValue: true,
        });

        return result.result.value;
      })(),
      this.#page.timeout,
    );
  }

  /**
   * Executes the given function or string whose first argument is a DOM element and returns the result of the execution.
   *
   * @example
   * ```ts
   * /// <reference lib="dom" />
   * const value: string = await element.evaluate((element: HTMLInputElement) => element.value)
   * ```
   *
   * @example
   * ```
   * /// <reference lib="dom" />
   * await element.evaluate(
   *  (el: HTMLInputElement, key: string, value: string) => el.setAttribute(key, value),
   *  { args: ["href", "astral"] }
   * )
   * ```
   */
  async evaluate<E extends unknown, R extends AnyArray, T = unknown>(
    func: ElementEvaluateFunction<E, R, T> | string,
    evaluateOptions?: ElementEvaluateOptions<R>,
  ): Promise<T> {
    const { object } = await retryDeadline(
      this.#celestial.DOM.resolveNode({
        nodeId: this.#id,
      }),
      this.#page.timeout,
    );

    const args: Runtime_CallArgument[] = [{
      objectId: object.objectId,
    }];

    if (evaluateOptions?.args) {
      for (const argument of evaluateOptions.args) {
        if (Number.isNaN(argument)) {
          args.push({
            unserializableValue: "NaN",
          });
        } else {
          args.push({
            value: argument,
          });
        }
      }
    }

    const { result, exceptionDetails } = await retryDeadline(
      this.#celestial.Runtime
        .callFunctionOn({
          functionDeclaration: func.toString(),
          objectId: object.objectId,
          arguments: args,
          awaitPromise: true,
          returnByValue: true,
        }),
      this.#page.timeout,
    );

    if (exceptionDetails) {
      throw exceptionDetails;
    }

    if (result.type === "bigint") {
      return BigInt(result.unserializableValue!.slice(0, -1)) as T;
    } else if (result.type === "undefined") {
      return undefined as T;
    } else if (result.type === "object") {
      if (result.subtype === "null") {
        return null as T;
      }
    } else if (result.type === "number") {
      if (result.unserializableValue === "NaN") {
        return NaN as T;
      }
    }

    return result.value;
  }
}
