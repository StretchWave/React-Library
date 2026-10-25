// Temp scan 7 (delete after M6.6): assignment defaults + special-case blocks.
import fs from "node:fs";
import path from "node:path";

const wanted = {
  aurora: ["amplitude", "speed", "blend", "height"],
  ballpit: ["colors", "material"],
  beams: ["beamWidth", "rotation", "speed", "waveLength"],
  "blob-cursor": ["morphSpeed", "color", "size"],
  "circular-gallery": ["bend", "scrollSpeed", "itemSize", "textColor"],
  "fluid-glass": ["fontSize", "textColor", "fontFamily"],
  "glass-surface": ["blur", "opacity", "brightness"],
  hyperspeed: ["speed", "lanes"],
  "laser-flow": ["surfaceLevel", "intensity", "color", "beamWidth"],
  "letter-glitch": ["fontSize", "density", "baseColor"],
  lightning: ["bolts", "spread", "color"],
  "magnet-lines": ["rows", "columns", "spacing", "containerSize"],
  "metallic-paint": ["density", "softness", "imageSrc"],
  particles: ["particleCount", "speed", "particleColors"],
  ribbons: ["thickness", "stiffness", "bounce", "colors"],
  waves: ["amplitude", "spacing", "lineColor", "backgroundColor"],
};

const source = "catalog/components/react-bits";
for (const [slug, props] of Object.entries(wanted)) {
  const dir = path.join(source, slug);
  const file = fs.readdirSync(dir).find((x) => x.endsWith(".tsx"));
  const lines = fs.readFileSync(path.join(dir, file), "utf8").split(/\r?\n/);
  const out = [];
  for (const prop of props) {
    const hits = lines
      .map((l, i) => ({ l: l.trim(), i }))
      .filter(({ l }) => new RegExp(`^\\s*${prop}\\s*\\??\\s*=\\s*\\S`).test(l))
      .slice(0, 2)
      .map(({ l, i }) => `L${i + 1}: ${l.slice(0, 96)}`);
    out.push(`${prop} = ${hits.join("  //  ") || "no-default"}`);
  }
  console.log(`${slug}: ${out.join(" | ")}`);
}

const cg = fs.readdirSync(path.join(source, "circular-gallery")).find((x) => x.endsWith(".tsx"));
const cgLines = fs.readFileSync(path.join(source, "circular-gallery", cg), "utf8").split(/\r?\n/);
console.log("CG resolveFont block:");
cgLines.slice(303, 318).forEach((l, i) => console.log(`  L${i + 304}: ${l.trim().slice(0, 110)}`));
const gooey = fs.readdirSync(path.join(source, "gooey-nav")).find((x) => x.endsWith(".tsx"));
{
  const lines = fs.readFileSync(path.join(source, "gooey-nav", gooey), "utf8").split(/\r?\n/);
  const start = lines.findIndex((l) => /DEFAULT_ITEMS/.test(l));
  console.log("GOOEY DEFAULT_ITEMS:", lines.slice(start, start + 6).join(" ").slice(0, 240));
}
const lan = fs.readdirSync(path.join(source, "lanyard")).find((x) => x.endsWith(".tsx"));
{
  const lines = fs.readFileSync(path.join(source, "lanyard", lan), "utf8").split(/\r?\n/);
  console.log("LANYARD props L9-60:");
  lines.slice(8, 60).forEach((l, i) => console.log(`  L${i + 9}: ${l.trim().slice(0, 100)}`));
}
const mp = fs.readdirSync(path.join(source, "metallic-paint")).find((x) => x.endsWith(".tsx"));
{
  const lines = fs.readFileSync(path.join(source, "metallic-paint", mp), "utf8").split(/\r?\n/);
  const idx = lines.findIndex((l) => /imageSrc/.test(l));
  console.log("METALLIC imageSrc contexts:");
  lines.forEach((l, i) => { if (/imageSrc/.test(l)) console.log(`  L${i + 1}: ${l.trim().slice(0, 110)}`); });
  console.log("METALLIC destructuring:");
  const ds = lines.findIndex((l) => /export default function|const MetallicPaint/.test(l));
  lines.slice(ds, ds + 14).forEach((l, i) => console.log(`  L${ds + i + 1}: ${l.trim().slice(0, 100)}`));
}
