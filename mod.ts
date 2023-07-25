import { launch } from "./src/browser.ts";

const path =
  `/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`;

const browser = await launch({ path });
const page = await browser.newPage("https://google.com");

browser.close();

// const url = "https://google.com";
// const newTabReq = await fetch(`http://localhost:9222/json/new?${encodeURIComponent(url)}`, {
//   method: "PUT"
// })
// const newTab = await newTabReq.json();
// console.log(newTab)

// const ws = new WebSocket(newTab.webSocketDebuggerUrl)

// ws.onopen = (e) => {
//   const req = {
//     id: 0,
//     method: 'Page.navigate',
//     params: {'url': 'chrome://newtab/'}
//   }
//   ws.send(JSON.stringify(req))
// }

// ws.onmessage = (e) => {
//   console.log(e.data)
// }
