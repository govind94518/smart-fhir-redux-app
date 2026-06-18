import fs from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(import.meta.dirname, "..", "dist");

await fs.copyFile(path.join(distDir, "index.html"), path.join(distDir, "404.html"));
console.log("Copied dist/index.html to dist/404.html for GitHub Pages SPA routing.");
