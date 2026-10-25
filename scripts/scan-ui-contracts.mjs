// Temp scan 9 (delete after M6.6): shadcn + magic-ui contracts.
import fs from "node:fs";
import path from "node:path";

const cat = JSON.parse(fs.readFileSync("catalog/catalog.json", "utf8"));
const others = cat.entries.filter((e) => e.source && e.source !== "react-bits" && e.preview?.type === "external");

for (const entry of others) {
  const dir = entry.localDir;
  const files = fs.readdirSync(dir).filter((f) => /\.(tsx?|css)$/.test(f));
  const exportsList = [];
  const propsList = [];
  const cvaList = [];
  for (const file of files.filter((f) => /\.(ts|tsx)$/.test(f))) {
    const lines = fs.readFileSync(path.join(dir, file), "utf8").split(/\r?\n/);
    lines.forEach((l, i) => {
      const t = l.trim();
      if (/^export (default|const|function|type|interface)\b/.test(t)) exportsList.push(`${file}:L${i + 1}: ${t.slice(0, 70)}`);
      if (/^\s*(\w+)\s*\?\s*:.+$/.test(t) && /interface/.test(lines.slice(Math.max(0, i - 12), i).join("\n"))) propsList.push(`${t.slice(0, 60)}`);
      const cv = lines[i] ?? "";
      if (/cva\(/.test(l)) {
        const variantBlock = lines.slice(i, Math.min(lines.length, i + 10)).join("\n");
        cvaList.push(variantBlock.slice(0, 420));
      }
    });
  }
  console.log(`### ${entry.id} (${entry.name}) :: dir=${path.basename(dir)}`);
  console.log(`  files: ${files.join(", ")}`);
  console.log(`  exports: ${exportsList.slice(0, 6).join(" | ") || "-"}`);
  if (propsList.length) console.log(`  props: ${[...new Set(propsList)].slice(0, 14).join(", ")}`);
  if (cvaList.length) console.log(`  cva: ${cvaList[0].replace(/\s+/g, " ").slice(0, 360)}`);
}
