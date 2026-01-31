import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(process.cwd());
const distDir = path.join(repoRoot, "dist");
const outDir = path.join(repoRoot, "dist-pack");
const zipPath = path.join(outDir, "Invoice2SIE.zip");

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

try {
  execSync(`zip -r "${zipPath}" .`, { cwd: distDir, stdio: "inherit" });
  console.log(`Packed -> ${zipPath}`);
} catch (err) {
  console.error("Failed to run zip. Ensure `zip` is available on your system.");
  process.exit(1);
}
