// Temp scan 2 (delete after M6.6): remaining scope evidence.
import fs from "node:fs";
import path from "node:path";

const cat = JSON.parse(fs.readFileSync("catalog/catalog.json", "utf8"));

// 1) Lanyard: does it need a GLB / external asset?
const lanyard = cat.entries.find((e) => e.id === "react-bits-lanyard");
{
  const tsx = fs.readdirSync(lanyard.localDir).find((f) => f.endsWith(".tsx"));
  const src = fs.readFileSync(path.join(lanyard.localDir, tsx), "utf8");
  const need = [...src.matchAll(/glb|gltf|GLTF|useLoader|drei|fiber|model/ig)].map((m) => m[0]);
  const props = [...src.matchAll(/(?:interface|type)\s+\w*(Props|LanyardProps)[^{]*\{([\s\S]{0,400})\}/g)].map((m) => m[0].replace(/\s+/g, " ").slice(0, 320));
  console.log("LANYARD tokens:", [...new Set(need)].join(",") || "none");
  console.log("LANYARD props:", props.join(" || ") || "none-found");
}

// 2) Circular gallery: image/menu props?
const cg = cat.entries.find((e) => e.id === "react-bits-circular-gallery");
{
  const tsx = fs.readdirSync(cg.localDir).find((f) => f.endsWith(".tsx"));
  const src = fs.readFileSync(path.join(cg.localDir, tsx), "utf8");
  console.log("CIRCLEGAL props:", (src.match(/(?:interface|type)\s+\w*(Props|Options)[^{]*\{([\s\S]{0,600})\}/) || ["?"])[0].replace(/\s+/g, " ").slice(0, 420));
}

// 3) dot-grid + meta-balls: what happens after null getContext?
for (const id of ["react-bits-dot-grid", "react-bits-meta-balls"]) {
  const e = cat.entries.find((x) => x.id === id);
  const tsx = fs.readdirSync(e.localDir).find((f) => f.endsWith(".tsx"));
  const rows = fs.readFileSync(path.join(e.localDir, tsx), "utf8").split(/\r?\n/);
  rows.forEach((line, i) => {
    if (/getContext|if\s*\(\s*!gl\b|throw new|return null/.test(line)) {
      console.log(`${id} L${i + 1}: ${line.trim().slice(0, 110)}`);
    }
  });
}

// 4) The 20 non-react-bits link-out entries (16 shadcn + 4 magic-ui):
const others = cat.entries.filter((e) => e.source && e.source !== "react-bits" && e.preview?.type === "source-link");
const unique = new Map();
for (const e of others) {
  const files = (e.implementation ?? []).map((p) => p.split("/").pop() ?? p);
  for (const f of files) {
    const file = fs.readdirSync(e.localDir).find((x) => x.endsWith(".tsx") || x.endsWith(".ts"));
    const src = fs.readFileSync(path.join(e.localDir, file ?? ""), "utf8");
    for (const m of src.matchAll(/from ['"]([^./][^'"]*)['"]/g)) {
      if (m[1] !== "react" && !m[1].startsWith("./") && !m[1].startsWith("../")) {
        unique.set(m[1], (unique.get(m[1]) ?? 0) + 1);
      }
    }
  }
  console.log(`OUT ${e.id} :: files=${files.slice(0, 3).join("+")} :: deps=${(e.dependencies ?? []).map((d) => d.name).join(",") || "-"}`);
}
console.log("NON-RB EXTERNAL IMPORTS:", [...unique.entries()].map(([n, c]) => `${n} x${c}`).join(" | ") || "NONE");
