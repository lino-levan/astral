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
          
          input.addEventListener('keydown', (e) => {
            keydowns.textContent = (keydowns.textContent || '') + e.key;
          });
          
          input.addEventListener('keyup', (e) => {
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

  const keydowns = await page.$eval("#keydowns", (el) => el.textContent);
  assertEquals(keydowns, "Hello");

  const keyups = await page.$eval("#keyups", (el) => el.textContent);
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
        <div id="modifiers"></div>
        <script>
          const input = document.getElementById('input');
          const modifiers = document.getElementById('modifiers');
          
          input.addEventListener('keydown', (e) => {
            const activeModifiers = [];
            if (e.shiftKey) activeModifiers.push('Shift');
            if (e.ctrlKey) activeModifiers.push('Control');
            if (e.altKey) activeModifiers.push('Alt');
            if (e.metaKey) activeModifiers.push('Meta');
            modifiers.textContent = JSON.stringify(activeModifiers);
          });
        </script>
      </body>
    </html>
  `);

  const input = await page.$("input");
  assertExists(input);
  await input.click();

  // Test Shift modifier
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.press("a");
  let modifierState = await page.$eval("#modifiers", (el) => el.textContent);
  assertEquals(modifierState, '["Shift"]');

  // Test multiple modifiers
  await page.keyboard.down("ControlLeft");
  modifierState = await page.$eval("#modifiers", (el) => el.textContent);
  assertEquals(modifierState, '["Shift","Control"]');

  // Test releasing modifiers
  await page.keyboard.up("ShiftLeft");
  modifierState = await page.$eval("#modifiers", (el) => el.textContent);
  assertEquals(modifierState, '["Control"]');

  await page.keyboard.up("ControlLeft");
  modifierState = await page.$eval("#modifiers", (el) => el.textContent);
  assertEquals(modifierState, "[]");

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
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");

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
  const timings = await page.$eval("#timings", (el) => {
    const delays = (el.textContent || "").split(",").filter(Boolean).map(
      Number,
    );
    return delays.every((delay) => delay >= 90); // Allow for small timing variations
  });
  assertEquals(timings, true);

  await browser.close();
});
