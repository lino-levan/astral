import type {
  Celestial,
  Network_ErrorReason,
  Network_Request,
} from "../bindings/celestial.ts";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

/**
 * Creates a new interceptor error.
 *
 * When thrown within an {@linkcode InterceptorOptions.interceptor} handler,
 * the captured network request will be aborted with the specified CDS reason.
 */
export class InterceptorError extends Error {
  constructor(
    reason: Network_ErrorReason = "Failed",
    message: string = reason,
  ) {
    super(message);
    this.reason = reason;
  }

  /** Abort reason */
  readonly reason: Network_ErrorReason;
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
