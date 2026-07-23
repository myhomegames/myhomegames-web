#!/usr/bin/env node
/**
 * Copy twa/assetlinks.json (or the template) into docs/.well-known/ for GitHub Pages.
 * Run on branch `main` where `docs/` is published.
 *
 * Usage:
 *   node scripts/publish-assetlinks.mjs
 *   node scripts/publish-assetlinks.mjs --fingerprint AA:BB:CC:...
 */
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsWellKnown = join(root, "docs", ".well-known");
const outFile = join(docsWellKnown, "assetlinks.json");
const generated = join(root, "twa", "assetlinks.json");
const template = join(root, "twa", "assetlinks.template.json");

const fingerprintArg = process.argv.indexOf("--fingerprint");
const fingerprint =
  fingerprintArg >= 0 ? process.argv[fingerprintArg + 1]?.trim() : undefined;

if (!existsSync(join(root, "docs"))) {
  console.error(
    "docs/ not found. Checkout `main` (GitHub Pages) or create docs/ before publishing assetlinks.",
  );
  process.exit(1);
}

mkdirSync(docsWellKnown, { recursive: true });

if (fingerprint) {
  const json = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "it.vige.myhomegames",
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ];
  writeFileSync(outFile, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outFile} with provided fingerprint.`);
} else {
  const source = existsSync(generated) ? generated : template;
  copyFileSync(source, outFile);
  console.log(`Copied ${source} → ${outFile}`);
  if (source === template) {
    console.warn(
      "WARNING: template still has REPLACE_WITH_PLAY_APP_SIGNING_SHA256. Pass --fingerprint or run bubblewrap fingerprint first.",
    );
  }
}

// Show a quick sanity check of what will be served.
try {
  const body = readFileSync(outFile, "utf8");
  JSON.parse(body);
  console.log("JSON OK. After push to main, verify:");
  console.log("  https://myhomegames.vige.it/.well-known/assetlinks.json");
} catch (err) {
  console.error("Invalid JSON in output:", err);
  process.exit(1);
}
