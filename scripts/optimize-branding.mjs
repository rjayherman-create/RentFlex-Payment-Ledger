import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const brandingDir = path.resolve(__dirname, "../public/branding");

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("Missing dependency: sharp. Run `pnpm add -D sharp` and retry.");
    process.exitCode = 1;
    return;
  }

  const entries = await readdir(brandingDir);
  const candidates = entries.filter((name) => /\.(png|jpg|jpeg)$/i.test(name));

  if (candidates.length === 0) {
    console.log("No PNG/JPG files found in public/branding.");
    return;
  }

  for (const fileName of candidates) {
    const source = path.join(brandingDir, fileName);
    const parsed = path.parse(fileName);
    const target = path.join(brandingDir, `${parsed.name}.webp`);

    await sharp(source)
      .webp({ quality: 78, effort: 5 })
      .toFile(target);

    const [srcInfo, targetInfo] = await Promise.all([stat(source), stat(target)]);
    const saved = Math.max(0, srcInfo.size - targetInfo.size);
    const savedPct = srcInfo.size > 0 ? ((saved / srcInfo.size) * 100).toFixed(1) : "0.0";
    console.log(`${fileName} -> ${path.basename(target)} | saved ${savedPct}%`);
  }
}

main().catch((error) => {
  console.error("Branding optimization failed:", error);
  process.exitCode = 1;
});
