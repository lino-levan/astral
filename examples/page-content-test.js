/* basic working example for a UI test with macOS specific path
 * deno test -A ./page-content-test.js
 * see also https://docs.deno.com/runtime/fundamentals/testing/
 * */
import { launch } from "jsr:@astral/astral";
import { assert } from "jsr:@std/assert";

const browser = await launch({
  // macOS specific path option
  path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--remote-debugging-port=9222', '--headless=new', '--no-first-run', '--password-store=basic', '--use-mock-keychain', '--hide-scrollbars', '--no-sandbox']
});

const page = await browser.newPage("https://deno.com");

// Run code in the context of the browser
const text = await page.evaluate(() => {
  return document.body.querySelector('main h1')?.textContent ?? '';
});

assert(text.includes('JavaScript'), 'has JavaScript');

await browser.close();
