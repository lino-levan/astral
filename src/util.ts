import { deadline } from "https://deno.land/std@0.201.0/async/deadline.ts";
import { retry } from "https://deno.land/std@0.201.0/async/retry.ts";

export const BASE_URL = "http://localhost:9222";

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
export function convertToUint8Array(data: string) {
  const byteString = atob(data);
  return new Uint8Array([...byteString].map((ch) => ch.charCodeAt(0)));
}

/**
 * Utility method to retry an operation a number of times with a deadline
 */
export function retryDeadline<T>(t: Promise<T>, timeout: number): Promise<T> {
  return retry<T>(() => deadline(t, timeout));
}
