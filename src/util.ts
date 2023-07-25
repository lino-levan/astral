export async function websocketReady(ws: WebSocket) {
  await new Promise<void>((res) => {
    ws.onopen = () => {
      res();
    };
  });
}
