/// <reference lib="dom" />

// Import Astral
import { launch } from "../mod.ts";

// Launch the browser
const browser = await launch();

// Open a new page
const page = await browser.newPage(
  "https://httpbin.org/basic-auth/user/passwd",
);

// Provide credentials for HTTP authentication.
await page.authenticate({ username: "user", password: "passwd" });

// Close the browser
await browser.close();
