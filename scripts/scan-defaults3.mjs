// Temp scan 8 (delete after M6.6): four tricky destructuring blocks + lanyard init.
import fs from "node:fs";
import path from "node:path";

const source = "catalog/components/react-bits";
const blocks = {
  "fluid-glass": /export default FluidGlass|const FluidGlass/,
  "glass-surface": /const GlassSurface|function GlassSurface/,
  "magnet-lines": /const MagnetLines|function MagnetLines/,
  "laser-flow": /const LaserFlow|function LaserFlow/,
};
for (const [slug, rx] of Object.entries(blocks)) {
  const dir = path.join(source, slug);
  const file = fs.readdirSync(dir).find((x) => x.endsWith(".tsx"));
  const lines = fs.readFileSync(path.join(dir, file), "utf8").split(/\r?\n/);
  const start = lines.findIndex((l) => rx.test(l));
  const end = start >= 0 ? lines.slice(start + 1).findIndex((l) => /=>|: \w+Props/.test(l)) : -1;
  console.log(`### ${slug} (L${start + 1})`);
  lines.slice(start, start + (end > 0 ? end + 2 : 16)).forEach((l, i) => console.log(`  L${start + i + 1}: ${l.slice(0, 108)}`));
}

{
  const dir = path.join(source, "lanyard");
  const file = fs.readdirSync(dir).find((x) => x.endsWith(".tsx"));
  const lines = fs.readFileSync(path.join(dir, file), "utf8").split(/\r?\n/);
  const idx = lines.findIndex((l) => /buildSettings|defaultSettings|const settings/.test(l));
  console.log(`### lanyard settings init (L${idx + 1})`);
  lines.slice(idx, idx + 30).forEach((l, i) => console.log(`  L${idx + i + 1}: ${l.slice(0, 108)}`));
}
