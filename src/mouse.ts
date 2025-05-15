import type { Celestial, Input_MouseButton } from "../bindings/celestial.ts";
import type { KeyboardPageData } from "./keyboard/mod.ts";

/** Options for mouse clicking. */
export interface MouseClickOptions {
  count?: number;
  delay?: number;
}

/** Options for mouse events. */
export interface MouseOptions {
  button?: Input_MouseButton;
  clickCount?: number;
}

/**
 * The Mouse class operates in main-frame CSS pixels relative to the top-left corner of the viewport.
 */
export class Mouse {
  #celestial: Celestial;
  #x = 0;
  #y = 0;
  #keyboardPageData: KeyboardPageData;

  constructor(celestial: Celestial, keyboardPageData?: KeyboardPageData) {
    this.#celestial = celestial;
    this.#keyboardPageData = keyboardPageData || { modifiers: 0 };
  }

  /**
   * Shortcut for `mouse.move`, `mouse.down` and `mouse.up`.
   */
  async click(x: number, y: number, opts?: MouseClickOptions) {
    await this.move(x, y);

    const totalCount = opts?.count ?? 1;
    let clickCount = 0;

    while (clickCount < totalCount) {
      clickCount++;
      await this.down({ clickCount });
      await new Promise((r) => setTimeout(r, opts?.delay ?? 0));
      await this.up({ clickCount });
    }
  }

  /**
   * Presses the mouse.
   */
  async down(opts?: MouseOptions) {
    await this.#celestial.Input.dispatchMouseEvent({
      type: "mousePressed",
      x: this.#x,
      y: this.#y,
      button: opts?.button ?? "left",
      clickCount: opts?.clickCount ?? 1,
      modifiers: this.#keyboardPageData.modifiers,
    });
  }

  /**
   * Moves the mouse to the given coordinate.
   */
  async move(x: number, y: number, options?: { steps?: number }) {
    const startX = this.#x;
    const startY = this.#y;
    const steps = options?.steps ?? 1;
    let stepsLeft = steps;

    while (stepsLeft > 0) {
      stepsLeft--;
      this.#x += (x - startX) / steps;
      this.#y += (y - startY) / steps;
      await this.#celestial.Input.dispatchMouseEvent({
        type: "mouseMoved",
        x: this.#x,
        y: this.#y,
        modifiers: this.#keyboardPageData.modifiers,
      });
    }
  }

  /**
   * Resets the mouse to the default state: No buttons pressed; position at (0,0).
   */
  async reset() {
    this.#x = 0;
    this.#y = 0;

    await this.#celestial.Input.dispatchMouseEvent({
      type: "mouseMoved",
      x: 0,
      y: 0,
      modifiers: this.#keyboardPageData.modifiers,
    });
  }

  /**
   * Releases the mouse.
   */
  async up(opts?: MouseOptions) {
    await this.#celestial.Input.dispatchMouseEvent({
      type: "mouseReleased",
      x: this.#x,
      y: this.#y,
      button: opts?.button ?? "left",
      clickCount: opts?.clickCount ?? 1,
      modifiers: this.#keyboardPageData.modifiers,
    });
  }

  /**
   * Dispatches a `mousewheel` event.
   */
  async wheel(options?: { deltaX?: number; deltaY?: number }) {
    await this.#celestial.Input.dispatchMouseEvent({
      type: "mouseWheel",
      x: this.#x,
      y: this.#y,
      deltaX: options?.deltaX ?? 0,
      deltaY: options?.deltaY ?? 0,
      modifiers: this.#keyboardPageData.modifiers,
    });
  }
}
