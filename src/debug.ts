// Needed to fix `Deno.permissions.querySync` not being defined in Deno Deploy
// See: https://github.com/denoland/deploy_feedback/issues/527
let querySync = Deno.permissions.querySync;
if (!querySync) {
  const permissions: Record<string, Deno.PermissionState> = {
    run: "denied",
    read: "granted",
    write: "denied",
    net: "granted",
    env: "granted",
    sys: "denied",
    ffi: "denied",
  } as const;

  querySync = ({ name }) => {
    return {
      state: permissions[name],
      onchange: null,
      partial: false,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    };
  };
}

/** Whether to enable debug logging. */
export const DEBUG =
  (querySync({ name: "env", variable: "DEBUG" }).state === "granted") &&
  (!!Deno.env.get("DEBUG"));

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
