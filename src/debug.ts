/** Whether to enable debug logging. */
export const DEBUG = !!Deno.env.get("DEBUG");

/** Attach a websocket to the console for debugging. */
export function attachWs(ws: WebSocket) {
  ws.addEventListener("message", (ev) => {
    console.log(`<--`, ev.data);
  });

  const send = ws.send.bind(ws);
  ws.send = (data) => {
    console.log(`-->`, data);
    return send(data);
  };
}
