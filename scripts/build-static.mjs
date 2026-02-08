import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, "public");

const excludeTopLevelDirs = new Set([
  ".git",
  ".vercel",
  ".vscode",
  ".claude",
  "docs",
  "api",
  "scripts",
  "jules-scratch",
  "node_modules",
  "public",
]);

const excludeTopLevelFiles = new Set([
  ".env",
  ".gitignore",
  ".vercelignore",
  "netlify.toml",
  "package-lock.json",
  "package.json",
  "vercel.json",
  "security-headers.config.js",
  "analyze_headings.py",
  // Optional fallback index builder; assistant retrieval is server-side and does not depend on this file.
  "build_search_index.py",
  "heading_hierarchy_report.txt",
  "README.md",
  "secure-template.html",
  "test-progress.html",
]);


await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const entries = await readdir(projectRoot, { withFileTypes: true });

for (const entry of entries) {
  const src = path.join(projectRoot, entry.name);
  const dest = path.join(outDir, entry.name);

  if (entry.isDirectory()) {
    if (excludeTopLevelDirs.has(entry.name)) continue;
    await cp(src, dest, { recursive: true, force: true });
    continue;
  }

  if (entry.isFile()) {
    if (excludeTopLevelFiles.has(entry.name)) continue;

    const srcStat = await stat(src);
    if (!srcStat.isFile()) continue;

    await cp(src, dest, { force: true });
  }
}

console.log(`Static site output generated in ${path.relative(projectRoot, outDir)}`);
