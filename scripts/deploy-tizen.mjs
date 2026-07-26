#!/usr/bin/env node
/**
 * Package (unsigned) → sign with Tizen CLI → install on a Samsung TV via sdb.
 *
 * Prerequisites: Developer Mode on the TV, Samsung security profile registered
 * for the Studio CLI (see tizen/README.md).
 *
 * Usage:
 *   npm run tizen:deploy -- --tv=192.168.0.165
 *   npm run tizen:deploy -- --tv=192.168.0.165 --profile=MyHomeGamesTV
 *   TIZEN_TV_IP=192.168.0.165 npm run tizen:deploy
 *
 * Options:
 *   --tv=<ip>              TV LAN IP (or env TIZEN_TV_IP)
 *   --profile=<name>       Security profile (default MyHomeGamesTV / TIZEN_SECURITY_PROFILE)
 *   --start-url=<url>      PWA URL baked into the shell
 *   --package=<id>         Tizen package id (default VigeMHG001)
 *   --no-launch            Skip was_execute after install
 *   --skip-package         Sign+install existing tizen/MyHomeGames.wgt (unsigned expected)
 */
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tizenRoot = join(root, "tizen");
const home = homedir();

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("-")) {
    return process.argv[idx + 1];
  }
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function which(cmd) {
  const r = spawnSync("which", [cmd], { encoding: "utf8" });
  if (r.status === 0) {
    const p = r.stdout.trim().split("\n")[0];
    if (p && existsSync(p)) return p;
  }
  return null;
}

function firstExisting(paths) {
  for (const p of paths) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

function run(label, command, args, opts = {}) {
  console.log(`\n→ ${label}`);
  console.log(`  ${command} ${args.join(" ")}`);
  const r = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  if (out) console.log(out);
  if (r.status !== 0) {
    console.error(`FAILED: ${label} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
  return r;
}

const tvIp = argValue("tv", process.env.TIZEN_TV_IP || "");
const profile = argValue(
  "profile",
  process.env.TIZEN_SECURITY_PROFILE || "MyHomeGamesTV",
);
const startUrl = argValue("start-url", "https://myhomegames.vige.it/app/");
const packageId = argValue("package", "VigeMHG001");
const appId = `${packageId}.MyHomeGames`;
const wgtName = "MyHomeGames.wgt";
const wgtPath = join(tizenRoot, wgtName);
const remoteWgt = `/home/owner/share/tmp/sdk_tools/${wgtName}`;
const skipPackage = hasFlag("skip-package");
const noLaunch = hasFlag("no-launch");

if (!tvIp) {
  console.error(
    "Missing TV IP. Use --tv=<ip> or set TIZEN_TV_IP.\n" +
      "Example: npm run tizen:deploy -- --tv=192.168.0.165",
  );
  process.exit(1);
}

const tizenBin = firstExisting([
  which("tizen"),
  join(home, "tizen-studio/tools/ide/bin/tizen"),
]);
const sdbBin = firstExisting([
  which("sdb"),
  join(home, ".tizen-extension-platform/server/sdktools/data/tools/sdb"),
  join(home, "tizen-studio/tools/sdb"),
]);

if (!tizenBin) {
  console.error(
    "tizen CLI not found. Install Tizen Studio or add tools/ide/bin to PATH.",
  );
  process.exit(1);
}
if (!sdbBin) {
  console.error(
    "sdb not found. Install the Tizen Extension SDK or Tizen Studio tools.",
  );
  process.exit(1);
}

const pathDirs = [
  dirname(tizenBin),
  dirname(sdbBin),
  join(home, "tizen-studio/tools"),
  join(home, ".tizen-extension-platform/server/sdktools/data/tools"),
].filter(Boolean);
const env = {
  ...process.env,
  PATH: `${pathDirs.join(":")}:${process.env.PATH || ""}`,
};

if (!skipPackage) {
  run("Build unsigned .wgt", process.execPath, [
    join(root, "scripts/package-tizen.mjs"),
    `--start-url=${startUrl}`,
    `--out=${wgtPath}`,
  ]);
} else if (!existsSync(wgtPath)) {
  console.error(`Missing ${wgtPath} (run without --skip-package)`);
  process.exit(1);
}

const signDir = mkdtempSync(join(tmpdir(), "mhg-tizen-sign-"));
try {
  run("Unpack unsigned wgt", "unzip", ["-o", "-q", wgtPath, "-d", signDir]);
  rmSync(join(signDir, "author-signature.xml"), { force: true });
  rmSync(join(signDir, "signature1.xml"), { force: true });

  run(
    `Sign with profile ${profile}`,
    tizenBin,
    ["package", "-t", "wgt", "-s", profile, "--", "."],
    { cwd: signDir, env },
  );

  const signed = join(signDir, wgtName);
  if (!existsSync(signed)) {
    console.error(`Signed widget not found at ${signed}`);
    process.exit(1);
  }
  copyFileSync(signed, wgtPath);
  console.log(`\nSigned widget → ${wgtPath}`);
} finally {
  rmSync(signDir, { recursive: true, force: true });
}

run("sdb connect", sdbBin, ["connect", tvIp], { env });
run("sdb devices", sdbBin, ["devices"], { env });
run("Push .wgt to TV", sdbBin, ["push", wgtPath, remoteWgt], { env });
run(
  "Install on TV",
  sdbBin,
  ["shell", "0", "vd_appinstall", packageId, remoteWgt],
  { env },
);

if (!noLaunch) {
  run("Launch app", sdbBin, ["shell", "0", "was_execute", appId], { env });
}

console.log("\nDone.");
