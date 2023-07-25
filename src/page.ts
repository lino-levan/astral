import { Celestial } from "../bindings/celestial.ts";
import { Browser } from "./browser.ts";

export class Page {
  #celestial: Celestial;
  #browser: Browser;
  #closed: boolean;

  constructor(ws: WebSocket, browser: Browser) {
    this.#celestial = new Celestial(ws);
    this.#browser = browser;
    this.#closed = false;
  }

  /**
   * Do not use if there is an alterate way of doing your thing
   */
  async sleep(timeout: number) {
    await new Promise(r => setTimeout(r, timeout));
  }

  async screenshot(): Promise<Uint8Array> {
    // TODO: find a more efficient way of converting between base64 and a uint8array
    const { data } = await this.#celestial.Page.captureScreenshot({});
    const url = `data:image/png;base64,${data}`;
    const req = await fetch(url);
    return new Uint8Array(await req.arrayBuffer());
  }
}
