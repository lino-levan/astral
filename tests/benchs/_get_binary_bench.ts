import { cleanCache, getBinary } from "../../mod.ts";
import { assert } from "@std/assert/assert";

Deno.bench({
  name: "Download progress",
  group: "Download browser",
  async fn(t) {
    // Download browser
    await cleanCache();
    t.start();
    assert(await getBinary("chrome"));
    t.end();
  },
});

Deno.bench({
  name: "Download quiet",
  group: "Download browser",
  async fn(t) {
    // Download browser
    await cleanCache();
    t.start();
    Deno.env.set("ASTRAL_QUIET_INSTALL", "true");
    assert(await getBinary("chrome"));
    t.end();
  },
});
