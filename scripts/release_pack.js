import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

const repoRoot = path.resolve(process.cwd());
const manifestPath = path.join(repoRoot, "extension", "manifest.json");
const packageJsonPath = path.join(repoRoot, "package.json");

function parseSemver(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}. Expected x.y.z`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function makeVersions(current) {
  const v = parseSemver(current);
  return {
    keep: `${v.major}.${v.minor}.${v.patch}`,
    patch: `${v.major}.${v.minor}.${v.patch + 1}`,
    minor: `${v.major}.${v.minor + 1}.0`,
    major: `${v.major + 1}.0.0`
  };
}

function updateVersionFile(filePath, nextVersion) {
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  json.version = nextVersion;
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

async function main() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error("extension/manifest.json not found.");
  }
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("package.json not found.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const currentVersion = manifest.version;
  const versions = makeVersions(currentVersion);

  console.log(`Current version: ${currentVersion}`);
  console.log("Select target version:");
  console.log(`1) Keep current: ${versions.keep}`);
  console.log(`2) Patch bump: ${versions.patch}`);
  console.log(`3) Minor bump: ${versions.minor}`);
  console.log(`4) Major bump: ${versions.major}`);

  const rl = readline.createInterface({ input, output });
  const answer = (await rl.question("Enter 1-4: ")).trim();
  rl.close();

  const map = {
    "1": versions.keep,
    "2": versions.patch,
    "3": versions.minor,
    "4": versions.major
  };

  const nextVersion = map[answer];
  if (!nextVersion) {
    throw new Error("Invalid selection. Please choose 1, 2, 3, or 4.");
  }

  updateVersionFile(manifestPath, nextVersion);
  updateVersionFile(packageJsonPath, nextVersion);

  console.log(`Using version: ${nextVersion}`);
  console.log("Building extension...");
  execSync("node scripts/build.js", { cwd: repoRoot, stdio: "inherit" });

  console.log("Packing zip...");
  execSync("node scripts/pack.js", { cwd: repoRoot, stdio: "inherit" });

  console.log("Done.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
