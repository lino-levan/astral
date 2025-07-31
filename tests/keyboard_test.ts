/// <reference lib="dom" />

import { assertEquals, assertExists } from "@std/assert";

import { launch } from "../mod.ts";

Deno.test("Keyboard - basic input", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <input id="input" type="text">
        <div id="keydowns"></div>
        <div id="keyups"></div>
        <script>
          const input = document.getElementById('input');
          const keydowns = document.getElementById('keydowns');
          const keyups = document.getElementById('keyups');

          input.addEventListener('keypress', (e) => {
            keydowns.textContent = (keydowns.textContent || '') + e.key;
            keyups.textContent = (keyups.textContent || '') + e.key;
          });
        </script>
      </body>
    </html>
  `);

  const input = await page.$("input");
  assertExists(input);
  await input.click();

  // Test individual key presses
  await page.keyboard.type("Hello");

  const inputValue = await input.evaluate((el) =>
    (el as HTMLInputElement).value
  );
  assertEquals(inputValue, "Hello");

  const keydowns = await page.evaluate(() =>
    document.getElementById("keydowns")?.textContent || ""
  );
  assertEquals(keydowns, "Hello");

  const keyups = await page.evaluate(() =>
    document.getElementById("keyups")?.textContent || ""
  );
  assertEquals(keyups, "Hello");

  await browser.close();
});

Deno.test("Keyboard - modifier keys", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <input id="input" type="text">
        <div id="events"></div>
        <script>
          const input = document.getElementById('input');
          const events = document.getElementById('events');

          input.addEventListener('keydown', (e) => {
            const modifiers = [];
            if (e.shiftKey) modifiers.push('Shift');
            if (e.ctrlKey) modifiers.push('Ctrl');
            if (e.altKey) modifiers.push('Alt');

            const eventDesc = modifiers.length > 0
              ? \`\${modifiers.join("+")}+\${e.key}\`
              : e.key;

            events.textContent = (events.textContent || '') + eventDesc + ',';
          });
        </script>
      </body>
    </html>
  `);

  const input = await page.$("input");
  assertExists(input);
  await input.click();

  // Test Shift + key
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.press("a");
  await page.keyboard.up("ShiftLeft");

  // Test Ctrl + key
  await page.keyboard.down("ControlLeft");
  await page.keyboard.press("c");
  await page.keyboard.up("ControlLeft");

  // Test Alt + key
  await page.keyboard.down("AltLeft");
  await page.keyboard.press("x");
  await page.keyboard.up("AltLeft");

  // Test multiple modifiers
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("ControlLeft");
  await page.keyboard.press("z");
  await page.keyboard.up("ControlLeft");
  await page.keyboard.up("ShiftLeft");

  // Verify the events were recorded correctly
  const events = await page.evaluate(() =>
    document.getElementById("events")?.textContent || ""
  );

  assertEquals(
    events,
    "Shift+Shift,Shift+a,Ctrl+Control,Ctrl+c,Alt+Alt,Alt+x,Shift+Shift,Shift+Ctrl+Control,Shift+Ctrl+z,",
  );
  await browser.close();
});

Deno.test("Keyboard - shift doesn't affect capitalization", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <input id="input" type="text">
      </body>
    </html>
  `);

  const input = await page.$("input");
  assertExists(input);
  await input.click();

  // Test typing with Shift held down
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.type("test");
  await page.keyboard.up("ShiftLeft");

  const upperValue = await input.evaluate((el) =>
    (el as HTMLInputElement).value
  );
  assertEquals(upperValue, "test");

  // Clear input
  await input.evaluate((el) => (el as HTMLInputElement).value = "");

  // Test mixed case with Shift
  await page.keyboard.type("t");
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.type("EST");
  await page.keyboard.up("ShiftLeft");

  const mixedValue = await input.evaluate((el) =>
    (el as HTMLInputElement).value
  );
  assertEquals(mixedValue, "tEST");

  await browser.close();
});

Deno.test("Keyboard - special keys", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <textarea id="textarea"></textarea>
        <script>
          const textarea = document.getElementById('textarea');
        </script>
      </body>
    </html>
  `);

  const textarea = await page.$("textarea");
  assertExists(textarea);
  await textarea.click();

  // Test Enter key
  await page.keyboard.type("First line");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second line");

  const value = await textarea.evaluate((el) =>
    (el as HTMLTextAreaElement).value
  );
  assertEquals(value, "First line\nSecond line");

  // Test Backspace
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Backspace");
  }

  const valueAfterBackspace = await textarea.evaluate((el) =>
    (el as HTMLTextAreaElement).value
  );
  assertEquals(valueAfterBackspace, "First line\nSecond");

  await browser.close();
});

Deno.test("Keyboard - typing with delay", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <input id="input" type="text">
        <div id="timings"></div>
        <script>
          const input = document.getElementById('input');
          const timings = document.getElementById('timings');
          let lastKeyTime = 0;

          input.addEventListener('keydown', () => {
            const now = Date.now();
            if (lastKeyTime) {
              const diff = now - lastKeyTime;
              timings.textContent = (timings.textContent || '') + diff + ',';
            }
            lastKeyTime = now;
          });
        </script>
      </body>
    </html>
  `);

  const input = await page.$("input");
  assertExists(input);
  await input.click();

  // Type with 100ms delay between each key
  await page.keyboard.type("test", { delay: 100 });

  const inputValue = await input.evaluate((el) =>
    (el as HTMLInputElement).value
  );
  assertEquals(inputValue, "test");

  // Verify delays between keystrokes are approximately correct
  const timings = await page.evaluate(() => {
    const el = document.getElementById("timings");
    const delays = (el?.textContent || "").split(",").filter(Boolean).map(
      Number,
    );
    return delays.every((delay) => delay >= 90); // Allow for small timing variations
  });
  assertEquals(timings, true);

  await browser.close();
});

Deno.test("Keyboard - tab navigation", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <input id="first" type="text" placeholder="First input">
        <input id="second" type="text" placeholder="Second input">
        <button id="button">Click me</button>
        <textarea id="textarea">Text area</textarea>
        <div id="focused"></div>
        <script>
          const focused = document.getElementById('focused');
          document.addEventListener('focusin', (e) => {
            if (e.target.id) {
              focused.textContent = (focused.textContent || '') + e.target.id + ',';
            }
          });
        </script>
      </body>
    </html>
  `);

  // Start with first input focused
  const firstInput = await page.$("input#first");
  assertExists(firstInput);
  await firstInput.click();

  // Press tab multiple times to move through elements
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  // Check the focus order
  const focusOrder = await page.evaluate(() =>
    document.getElementById("focused")?.textContent || ""
  );
  assertEquals(focusOrder, "first,second,button,textarea,");

  // Test shift+tab to go backwards
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.up("ShiftLeft");

  // Verify we can type in the input we tabbed to
  await page.keyboard.type("Hello");
  const secondInputValue = await page.evaluate(() =>
    (document.getElementById("second") as HTMLInputElement).value
  );
  assertEquals(secondInputValue, "Hello");

  await browser.close();
});

Deno.test("Keyboard - modifier keys with click", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="clickTarget" style="width: 200px; height: 200px; background-color: #eee;">Click here</div>
        <div id="clickEvents"></div>
        <script>
          const clickTarget = document.getElementById('clickTarget');
          const clickEvents = document.getElementById('clickEvents');

          clickTarget.addEventListener('click', (e) => {
            const modifiers = [];
            if (e.shiftKey) modifiers.push('Shift');
            if (e.ctrlKey) modifiers.push('Ctrl');
            if (e.altKey) modifiers.push('Alt');
            if (e.metaKey) modifiers.push('Meta');

            const eventDesc = modifiers.length > 0
              ? \`\${modifiers.join("+")}+Click\`
              : 'Click';

            clickEvents.textContent = (clickEvents.textContent || '') + eventDesc + ',';
          });
        </script>
      </body>
    </html>
  `);

  const clickTarget = await page.$("#clickTarget");
  assertExists(clickTarget);

  // Basic click without modifiers
  await clickTarget.click();

  // Shift + Click
  await page.keyboard.down("ShiftLeft");
  await clickTarget.click();
  await page.keyboard.up("ShiftLeft");

  // Alt + Click
  await page.keyboard.down("AltLeft");
  await clickTarget.click();
  await page.keyboard.up("AltLeft");

  // Multiple modifiers: Shift + Alt + Click
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("AltLeft");
  await clickTarget.click();
  await page.keyboard.up("AltLeft");
  await page.keyboard.up("ShiftLeft");

  // Verify the events were recorded correctly
  const events = await page.evaluate(() =>
    document.getElementById("clickEvents")?.textContent || ""
  );

  assertEquals(
    events,
    "Click,Shift+Click,Alt+Click,Shift+Alt+Click,",
  );

  await browser.close();
});
