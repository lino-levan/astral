import { deadline } from "@std/async/deadline";
import { retry } from "@std/async/retry";

/** Regular expression to extract the endpoint from a websocket url */
export const WEBSOCKET_ENDPOINT_REGEX = /ws:\/\/(.*:.*?)\//;

/**
 * Utility method to wait until a websocket is ready
 */
export async function websocketReady(ws: WebSocket) {
  await new Promise<void>((res) => {
    ws.onopen = () => {
      res();
    };
  });
}

/**
 * Utility method to convert a base64 encoded string into a byte array
 */
export function convertToUint8Array(data: string): Uint8Array {
  const byteString = atob(data);
  return new Uint8Array([...byteString].map((ch) => ch.charCodeAt(0)));
}

/**
 * Utility method to retry an operation a number of times with a deadline
 */
export function retryDeadline<T>(t: Promise<T>, timeout: number): Promise<T> {
  return retry<T>(() => deadline(t, timeout));
}
