// Temp scan 4 (delete after M6.6): per-webgl mount contracts.
import fs from "node:fs";
import path from "node:path";

const cat = JSON.parse(fs.readFileSync("catalog/catalog.json", "utf8"));
const items = cat.entries.filter((entry) => entry.runtime === "webgl" && entry.source === "react-bits");

for (const entry of items) {
  const dir = entry.localDir;
  const file = fs.readdirSync(dir).find((x) => x.endsWith(".tsx"));
  const src = fs.readFileSync(path.join(dir, file), "utf8");
  const def = (src.match(/export default ([\w]+)/) ?? [])[1];
  const named = (src.match(/export const ([\w]+)/) ?? [])[1];
  const sig = (src.match(/=\s*\(\{([\w, ]+)\}/) ?? [])[1];
  const names = [];
  let inProps = false;
  for (const line of src.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^(export )?(interface|type) \w*Props\b/.test(trimmed)) inProps = true;
    else if (inProps && /^};?\s*$/.test(trimmed)) inProps = false;
    if (inProps) {
      const m = line.match(/^\s*(\w+)(\?)?:/);
      if (m) names.push(m[1] + (m[2] ? "" : "!"));
      if (names.length > 12) break;
    }
  }
  console.log(`${entry.id} :: def=${def ?? "?"} named=${named ?? "-"} :: sig=${sig ?? "-"} :: ${names.slice(0, 8).join(",")}`);
}
