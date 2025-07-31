#!/usr/bin/env -S deno run --allow-read --allow-net=127.0.0.1:8000

import * as path from "@std/path";

const content = Deno.readFileSync(
  path.join(import.meta.dirname, "..", "fixtures", "example.com.html"),
);

Deno.serve({ port: 8000, hostname: "127.0.0.1" }, (_req) => {
  return new Response(content, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
});
