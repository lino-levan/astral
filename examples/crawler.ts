import { Crawler } from "../ext/crawler.ts";

// Create an instance of the crawler
const crawler = new Crawler({
    maxDepth: 2,
    userAgent:
        "Mozilla/5.0 (compatible; Crawler4AI/1.0; +https://yourdomain.com/bot)",
    customHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
    },
    concurrency: 5,
    outputFormat: "json",
    mediaTags: true,
    extractLinks: true,
    metadata: true,
    screenshots: true,
    customScripts: [
        // Custom JavaScript code as strings
        'console.log("Custom script executed");',
    ],
    sessionManagement: false,
});

// URLs to crawl
const urls = [
    "https://deno.church",
];

// Start crawling
await crawler.crawlUrls(urls);
