import { deadline } from "@std/async/deadline";
import { retry } from "@std/async/retry";
import type { Celestial, Network_Request } from "../bindings/celestial.ts";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

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

/**
 * Utility to convert a CDP network request to a `Request` object
 * Note: the received body is encoded in base64
 */
export function cdpRequestToRequest(request: Network_Request): Request {
  const body = request.hasPostData
    ? new ReadableStream<Uint8Array<ArrayBufferLike>>({
      pull(controller) {
        const entry = request.postDataEntries!.shift();
        if (!entry?.bytes) {
          return controller.close();
        }
        controller.enqueue(decodeBase64(entry.bytes));
      },
      cancel() {
        request.postDataEntries!.length = 0;
      },
    })
    : null;

  return new Request(request.url, {
    body,
    method: request.method,
    headers: new Headers(request.headers as HeadersInit),
  });
}

/**
 * Utility to convert a `Response` object to a CDP network response
 * Note: the responded body must be encoded into base64
 */
export async function responseToCdpResponse(
  response: Response,
): Promise<
  Omit<Parameters<Celestial["Fetch"]["fulfillRequest"]>[0], "requestId">
> {
  return {
    responseCode: response.status,
    responsePhrase: response.statusText ? response.statusText : undefined,
    responseHeaders: [...response.headers.entries()].map(([name, value]) => ({
      name,
      value,
    })),
    body: response.body ? encodeBase64(await response.text()) : undefined,
  };
}
