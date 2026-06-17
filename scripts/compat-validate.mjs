#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROLE = "web";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "compatibility.json");

function isValidSemver(version) {
  if (typeof version !== "string") return false;
  const core = version.trim().replace(/^v/i, "").split("-")[0];
  const parts = core.split(".").map((n) => parseInt(n, 10));
  return parts.length >= 1 && !parts.some((n) => Number.isNaN(n));
}

const errors = [];
if (!fs.existsSync(FILE)) {
  errors.push(`Missing ${FILE}`);
} else {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    errors.push(`Invalid JSON in ${FILE}: ${e.message}`);
    doc = null;
  }
  if (doc) {
    if (doc.role !== ROLE) errors.push(`role must be "${ROLE}"`);
    const min = doc.requires?.minServerVersion;
    if (typeof min !== "string" || !isValidSemver(min)) {
      errors.push("requires.minServerVersion must be a semver string (e.g. 1.1.2)");
    }
  }
}

if (errors.length) {
  console.error("compatibility.json validation failed:\n");
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log("compatibility.json is valid.");
