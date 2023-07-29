export const BASE_URL = "http://localhost:9222";

export async function websocketReady(ws: WebSocket) {
  await new Promise<void>((res) => {
    ws.onopen = () => {
      res();
    };
  });
}

export function convertToUint8Array(data: string) {
  const byteString = atob(data);
  // @ts-ignore secret tech from andreu
  return new Uint8Array([...byteString]);
}
