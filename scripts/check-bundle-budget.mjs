import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
export function measureRoute(directory, entries) {
  const manifest = JSON.parse(
      readFileSync(resolve(directory, ".vite/manifest.json"), "utf8"),
    ),
    visited = new Set();
  const find = (entry) =>
    manifest[entry]
      ? entry
      : Object.keys(manifest).find(
          (key) =>
            manifest[key].name === entry && manifest[key].file.endsWith(".js"),
        );
  const visit = (key) => {
    if (visited.has(key)) return;
    if (!manifest[key]) throw new Error(`Missing manifest dependency: ${key}`);
    visited.add(key);
    for (const dependency of manifest[key].imports || []) visit(dependency);
  };
  for (const entry of entries) {
    const key = find(entry);
    if (!key) throw new Error(`Missing route entry: ${entry}`);
    visit(key);
  }
  const files = [
    ...new Set(
      [...visited]
        .map((key) => manifest[key].file)
        .filter((file) => file.endsWith(".js")),
    ),
  ];
  let rawBytes = 0,
    gzipBytes = 0;
  for (const file of files) {
    const bytes = readFileSync(resolve(directory, file));
    rawBytes += bytes.length;
    gzipBytes += gzipSync(bytes).length;
  }
  return { rawBytes, gzipBytes, files };
}
export function checkBudgets(directory, budgets) {
  const routes = budgets.map((budget) => ({
    ...budget,
    ...measureRoute(directory, budget.entries),
  }));
  return {
    ok: routes.every(
      (route) =>
        route.rawBytes <= route.maxRawBytes &&
        route.gzipBytes <= route.maxGzipBytes,
    ),
    routes,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const directory = process.argv[2] || "dist",
      budgets = JSON.parse(readFileSync("bundle-budgets.json", "utf8")).routes;
    const result = checkBudgets(directory, budgets);
    for (const route of result.routes)
      console.log(
        `${route.name}: ${route.rawBytes} raw / ${route.gzipBytes} gzip bytes (limits ${route.maxRawBytes} / ${route.maxGzipBytes})`,
      );
    if (!result.ok) {
      console.error("Bundle budget exceeded.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
