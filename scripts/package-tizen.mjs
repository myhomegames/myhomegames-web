#!/usr/bin/env node
/**
 * Package the Tizen TV shell as an unsigned .wgt (ZIP).
 * Sign + install with Tizen Studio / CLI + distributor certificate for a real TV.
 *
 * Usage:
 *   node scripts/package-tizen.mjs
 *   node scripts/package-tizen.mjs --start-url=https://myhomegames.vige.it/app/
 *   node scripts/package-tizen.mjs --out=tizen/MyHomeGames.wgt
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tizenRoot = join(root, "tizen");

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const startUrl = argValue("start-url", "https://myhomegames.vige.it/app/");
const outPath = argValue("out", join(tizenRoot, "MyHomeGames.wgt"));

const required = [
  "config.xml",
  "index.html",
  "icon.png",
  "css/splash.css",
  "js/config.js",
  "js/main.js",
];

for (const rel of required) {
  if (!existsSync(join(tizenRoot, rel))) {
    console.error(`Missing ${rel} under tizen/`);
    process.exit(1);
  }
}

const staging = mkdtempSync(join(tmpdir(), "mhg-tizen-"));
try {
  for (const rel of required) {
    const dest = join(staging, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(tizenRoot, rel), dest);
  }

  writeFileSync(
    join(staging, "js", "config.js"),
    `window.MHG_TIZEN = {\n  startUrl: ${JSON.stringify(startUrl)},\n};\n`,
    "utf8",
  );

  mkdirSync(dirname(outPath), { recursive: true });
  if (existsSync(outPath)) rmSync(outPath);

  // .wgt is a zip of the widget root (no enclosing folder).
  const zip = spawnSync("zip", ["-r", "-q", outPath, ...required], {
    cwd: staging,
    encoding: "utf8",
  });
  if (zip.status !== 0) {
    console.error(zip.stderr || zip.stdout || "zip failed (is `zip` installed?)");
    process.exit(1);
  }

  const list = spawnSync("unzip", ["-Z1", outPath], { encoding: "utf8" });
  if (list.status === 0) {
    const entries = new Set(list.stdout.split("\n").filter(Boolean));
    for (const rel of required) {
      if (!entries.has(rel)) {
        console.warn(`WARNING: ${rel} missing from wgt listing`);
      }
    }
  }

  console.log(`Wrote ${outPath}`);
  console.log(`startUrl=${startUrl}`);
  console.log(
    "Unsigned package. Sign with Tizen Studio (Certificate Manager) before installing on a TV.",
  );
} finally {
  rmSync(staging, { recursive: true, force: true });
}
