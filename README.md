<p align="center">
    <img src="./docs/static/astral.png"/>
</p>

Astral is a high-level puppeteer/playwright-like library that allows for control
over a web browser (primarily for automation and testing). It is written from
scratch with Deno in mind.

## Usage

Take a screenshot of a website.

```ts
// Import Astral
import { launch } from "jsr:@astral/astral";

// Launch the browser
await using browser = await launch();

// Open a new page
await using page = await browser.newPage("https://deno.land");

// Take a screenshot of the page and save that to disk
const screenshot = await page.screenshot();
Deno.writeFileSync("screenshot.png", screenshot);

// Clean up is performed automatically
```

You can use the evaluate function to run code in the context of the browser.

```ts
// Import Astral
import { launch } from "jsr:@astral/astral";

// Launch the browser
await using browser = await launch();

// Open a new page
await using page = await browser.newPage("https://deno.land");

// Run code in the context of the browser
const value = await page.evaluate(() => {
  return document.body.innerHTML;
});
console.log(value);

// Run code with args
const result = await page.evaluate((x, y) => {
  return `The result of adding ${x}+${y} = ${x + y}`;
}, {
  args: [10, 15],
});
console.log(result);
```

You can navigate to a page and interact with it.

```ts
// Import Astral
import { launch } from "jsr:@astral/astral";

// Launch browser in headfull mode
await using browser = await launch({ headless: false });

// Open the webpage
await using page = await browser.newPage("https://deno.land");

// Click the search button
const button = await page.$("button");
await button!.click();

// Type in the search input
const input = await page.$("#search-input");
await input!.type("pyro", { delay: 1000 });

// Wait for the search results to come back
await page.waitForNetworkIdle({ idleConnections: 0, idleTime: 1000 });

// Click the 'pyro' link
const xLink = await page.$("a.justify-between:nth-child(1)");
await Promise.all([
  page.waitForNavigation(),
  xLink!.click(),
]);

// Click the link to 'pyro.deno.dev'
const dLink = await page.$(
  ".markdown-body > p:nth-child(8) > a:nth-child(1)",
);
await Promise.all([
  page.waitForNavigation(),
  dLink!.click(),
]);
```

TODO: Document the locator API.

## Advanced Usage

If you already have a browser process running somewhere else or you're using a
service that provides remote browsers for automation (such as
[browserless.io](https://www.browserless.io/)), it is possible to directly
connect to its endpoint rather than spawning a new process.

```ts
// Import Astral
import { connect } from "jsr:@astral/astral";

// Connect to remote endpoint
const browser = await connect({
  endpoint: "wss://remote-browser-endpoint.example.com",
});

// Do stuff
const page = await browser.newPage("http://example.com");
console.log(await page.evaluate(() => document.title));

// Close connection
await browser.close();
```

If you'd like to instead re-use a browser that you already launched, astral
exposes the WebSocket endpoint through `browser.wsEndpoint()`.

```ts
// Spawn a browser process
const browser = await launch();

// Connect to first browser instead
const anotherBrowser = await connect({ endpoint: browser.wsEndpoint() });
```

### Page authenticate

[authenticate example code](https://github.com/lino-levan/astral/blob/main/examples/authenticate.ts):

```ts
// Open a new page
const page = await browser.newPage();

// Provide credentials for HTTP authentication.
const url = "https://postman-echo.com/basic-auth";
await page.authenticate({ username: "postman", password: "password" });
await page.goto(url, { waitUntil: "networkidle2" });
```

## BYOB - Bring Your Own Browser

Essentially the process is as simple as running a chromium-like binary with the
following flags:

```
chromium --remote-debugging-port=1337 \
--headless=new \
--no-first-run \
--password-store=basic \
--use-mock-keychain \
--hide-scrollbars
```

Technically, only the first flag is necessary, though I've found that these
flags generally get the best result. Once your browser process is running,
connecting to it is as simple as

```typescript
// Import Astral
import { connect } from "jsr:@astral/astral";

// Connect to remote endpoint
const browser = await connect({
  endpoint: "localhost:1337",
  headless: false,
});

console.log(browser.wsEndpoint());

// Do stuff
const page = await browser.newPage("http://example.com");
console.log(await page.evaluate(() => document.title));

// Close connection
await browser.close();
```

## FAQ

### Launch FAQ

#### "No usable sandbox!" with user namespace cloning enabled

> Ubuntu 23.10+ (or possibly other Linux distros in the future) ship an AppArmor
> profile that applies to Chrome stable binaries installed at
> /opt/google/chrome/chrome (the default installation path). This policy is
> stored at /etc/apparmor.d/chrome. This AppArmor policy prevents Chrome for
> Testing binaries downloaded by Puppeteer from using user namespaces resulting
> in the No usable sandbox! error when trying to launch the browser. For
> workarounds, see
> https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md

The following command removes AppArmor restrictions on user namespaces, allowing
Puppeteer to launch Chrome without the "No usable sandbox!" error (see
[puppeteer#13196](https://github.com/puppeteer/puppeteer/pull/13196)):

    echo 0 | sudo tee /proc/sys/kernel/apparmor_restrict_unprivileged_userns
