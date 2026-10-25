// Temp scan 10 (delete after M6.6): what preview types do non-react-bits entries really have?
import fs from "node:fs";

const cat = JSON.parse(fs.readFileSync("catalog/catalog.json", "utf8"));
const others = cat.entries.filter((e) => e.source && e.source !== "react-bits");
for (const e of others) {
  console.log(`${e.id} :: source=${e.source} :: preview=${e.preview?.type ?? "none"} :: dir=${e.localDir} :: runtime=${e.runtime ?? "-"}`);
}
console.log(`total: ${others.length}`);
