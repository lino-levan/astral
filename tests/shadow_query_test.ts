/// <reference lib="dom" />

import { launch } from "../mod.ts";
import { assert, assertExists } from "@std/assert";

Deno.test("Set content", async () => {
  // Launch browser
  const browser = await launch();
  const content = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Astral</title>
    </head>
    <body>
      <div></div>
      <script>
         const div = document.querySelector('div');
         const shadowRoot = div.attachShadow({mode: 'open'});
         const div1 = document.createElement('div');
         div1.textContent = 'Hello';
         div1.className = 'foo';
         const div2 = document.createElement('div');
         div2.textContent = 'World';
         div2.className = 'foo';
         shadowRoot.appendChild(div1);
         shadowRoot.appendChild(div2);
         const div3 = document.createElement('div');
         const div3ShadowRoot = div3.attachShadow({mode: 'open'});
         const span = document.createElement('span');
         span.textContent = 'Hi';
         div3ShadowRoot.appendChild(span);
         shadowRoot.appendChild(div3);
      </script>
    </body>
  </html>`;

  // Open the webpage and set content
  const page = await browser.newPage();
  await page.setContent(content);

  // Basic selector
  const div = await page.$(".foo", { strategy: "pierce" });
  assertExists(div);
  let text = await div!.evaluate((element: HTMLDivElement) => {
    return element.textContent;
  });
  assert(text === "Hello");

  // Multi-selector
  const divs = await page.$$(".foo", { strategy: "pierce" });
  text = (await Promise.all(
    divs.map((div) => {
      return div.evaluate((element: HTMLDivElement) => {
        return element.textContent;
      });
    }),
  )).filter(Boolean).join(" ");
  assert(text === "Hello World");

  // Nested shadow root query
  const span = await page.$("span", { strategy: "pierce" });
  assertExists(span);
  text = await span!.evaluate((element: HTMLDivElement) => {
    return element.textContent;
  });
  assert(text === "Hi");

  // Close browser
  await browser.close();
});
