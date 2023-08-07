import { Celestial } from "../bindings/celestial.ts";
import { KeyboardTypeOptions } from "./keyboard.ts";
import { Page, ScreenshotOptions } from "./page.ts";

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
    const result = await this.#celestial.DOM.querySelector({
      nodeId: this.#id,
      selector,
    });

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
    const result = await this.#celestial.DOM.querySelectorAll({
      nodeId: this.#id,
      selector,
    });

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
    const result = await this.#celestial.DOM.getBoxModel({ nodeId: this.#id });

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
    let model: BoxModel | null;
    do {
      model = await this.boxModel();
    } while (!model);

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
    await this.#celestial.DOM.focus({ nodeId: this.#id });
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
    await this.#celestial.DOM.scrollIntoViewIfNeeded({ nodeId: this.#id });
  }

  /**
   * Focuses the element, and then sends a `keydown`, `keypress`/`input`, and `keyup` event for each character in the text.
   */
  async type(text: string, opts?: KeyboardTypeOptions) {
    await this.focus();
    await this.#page.keyboard.type(text, opts);
  }
}
