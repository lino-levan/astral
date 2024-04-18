import { deadline } from "@std/async/deadline";
import { cleanCache, getBinary, launch } from "../mod.ts";

// Tests should be performed in directory different from others tests as cache is cleaned during this one
//Deno.env.set("ASTRAL_QUIET_INSTALL", "true");
const cache = await Deno.makeTempDir({
  prefix: "astral_test_install_lock_file",
});

Deno.test("Test concurrent getBinary calls", async () => {
  // Spawn concurrent getBinary calls
  await cleanCache({ cache });
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(getBinary("chrome", { cache }));
  }
  const path = await Promise.race(promises);

  // Ensure binary sent by first promise is executable
  const browser = await launch({ path });

  // Other promises should resolve at around the same time as they wait for lock file
  await deadline(Promise.all(promises), 250);

  // Ensure binary is still working (no files overwritten)
  await browser.newPage("https://example.com");
  await browser.close();
});

Deno.test("Clean cache after tests", async () => {
  await cleanCache({ cache });
});
