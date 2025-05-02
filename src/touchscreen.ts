import type { Celestial } from "../bindings/celestial.ts";
import type { KeyboardPageData } from "./keyboard/mod.ts";

/**
 * The Touchscreen class exposes touchscreen events.
 */
export class Touchscreen {
  #celestial: Celestial;
  #keyboardPageData: KeyboardPageData;

  constructor(celestial: Celestial, keyboardPageData?: KeyboardPageData) {
    this.#celestial = celestial;
    this.#keyboardPageData = keyboardPageData || { modifiers: 0 };
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
      modifiers: this.#keyboardPageData.modifiers,
    });
  }

  /**
   * Dispatches a `touchMove` event.
   */
  async touchMove(x: number, y: number) {
    await this.#celestial.Input.dispatchTouchEvent({
      type: "touchMove",
      touchPoints: [{ x, y }],
      modifiers: this.#keyboardPageData.modifiers,
    });
  }

  /**
   * Dispatches a `touchstart` event.
   */
  async touchStart(x: number, y: number) {
    await this.#celestial.Input.dispatchTouchEvent({
      type: "touchStart",
      touchPoints: [{ x, y }],
      modifiers: this.#keyboardPageData.modifiers,
    });
  }
}
