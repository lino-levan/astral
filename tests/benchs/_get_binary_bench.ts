import { assertMatch } from "https://deno.land/std@0.201.0/assert/assert_match.ts";
import { cleanCache, getBinary, launch } from "../../mod.ts";
import { assert } from "https://deno.land/std@0.201.0/assert/assert.ts";

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
