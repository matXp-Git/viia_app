// Turbopack doesn't resolve maplibre-gl's `new Worker(new URL(..., import.meta.url))`
// pattern correctly (the browser gets an HTML fallback page instead of the
// worker script, MIME-type error, map never renders any tiles). The
// workaround is maplibre-gl's own `setWorkerUrl()` API pointed at a static
// copy of the worker script — this copies it into public/ on every install
// so it stays in sync with the installed maplibre-gl version.
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(root, "..", "node_modules", "maplibre-gl", "dist");
const publicDir = path.join(root, "..", "public");

// maplibre-gl-worker.mjs has a relative `import ... from "./maplibre-gl-shared.mjs"` —
// both files must sit side by side wherever they're served from, or the
// worker's module graph fails to load (silently: no error surfaces on the
// main thread, the map just never receives any tile/style data).
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  const src = path.join(distDir, file);
  const dest = path.join(publicDir, file);

  if (!existsSync(src)) {
    console.warn(`[copy-maplibre-worker] source not found, skipping: ${src}`);
    continue;
  }

  copyFileSync(src, dest);
  console.log(`[copy-maplibre-worker] copied to ${dest}`);
}
