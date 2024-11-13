// deno-lint-ignore-file no-explicit-any

import { type Browser, launch } from "../mod.ts";

/**
 * This class is used to crawl websites and extract data such as images, videos, links, metadata, etc. for easy to use data for AI models.
 */
export class Crawler {
    #browser?: Browser;
    #maxDepth: number;
    #visited: Set<string>;
    #userAgent: string;
    #customHeaders: Record<string, string>;
    #concurrency: number;
    #outputFormat: "json" | "html" | "markdown";
    #mediaTags: boolean;
    #extractLinks: boolean;
    #metadata: boolean;
    #screenshots: boolean;
    #customScripts: string[];
    #sessionManagement: boolean;

    constructor(options: {
        maxDepth?: number;
        userAgent?: string;
        customHeaders?: Record<string, string>;
        concurrency?: number;
        outputFormat?: "json" | "html" | "markdown";
        mediaTags?: boolean;
        extractLinks?: boolean;
        metadata?: boolean;
        screenshots?: boolean;
        customScripts?: string[];
        sessionManagement?: boolean;
    } = {}) {
        this.#maxDepth = options.maxDepth || 2;
        this.#visited = new Set<string>();
        this.#userAgent = options.userAgent || "Crawler4AI";
        this.#customHeaders = options.customHeaders || {};
        this.#concurrency = options.concurrency || 5;
        this.#outputFormat = options.outputFormat || "json";
        this.#mediaTags = options.mediaTags !== undefined
            ? options.mediaTags
            : true;
        this.#extractLinks = options.extractLinks !== undefined
            ? options.extractLinks
            : true;
        this.#metadata = options.metadata !== undefined
            ? options.metadata
            : true;
        this.#screenshots = options.screenshots || false;
        this.#customScripts = options.customScripts || [];
        this.#sessionManagement = options.sessionManagement || false;
    }

    /**
     * Initialize the browser instance
     */
    async init() {
        this.#browser = await launch({
            headless: true,
            args: this.#sessionManagement ? [] : ["--incognito"],
        });
    }

    async close() {
        if (this.#browser) {
            await this.#browser.close();
        }
    }

    /**
     * Crawl multiple URLs
     */
    async crawlUrls(urls: string[]) {
        await this.init();

        const semaphore = new Semaphore(this.#concurrency);

        const crawlPromises = urls.map((url) =>
            semaphore.acquire()
                .then(() => this.crawl(url))
                .finally(() => semaphore.release())
        );

        await Promise.all(crawlPromises);
        await this.close();
    }

    /**
     * Crawl a single URL
     */
    async crawl(url: string, depth: number = 0) {
        if (depth > this.#maxDepth || this.#visited.has(url)) {
            return;
        }
        this.#visited.add(url);

        const page = await this.#browser!.newPage(url);

        // await page.setExtraHTTPHeaders(this.#customHeaders);
        // await page.setUserAgent(this.#userAgent);

        await page.evaluate((customScripts: string[]) => {
            for (const script of customScripts) {
                const scriptElement = document.createElement("script");
                scriptElement.text = script;
                document.body.appendChild(scriptElement);
            }
        }, { args: [this.#customScripts] });

        const data = await this.extractData(page, url);

        await this.saveData(url, data);

        if (this.#screenshots) {
            try {
                await Deno.stat("screenshots");
            } catch (error) {
                if (error instanceof Deno.errors.NotFound) {
                    await Deno.mkdir("screenshots", { recursive: true });
                }
            }
            const img = await page.screenshot({ format: "png" });
            await Deno.writeFile(
                `screenshots/${this.#sanitizeFilename(url)}.png`,
                img,
            );
        }

        if (this.#extractLinks && data.links) {
            const crawlPromises = data.links.map((link: string) =>
                this.crawl(link, depth + 1)
            );
            await Promise.all(crawlPromises);
        }

        await page.close();
    }

    /**
     * Extract data from the page
     */
    async extractData(page: any, _url: string) {
        const data = await page.evaluate(
            (mediaTagsEnabled: boolean, metadataEnabled: boolean) => {
                const data: any = {};

                if (mediaTagsEnabled) {
                    data.images = Array.from(document.querySelectorAll("img"))
                        .map((img) => img.src);
                    data.videos = Array.from(document.querySelectorAll("video"))
                        .map((video) => video.src);
                    data.audios = Array.from(document.querySelectorAll("audio"))
                        .map((audio) => audio.src);
                }

                if (metadataEnabled) {
                    data.title = document.title;
                    data.description =
                        document.querySelector('meta[name="description"]')
                            ?.getAttribute("content") || "";
                    data.keywords =
                        document.querySelector('meta[name="keywords"]')
                            ?.getAttribute("content") || "";
                }

                data.links = Array.from(document.querySelectorAll("a[href]"))
                    .map((a) => (a as HTMLAnchorElement).href);

                data.html = document.documentElement.outerHTML;

                return data;
            },
            this.#mediaTags,
            this.#metadata,
        );

        return data;
    }

    /**
     * Save the data to a file
     * The filename is sanitized and saved in the output folder
     * The data is saved in JSON format
     */
    async saveData(url: string, data: any) {
        const filename = `output/${this.#sanitizeFilename(url)}.json`;
        try {
            await Deno.stat("output");
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                await Deno.mkdir("output", { recursive: true });
            }
        }
        await Deno.writeTextFile(filename, JSON.stringify(data, null, 2));
    }

    #sanitizeFilename(url: string): string {
        return url.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    }
}

/**
 * Simple semaphore for #concurrency control
 */
class Semaphore {
    #tasks: Array<() => void> = [];
    #count: number;

    constructor(count: number) {
        this.#count = count;
    }

    acquire(): Promise<void> {
        return new Promise((resolve) => {
            const task = () => {
                this.#count--;
                resolve();
            };

            if (this.#count > 0) {
                task();
            } else {
                this.#tasks.push(task);
            }
        });
    }

    release() {
        this.#count++;
        if (this.#tasks.length > 0) {
            const task = this.#tasks.shift();
            if (task) {
                task();
            }
        }
    }
}
