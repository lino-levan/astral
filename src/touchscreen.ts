import { Celestial } from "../bindings/celestial.ts";

/**
 * The Touchscreen class exposes touchscreen events.
 */
export class Touchscreen {
  #celestial: Celestial;

  constructor(celestial: Celestial) {
    this.#celestial = celestial;
  }

  /**
   * Dispatches a `touchstart` and `touchend` event.
   */
  async tap(x: number, y: number) {
    await this.touchStart(x, y);
    await this.touchEnd();
  }

  /**
   * Dispatches a `touchend` event.
   */
  async touchEnd() {
    await this.#celestial.Input.dispatchTouchEvent({
      type: "touchEnd",
      touchPoints: [],
    });
  }

  /**
   * Dispatches a `touchMove` event.
   */
  async touchMove(x: number, y: number) {
    await this.#celestial.Input.dispatchTouchEvent({
      type: "touchMove",
      touchPoints: [{ x, y }],
    });
  }

  /**
   * Dispatches a `touchstart` event.
   */
  async touchStart(x: number, y: number) {
    await this.#celestial.Input.dispatchTouchEvent({
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
  }
}
