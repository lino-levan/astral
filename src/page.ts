export class Page {
  #ws: WebSocket;
  #closed: boolean;
  constructor(ws: WebSocket) {
    this.#ws = ws;
    this.#closed = false;
  }

  // close()
}
