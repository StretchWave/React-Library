// Temp scan (delete after M6.6): evidence for making webgl entries run locally.
// Reports per entry: vendored imports, heavy deps, null-GL bail-out guards,
// declared target deps, and the props the official variant accepts.
import fs from "node:fs";
import path from "node:path";

const cat = JSON.parse(fs.readFileSync("catalog/catalog.json", "utf8"));
const webgl = cat.entries.filter((entry) => entry.runtime === "webgl" && entry.source === "react-bits");

for (const entry of webgl) {
  const dir = entry.localDir;
  const tsx = fs.readdirSync(dir).find((file) => file.endsWith(".tsx"));
  const src = fs.readFileSync(path.join(dir, tsx), "utf8");
  const imports = [...src.matchAll(/from ['"]([^./][^'"]*)['"]/g)].map((m) => m[1]);
  const externals = [...new Set(imports.filter((spec) => !spec.startsWith("react")))];
  const guards = {
    nullGl: /if\s*\(\s*!(gl|ctx|webgl2|renderer|engine|scene)\b/.test(src),
    bail: /(return\s+null\s*;|return\s*<|catch\s*\()/.test(src),
    gl2: /getContext\(['"]webgl2?['"]\)/.test(src),
  };
  const propFns = [...src.matchAll(/^\s*(?:const|function)\s+\w+\(\{([\w, ]+)\}/gm)].map((m) => m[1]).slice(0, 2);
  console.log(`${entry.id} :: deps=${externals.join(",") || "-"} :: guards(${guards.gl2 ? "gl2" : "other"}/${guards.nullGl ? "nullcheck" : "unchecked"}/${guards.bail ? "bail" : "nobail"}) :: declared=${(entry.dependencies ?? []).map((d) => d.name).join(",") || "-"} :: props=${propFns.join(" | ")}`);
}

// What the vendored TSX files import across ALL 21 (unique package set):
const unique = new Set();
for (const entry of webgl) {
  const dir = entry.localDir;
  const tsx = fs.readdirSync(dir).find((file) => file.endsWith(".tsx"));
  const src = fs.readFileSync(path.join(dir, tsx), "utf8");
  for (const m of src.matchAll(/from ['"]([^./][^'"]*)['"]/g)) {
    if (m[1] !== "react" && !m[1].startsWith("./")) unique.add(m[1]);
  }
}
console.log("UNIQUE IMPORTS:", [...unique].sort().join(" | "));

// Assets pulled at run time (model/texture URLs etc.):
for (const entry of webgl) {
  const dir = entry.localDir;
  const tsx = fs.readdirSync(dir).find((file) => file.endsWith(".tsx"));
  const src = fs.readFileSync(path.join(dir, tsx), "utf8");
  const urls = [...src.matchAll(/https?:\/\/[^'"`\s]+/g)].map((m) => m[0]);
  if (urls.length) console.log(`URL ${entry.id}: ${[...new Set(urls)].join(" , ").slice(0, 160)}`);
}
