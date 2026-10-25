// Temp scan 3 (delete after M6.6): multi-file import audit + lanyard detail.
import fs from "node:fs";
import path from "node:path";

const cat = JSON.parse(fs.readFileSync("catalog/catalog.json", "utf8"));

// 1) FULL multi-file import audit for the 20 non-react-bits source-link entries.
const others = cat.entries.filter((e) => e.source && e.source !== "react-bits" && e.preview?.type === "source-link");
const unique = new Map();
const perDir = new Map();
for (const e of others) {
  const files = fs.readdirSync(e.localDir).filter((f) => /\.(tsx?|jsx?)$/.test(f));
  const found = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(e.localDir, f), "utf8");
    for (const m of src.matchAll(/from ['"]([^./][^'"]*)['"]/g)) {
      if (m[1] !== "react" && !m[1].startsWith(".") && !m[1].startsWith("../")) {
        unique.set(m[1], (unique.get(m[1]) ?? 0) + 1);
        found.push(m[1]);
      }
    }
  }
  perDir.set(e.id, found.length ? found.join(",") : "-");
}
for (const [id, imports] of perDir) console.log(`OUT ${id} :: ${imports}`);
console.log("NON-RB EXTERNAL IMPORTS (full audit):", [...unique.entries()].map(([n, c]) => `${n} x${c}`).join(" | ") || "NONE");

// 2) Lanyard: how is the model used/required?
const lanyard = cat.entries.find((e) => e.id === "react-bits-lanyard");
{
  const src = fs.readFileSync(path.join(lanyard.localDir, "Lanyard.tsx"), "utf8");
  src.split(/\r?\n/).forEach((line, i) => {
    if (/model|fiber|props|export default/i.test(line)) console.log(`L${i + 1}: ${line.trim().slice(0, 118)}`);
  });
  console.log("LANYARD dir files:", fs.readdirSync(lanyard.localDir).join(", "));
}

// 3) Circle gallery item type + default font URL:
const cg = cat.entries.find((e) => e.id === "react-bits-circular-gallery");
{
  const file = fs.readdirSync(cg.localDir).find((f) => f.endsWith(".tsx"));
  const src = fs.readFileSync(path.join(cg.localDir, file), "utf8");
  src.split(/\r?\n/).forEach((line, i) => {
    if (/fontUrl|figtree|picsum|interface GalleryItem|title\?|image\?/.test(line)) console.log(`CG L${i + 1}: ${line.trim().slice(0, 120)}`);
  });
}
