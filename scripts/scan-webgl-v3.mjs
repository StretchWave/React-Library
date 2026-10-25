// Temp scan 5 (delete after M6.6): context types, dirs, files, sizing hints.
import fs from "node:fs";
import path from "node:path";

const cat = JSON.parse(fs.readFileSync("catalog/catalog.json", "utf8"));
const items = cat.entries.filter((entry) => entry.runtime === "webgl" && entry.source === "react-bits");

for (const entry of items) {
  const dir = entry.localDir;
  const files = fs.readdirSync(dir);
  const tsx = files.find((x) => x.endsWith(".tsx"));
  const src = fs.readFileSync(path.join(dir, tsx), "utf8");
  const ctx = [...src.matchAll(/getContext\(\s*['"]([\w-]+)['"]/g)].map((m) => m[1]);
  const three = /from ['"]three/.test(src) ? "three" : "raw";
  const sizing = [...src.matchAll(/(?:width|height):\s*(?:"([\w%.]+)"|'([\w%.]+)'|[0-9]{3,})/g)]
    .slice(0, 4)
    .map((m) => `${m[1] ?? m[2] ?? "px#" + m[0].match(/\d{3,}/)?.[0]}`);
  console.log(`${entry.id.replace("react-bits-", "")} :: ctx=${[...new Set(ctx)].join("+") || "none"} :: ${three} :: files=${files.filter((f) => !f.startsWith("component.")).join(",")} :: sizing=${sizing.join(",") || "-"}`);
}
