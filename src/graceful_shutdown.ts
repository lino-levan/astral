export type GracefulShutdownHandler = () => Promise<void> | void;

const windows_signals = [
  "SIGINT",
  "SIGBREAK",
] as const;

const unix_signals = [
  "SIGINT",
  "SIGTERM",
  "SIGUSR2",
  "SIGPIPE",
  "SIGHUP",
] as const;

const signals = Deno.build.os === "windows" ? windows_signals : unix_signals;

const gracefulHandlers: Set<GracefulShutdownHandler> = new Set();

let gracefulExitStarted = false;

export async function shutdown() {
  if (gracefulExitStarted) return;
  else gracefulExitStarted = true;

  for (const signal of signals) {
    Deno.removeSignalListener(signal, shutdown);
  }

  for (const handler of gracefulHandlers) {
    try {
      await handler();
    } catch (error) {
      console.error("Error in the handler (graceful shutdown)", error);
    }
  }

  Deno.exit(0);
}

for (const signal of signals) {
  Deno.addSignalListener(signal, shutdown);
}

export function onShutdown(handler: GracefulShutdownHandler) {
  gracefulHandlers.add(handler);
}
