import { deadline } from "https://deno.land/std@0.205.0/async/deadline.ts";

import { Celestial } from "../bindings/celestial.ts";
import { KeyboardTypeOptions } from "./keyboard.ts";
import { Page, ScreenshotOptions } from "./page.ts";
import { retryDeadline } from "./util.ts";

export interface Offset {
  x: number;
  y: number;
}

export type Point = Offset;

export interface BoundingBox extends Point {
  height: number;
  width: number;
}

export interface BoxModel {
  border: Point[];
  content: Point[];
  height: number;
  margin: Point[];
  padding: Point[];
  width: number;
}

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
  async $(selector: string) {
    const result = await retryDeadline(
      this.#celestial.DOM.querySelector({
        nodeId: this.#id,
        selector,
      }),
      this.#page.timeout,
    );

    if (!result) {
      return null;
    }

    return new ElementHandle(result.nodeId, this.#celestial, this.#page);
  }

  /**
   * Queries the current element for all elements matching the given selector.
   *
   * @example
   * ```ts
   * const elementsWithClass = await element.$$(".class");
   * ```
   */
  async $$(selector: string) {
    const result = await retryDeadline(
      this.#celestial.DOM.querySelectorAll({
        nodeId: this.#id,
        selector,
      }),
      this.#page.timeout,
    );

    if (!result) {
      return [];
    }

    return result.nodeIds.map((nodeId) =>
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
  async click(opts?: { offset?: Offset }) {
    await this.scrollIntoView();

    const model: BoxModel | null = await this.boxModel();
    if (!model) throw new Error("Unable to get stable box model to click on");

    const { x, y } = getTopLeft(model.content);

    if (opts?.offset) {
      await this.#page.mouse.click(
        x + opts.offset.x,
        y + opts.offset.y,
      );
    } else {
      await this.#page.mouse.click(
        x + (model.width / 2),
        y + (model.height / 2),
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
  async innerText() {
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
  async screenshot(opts?: Omit<ScreenshotOptions, "clip">) {
    await this.scrollIntoView();
    const box = await this.boundingBox();

    if (!box) {
      throw new Error(
        "No bounding box found when trying to screenshot element",
      );
    }

    return await this.#page.screenshot({
      ...opts,
      clip: {
        ...box,
        scale: 1,
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
  async waitForSelector(selector: string) {
    // TODO(lino-levan): Make this easier to read, it's a little scuffed
    return await deadline<ElementHandle>(
      (async () => {
        while (true) {
          const result = await this.#celestial.DOM.querySelector({
            nodeId: this.#id,
            selector,
          });

          if (!result) {
            continue;
          }

          return new ElementHandle(result.nodeId, this.#celestial, this.#page);
        }
      })(),
      this.#page.timeout,
    );
  }
}
