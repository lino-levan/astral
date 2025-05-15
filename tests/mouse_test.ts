/// <reference lib="dom" />

import { assertEquals, assertExists } from "@std/assert";
import { launch } from "../mod.ts";

Deno.test("Mouse - basic click", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="clickTarget" style="width: 200px; height: 200px; background-color: #eee;">Click here</div>
        <div id="clickCount">0</div>
        <script>
          const clickTarget = document.getElementById('clickTarget');
          const clickCount = document.getElementById('clickCount');

          clickTarget.addEventListener('click', () => {
            clickCount.textContent = (parseInt(clickCount.textContent) + 1).toString();
          });
        </script>
      </body>
    </html>
  `);

  const clickTarget = await page.$("#clickTarget");
  assertExists(clickTarget);

  // Get element position
  const boundingBox = await clickTarget.boundingBox();
  assertExists(boundingBox);

  // Click in the middle of the element
  const x = boundingBox.x + boundingBox.width / 2;
  const y = boundingBox.y + boundingBox.height / 2;

  await page.mouse.click(x, y);

  // Verify click was registered
  const count = await page.evaluate(() =>
    document.getElementById("clickCount")?.textContent
  );
  assertEquals(count, "1");

  await browser.close();
});

Deno.test("Mouse - multiple clicks", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="clickTarget" style="width: 200px; height: 200px; background-color: #eee;">Click here</div>
        <div id="clickCount">0</div>
        <div id="dblClickCount">0</div>
        <script>
          const clickTarget = document.getElementById('clickTarget');
          const clickCount = document.getElementById('clickCount');
          const dblClickCount = document.getElementById('dblClickCount');

          clickTarget.addEventListener('click', () => {
            clickCount.textContent = (parseInt(clickCount.textContent) + 1).toString();
          });

          clickTarget.addEventListener('dblclick', () => {
            dblClickCount.textContent = (parseInt(dblClickCount.textContent) + 1).toString();
          });
        </script>
      </body>
    </html>
  `);

  const clickTarget = await page.$("#clickTarget");
  assertExists(clickTarget);

  // Get element position
  const boundingBox = await clickTarget.boundingBox();
  assertExists(boundingBox);

  // Click in the middle of the element with count=2 (double-click)
  const x = boundingBox.x + boundingBox.width / 2;
  const y = boundingBox.y + boundingBox.height / 2;

  await page.mouse.click(x, y, { count: 2 });

  // Verify clicks were registered
  const clickCount = await page.evaluate(() =>
    document.getElementById("clickCount")?.textContent
  );
  assertEquals(clickCount, "2"); // Two individual clicks

  const dblClickCount = await page.evaluate(() =>
    document.getElementById("dblClickCount")?.textContent
  );
  assertEquals(dblClickCount, "1"); // One double-click

  await browser.close();
});

Deno.test("Mouse - click with delay", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="clickTarget" style="width: 200px; height: 200px; background-color: #eee;">Click here</div>
        <div id="timings"></div>
        <script>
          const clickTarget = document.getElementById('clickTarget');
          const timings = document.getElementById('timings');
          let lastEventTime = 0;

          clickTarget.addEventListener('mousedown', () => {
            const now = Date.now();
            if (lastEventTime) {
              const diff = now - lastEventTime;
              timings.textContent = (timings.textContent || '') + 'down:' + diff + ',';
            }
            lastEventTime = now;
          });

          clickTarget.addEventListener('mouseup', () => {
            const now = Date.now();
            if (lastEventTime) {
              const diff = now - lastEventTime;
              timings.textContent = (timings.textContent || '') + 'up:' + diff + ',';
            }
            lastEventTime = now;
          });
        </script>
      </body>
    </html>
  `);

  const clickTarget = await page.$("#clickTarget");
  assertExists(clickTarget);

  // Get element position
  const boundingBox = await clickTarget.boundingBox();
  assertExists(boundingBox);

  // Click with 100ms delay between down and up
  const x = boundingBox.x + boundingBox.width / 2;
  const y = boundingBox.y + boundingBox.height / 2;

  await page.mouse.click(x, y, { delay: 100 });

  // Verify the delay is approximately correct
  const delayIsCorrect = await page.evaluate(() => {
    const timings = document.getElementById("timings")?.textContent || "";
    const upTiming = timings.split(",").find((t) => t.startsWith("up:"));
    if (!upTiming) return false;

    const delay = parseInt(upTiming.substring(3));
    return delay >= 90; // Allow for small timing variations
  });

  assertEquals(delayIsCorrect, true);

  await browser.close();
});

Deno.test("Mouse - down and up", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="target" style="width: 200px; height: 200px; background-color: #eee;">Test area</div>
        <div id="events"></div>
        <script>
          const target = document.getElementById('target');
          const events = document.getElementById('events');

          target.addEventListener('mousedown', () => {
            events.textContent = (events.textContent || '') + 'down,';
          });

          target.addEventListener('mouseup', () => {
            events.textContent = (events.textContent || '') + 'up,';
          });
        </script>
      </body>
    </html>
  `);

  const target = await page.$("#target");
  assertExists(target);

  // Get element position
  const boundingBox = await target.boundingBox();
  assertExists(boundingBox);

  const x = boundingBox.x + boundingBox.width / 2;
  const y = boundingBox.y + boundingBox.height / 2;

  // Move to the target
  await page.mouse.move(x, y);

  // Test mouse down and up separately
  await page.mouse.down();
  await page.mouse.up();

  // Test with right button
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });

  // Verify the events were recorded in order
  const events = await page.evaluate(() =>
    document.getElementById("events")?.textContent || ""
  );

  assertEquals(events, "down,up,down,up,");

  await browser.close();
});

Deno.test("Mouse - movement", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="area" style="width: 400px; height: 400px; background-color: #eee; position: relative;">
          <div id="position" style="position: absolute; top: 10px; left: 10px;">0,0</div>
        </div>
        <script>
          const area = document.getElementById('area');
          const position = document.getElementById('position');

          area.addEventListener('mousemove', (e) => {
            const rect = area.getBoundingClientRect();
            const x = Math.round(e.clientX - rect.left);
            const y = Math.round(e.clientY - rect.top);
            position.textContent = \`\${x},\${y}\`;
            position.style.left = \`\${x + 10}px\`;
            position.style.top = \`\${y + 10}px\`;
          });
        </script>
      </body>
    </html>
  `);

  const area = await page.$("#area");
  assertExists(area);

  // Get element position
  const boundingBox = await area.boundingBox();
  assertExists(boundingBox);

  // Move to specific coordinates within the area
  const targetX = boundingBox.x + 100;
  const targetY = boundingBox.y + 150;

  await page.mouse.move(targetX, targetY);

  // Verify position was updated correctly
  const position = await page.evaluate(() =>
    document.getElementById("position")?.textContent || ""
  );

  // Check if the reported position is close to our target (allowing for rounding)
  const [x, y] = position.split(",").map(Number);
  const isPositionClose = Math.abs(x - 100) <= 2 && Math.abs(y - 150) <= 2;

  assertEquals(isPositionClose, true);

  // Test movement with steps
  const newTargetX = boundingBox.x + 300;
  const newTargetY = boundingBox.y + 200;

  await page.mouse.move(newTargetX, newTargetY, { steps: 5 });

  // Verify final position
  const newPosition = await page.evaluate(() =>
    document.getElementById("position")?.textContent || ""
  );

  const [newX, newY] = newPosition.split(",").map(Number);
  const isNewPositionClose = Math.abs(newX - 300) <= 2 &&
    Math.abs(newY - 200) <= 2;

  assertEquals(isNewPositionClose, true);

  await browser.close();
});

Deno.test("Mouse - reset", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="area" style="width: 400px; height: 400px; background-color: #eee;">
          <div id="position">No movement yet</div>
        </div>
        <script>
          const area = document.getElementById('area');
          const position = document.getElementById('position');

          document.addEventListener('mousemove', (e) => {
            position.textContent = \`\${e.clientX},\${e.clientY}\`;
          });
        </script>
      </body>
    </html>
  `);

  // Move mouse to a position
  await page.mouse.move(200, 200);

  // Verify position was updated
  let position = await page.evaluate(() =>
    document.getElementById("position")?.textContent
  );
  assertExists(position);

  // Reset mouse position
  await page.mouse.reset();

  // Verify position was reset to (0,0) or close to it
  position = await page.evaluate(() =>
    document.getElementById("position")?.textContent
  );
  assertExists(position);

  const [x, y] = position.split(",").map(Number);
  const isAtOrigin = x <= 5 && y <= 5; // Allow small offset due to viewport considerations

  assertEquals(isAtOrigin, true);

  await browser.close();
});

// TODO(lino-levan): Reenable test, it's flaky for some reason
// Deno.test("Mouse - wheel", async () => {
//   const browser = await launch();
//   const page = await browser.newPage();

//   await page.setContent(`
//     <!DOCTYPE html>
//     <html>
//       <body>
//         <div id="scrollArea" style="width: 300px; height: 300px; overflow: auto;">
//           <div style="width: 600px; height: 600px; background: linear-gradient(blue, red);">
//             Scroll area content
//           </div>
//         </div>
//         <div id="scrollPosition">0,0</div>
//         <script>
//           const scrollArea = document.getElementById('scrollArea');
//           const scrollPosition = document.getElementById('scrollPosition');

//           scrollArea.addEventListener('scroll', () => {
//             scrollPosition.textContent = \`\${scrollArea.scrollLeft},\${scrollArea.scrollTop}\`;
//           });
//         </script>
//       </body>
//     </html>
//   `);

//   const scrollArea = await page.$("#scrollArea");
//   assertExists(scrollArea);

//   // Get element position
//   const boundingBox = await scrollArea.boundingBox();
//   assertExists(boundingBox);

//   // Move to the scroll area
//   const x = boundingBox.x + boundingBox.width / 2;
//   const y = boundingBox.y + boundingBox.height / 2;
//   await page.mouse.move(x, y);

//   // Scroll vertically
//   await page.mouse.wheel({ deltaY: 100 });

//   // Wait for scroll to complete
//   await page.waitForTimeout(200);

//   // Verify vertical scroll
//   let scrollPosition = await page.evaluate(() =>
//     document.getElementById("scrollPosition")?.textContent || ""
//   );

//   let [scrollX, scrollY] = scrollPosition.split(",").map(Number);
//   assertEquals(scrollX, 0);
//   const hasScrolledVertically = scrollY > 0;
//   assertEquals(hasScrolledVertically, true);

//   // Scroll horizontally
//   await page.mouse.wheel({ deltaX: 100 });

//   // Wait for scroll to complete
//   await page.waitForTimeout(200);

//   // Verify horizontal scroll
//   scrollPosition = await page.evaluate(() =>
//     document.getElementById("scrollPosition")?.textContent || ""
//   );

//   [scrollX, scrollY] = scrollPosition.split(",").map(Number);
//   const hasScrolledHorizontally = scrollX > 0;
//   assertEquals(hasScrolledHorizontally, true);

//   await browser.close();
// });

Deno.test("Mouse - modifier keys with click", async () => {
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

  // Get element position
  const boundingBox = await clickTarget.boundingBox();
  assertExists(boundingBox);

  const x = boundingBox.x + boundingBox.width / 2;
  const y = boundingBox.y + boundingBox.height / 2;

  // Basic click without modifiers
  await page.mouse.click(x, y);

  // Shift + Click
  await page.keyboard.down("ShiftLeft");
  await page.mouse.click(x, y);
  await page.keyboard.up("ShiftLeft");

  // Verify the events were recorded correctly
  const events = await page.evaluate(() =>
    document.getElementById("clickEvents")?.textContent || ""
  );

  assertEquals(
    events,
    "Click,Shift+Click,",
  );

  await browser.close();
});

Deno.test("Mouse - drag and drop", async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="draggable" style="width: 100px; height: 100px; background-color: red; position: absolute; top: 0; left: 0;">
          Drag me
        </div>
        <div id="dropzone" style="width: 200px; height: 200px; background-color: #eee; position: absolute; top: 200px; left: 200px;">
          Drop here
        </div>
        <div id="status">Ready</div>
        <div id="position">0,0</div>
        <script>
          const draggable = document.getElementById('draggable');
          const status = document.getElementById('status');
          const position = document.getElementById('position');
          let isDragging = false;
          let offsetX = 0;
          let offsetY = 0;

          draggable.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - draggable.getBoundingClientRect().left;
            offsetY = e.clientY - draggable.getBoundingClientRect().top;
            status.textContent = 'Dragging started';
          });

          document.addEventListener('mousemove', (e) => {
            if (isDragging) {
              const x = e.clientX - offsetX;
              const y = e.clientY - offsetY;
              draggable.style.left = x + 'px';
              draggable.style.top = y + 'px';
              position.textContent = \`\${x},\${y}\`;
            }
          });

          document.addEventListener('mouseup', () => {
            if (isDragging) {
              isDragging = false;
              status.textContent = 'Dragging ended';

              // Check if dropped in dropzone
              const draggableRect = draggable.getBoundingClientRect();
              const dropzoneRect = dropzone.getBoundingClientRect();

              if (
                draggableRect.left < dropzoneRect.right &&
                draggableRect.right > dropzoneRect.left &&
                draggableRect.top < dropzoneRect.bottom &&
                draggableRect.bottom > dropzoneRect.top
              ) {
                status.textContent = 'Dropped in target!';
              }
            }
          });
        </script>
      </body>
    </html>
  `);

  // Get draggable element
  const draggable = await page.$("#draggable");
  assertExists(draggable);
  const draggableBox = await draggable.boundingBox();
  assertExists(draggableBox);

  // Get dropzone element
  const dropzone = await page.$("#dropzone");
  assertExists(dropzone);
  const dropzoneBox = await dropzone.boundingBox();
  assertExists(dropzoneBox);

  // Start position (center of draggable)
  const startX = draggableBox.x + draggableBox.width / 2;
  const startY = draggableBox.y + draggableBox.height / 2;

  // End position (center of dropzone)
  const endX = dropzoneBox.x + dropzoneBox.width / 2;
  const endY = dropzoneBox.y + dropzoneBox.height / 2;

  // Simulate drag and drop
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 }); // Move in steps for smoother drag
  await page.mouse.up();

  // Verify drop was successful
  const status = await page.evaluate(() =>
    document.getElementById("status")?.textContent
  );
  assertEquals(status, "Dropped in target!");

  // Verify element was moved to the correct position
  const position = await page.evaluate(() =>
    document.getElementById("position")?.textContent!
  );

  const [x, y] = position.split(",").map(Number);
  const isNearDropzone = Math.abs(
        x - (dropzoneBox.x + dropzoneBox.width / 2 - draggableBox.width / 2),
      ) <= 50 &&
    Math.abs(
        y - (dropzoneBox.y + dropzoneBox.height / 2 - draggableBox.height / 2),
      ) <= 50;

  assertEquals(isNearDropzone, true);

  await browser.close();
});
