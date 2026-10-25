// Temp scan 6 (delete after M6.6): vendored prop defaults for the props the
// webgl wrappers will expose, plus network-dependent bits (fonts, images).
import fs from "node:fs";
import path from "node:path";

const wanted = {
  aurora: ["amplitude", "speed", "colorStops"],
  ballpit: ["count", "gravity", "friction"],
  beams: ["beamWidth", "rotation", "speed"],
  "blob-cursor": ["morphSpeed", "color", "size"],
  "circular-gallery": ["bend", "scrollSpeed", "itemSize", "font", "fontUrl"],
  "dot-grid": ["dotSize", "gap", "proximity"],
  "fluid-glass": ["text", "fontSize", "textColor", "src"],
  "glass-surface": ["borderRadius", "blur", "width", "height"],
  "gooey-nav": ["initialActiveIndex", "items"],
  hyperspeed: ["speed"],
  iridescence: ["speed", "mouseReact", "color"],
  lanyard: ["frontImage", "backImage", "imageFit", "cornerRadius", "orientation"],
  "laser-flow": ["surfaceRef", "surfaceLevel", "intensity", "color"],
  "letter-glitch": ["fontSize", "density", "baseColor"],
  lightning: ["bolts", "spread", "color"],
  "magnet-lines": ["rows", "columns", "spacing"],
  "meta-balls": ["speed", "enableMouseInteraction", "ballCount"],
  "metallic-paint": ["density", "softness", "imageSrc", "color"],
  particles: ["particleCount", "speed"],
  ribbons: ["thickness", "stiffness", "bounce"],
  waves: ["amplitude", "spacing", "lineColor"],
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
      .filter(({ l }) => new RegExp(`\\b${prop}\\s*\\??\\s*[:=]`).test(l))
      .slice(0, 2)
      .map(({ l, i }) => `L${i + 1}: ${l.slice(0, 100)}`);
    out.push(`${prop} = ${hits.length ? hits.join("  //  ") : "NOT-FOUND"}`);
  }
  console.log(`### ${slug}\n  ${out.join("\n  ")}`);
}
