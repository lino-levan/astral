import { Celestial } from "../bindings/celestial.ts";

export class Touchscreen {
  #celestial: Celestial;

  constructor(celestial: Celestial) {
    this.#celestial = celestial;
  }

  async tap(x: number, y: number) {
    await this.touchStart(x, y);
    await this.touchEnd();
  }

  async touchEnd() {
    await this.#celestial.Input.dispatchTouchEvent({
      type: "touchEnd",
      touchPoints: [],
    });
  }

  async touchMove(x: number, y: number) {
    await this.#celestial.Input.dispatchTouchEvent({
      type: "touchMove",
      touchPoints: [{ x, y }],
    });
  }

  async touchStart(x: number, y: number) {
    await this.#celestial.Input.dispatchTouchEvent({
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
  }
}
