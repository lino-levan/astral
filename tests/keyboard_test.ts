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
  await page.waitForTimeout(100); // Give events time to process
  
  const inputValue = await input.evaluate((el) => (el as HTMLInputElement).value);
  assertEquals(inputValue, "Hello");

  const keydowns = await page.evaluate(() => document.getElementById("keydowns")?.textContent || "");
  assertEquals(keydowns, "Hello");

  const keyups = await page.evaluate(() => document.getElementById("keyups")?.textContent || "");
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
          let currentModifiers = [];
          
          document.addEventListener('keydown', (e) => {
            currentModifiers = [];
            if (e.shiftKey) currentModifiers.push('Shift');
            if (e.ctrlKey) currentModifiers.push('Control');
            if (e.altKey) currentModifiers.push('Alt');
            if (e.metaKey) currentModifiers.push('Meta');
            modifiers.textContent = JSON.stringify(currentModifiers);
          });
        </script>
      </body>
    </html>
  `);

  const input = await page.$("input");
  assertExists(input);
  await input.click();

  // Test Shift modifier
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.press('a');
  await page.waitForTimeout(100); // Give events time to process
  let modifierState = await page.evaluate(() => document.getElementById("modifiers")?.textContent || "[]");
  assertEquals(modifierState, '["Shift"]');
  
  // Test releasing modifiers
  await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(100); // Give events time to process
  modifierState = await page.evaluate(() => document.getElementById("modifiers")?.textContent || "[]");
  assertEquals(modifierState, '[]');

  // Test multiple modifiers
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('ControlLeft');
  await page.waitForTimeout(100); // Give events time to process
  modifierState = await page.evaluate(() => document.getElementById("modifiers")?.textContent || "[]");
  assertEquals(modifierState, '["Shift","Control"]');

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
  await page.waitForTimeout(100); // Give events time to process

  const value = await textarea.evaluate((el) => (el as HTMLTextAreaElement).value);
  assertEquals(value, "First line\nSecond line");

  // Test Backspace
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Backspace");
  }
  await page.waitForTimeout(100); // Give events time to process

  const valueAfterBackspace = await textarea.evaluate((el) => (el as HTMLTextAreaElement).value);
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

  const inputValue = await input.evaluate((el) => (el as HTMLInputElement).value);
  assertEquals(inputValue, "test");

  // Verify delays between keystrokes are approximately correct
  const timings = await page.evaluate(() => {
    const el = document.getElementById("timings");
    const delays = (el?.textContent || '').split(',').filter(Boolean).map(Number);
    return delays.every(delay => delay >= 90); // Allow for small timing variations
  });
  assertEquals(timings, true);

  await browser.close();
});
