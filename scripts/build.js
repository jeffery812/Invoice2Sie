import fs from "fs";
import path from "path";

const repoRoot = path.resolve(process.cwd());
const srcDir = path.join(repoRoot, "extension");
const libDir = path.join(repoRoot, "src");
const pdfjsDir = path.join(repoRoot, "node_modules", "pdfjs-dist", "build");
const outDir = path.join(repoRoot, "dist");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(srcDir)) {
  console.error("Missing extension/ directory.");
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
copyDir(srcDir, outDir);
if (fs.existsSync(libDir)) {
  copyDir(libDir, path.join(outDir, "src"));
}

if (fs.existsSync(pdfjsDir)) {
  const vendorDir = path.join(outDir, "vendor", "pdfjs");
  fs.mkdirSync(vendorDir, { recursive: true });
  fs.copyFileSync(path.join(pdfjsDir, "pdf.mjs"), path.join(vendorDir, "pdf.mjs"));
  fs.copyFileSync(
    path.join(pdfjsDir, "pdf.worker.mjs"),
    path.join(vendorDir, "pdf.worker.mjs")
  );
}

console.log("Build complete -> dist/");
