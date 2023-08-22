import { ensureDirSync } from "https://deno.land/std@0.198.0/fs/ensure_dir.ts";
import { launch } from "../../mod.ts";
import { type PageProps } from "https://deno.land/x/pyro@0.6.1/page.ts";
import { ensureFileSync } from "https://deno.land/std@0.198.0/fs/ensure_file.ts";

export const config = {
  title: "Showcase",
  description: "A small showcase for projects that use Astral!",
};

interface Project {
  title: string;
  description: string;
  source: string;
}

const projects: Project[] = [
  {
    title: "Manuscript Marauder",
    description: "Download manuscripts using a proxy",
    source: "https://github.com/rnbguy/manuscript-marauder",
  },
];

export default function Page(props: PageProps) {
  return (
    <div class="flex flex-col items-center min-h-screen bg-white dark:bg-dark dark:text-white">
      {props.header}
      <div class="flex-grow py-8 w-full flex flex-col items-center">
        <div class="text-center flex flex-col items-center gap-4">
          <h2 class="font-bold text-3xl">Astral Project Showcase</h2>
          <p class="text-gray-500 dark:text-gray-400">
            List of projects people are building with Astral
          </p>
          <a
            class="rounded px-8 py-2 bg-purple-500 text-white w-max font-semibold text-sm"
            href="https://github.com/lino-levan/astral/issues/new"
          >
            🙏 Please add your project
          </a>
        </div>
        <div class="max-w-screen-xl pt-8 px-8 flex flex-wrap gap-8 justify-center">
          {projects.map((project) => (
            <div class="w-72 bg-white dark:bg-black shadow-lg rounded-lg overflow-hidden">
              <a href={project.source}>
                <img
                  class="w-full h-36"
                  src={`/showcase${new URL(project.source).pathname}.png`}
                />
              </a>
              <div class="p-4 border-t-2 dark:border-gray-500">
                <a
                  href={project.source}
                  class="text-purple-600 dark:text-purple-500 font-semibold hover:underline"
                >
                  {project.title}
                </a>
                <p class="text-gray-800 dark:text-gray-300">
                  {project.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {props.footer}
    </div>
  );
}

// let's boot astral and download some stuff :)
if (import.meta.main) {
  const browser = await launch();
  const page = await browser.newPage();

  for (const project of projects) {
    await page.goto(project.source);
    const screenshot = await page.screenshot();
    const path = `./docs/static/showcase${
      new URL(project.source).pathname
    }.png`;
    ensureFileSync(path);

    Deno.writeFileSync(path, screenshot);
  }

  await browser.close();
}
