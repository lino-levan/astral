import { launch } from "../mod.ts";

const browser = await launch()

const page = await browser.newPage('https://whatsmybrowser.org')

const getUserAgent = async () => {
    const uaElement = await page.$('.user-agent')
    
    const ua = await uaElement?.innerText()
    
    console.log(ua)

    return ua
}

let userAgent = await getUserAgent()

// get current version of Chrome
const version = userAgent?.split('Chrome/').at(1).split('.').at(0)

const nextVersion = String(Number(version) - 1)

await page.setUserAgent(userAgent?.replace(version, nextVersion)

await page.reload()

await getUserAgent()

await browser.close()