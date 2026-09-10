#!/usr/bin/env node
/**
 * Build a Play Store Android App Bundle (.aab) that wraps the hosted PWA
 * as a Trusted Web Activity (Google Bubblewrap).
 *
 * Prerequisites:
 *   - JDK 17 (recommended; Android Gradle Plugin often rejects newer JDKs)
 *   - Network (fetches icons / may download Android SDK via Bubblewrap)
 *
 * Usage:
 *   npm run android:aab
 *   npm run android:aab -- --start-url=https://myhomegames.vige.it/app/
 *   npm run android:aab -- --out=android-twa/dist/MyHomeGames.aab
 *   npm run android:aab -- --skip-pwa-validation
 *
 * Signing:
 *   First run creates android-twa/android.keystore (gitignored) and
 *   android-twa/.keystore-password. Override with:
 *     BUBBLEWRAP_KEYSTORE_PASSWORD / BUBBLEWRAP_KEY_PASSWORD
 *
 * Play Store domain verification:
 *   After build, deploy android-twa/assetlinks.json to
 *   https://myhomegames.vige.it/.well-known/assetlinks.json
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const twaDir = join(root, "android-twa");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  return res;
}

function runOrDie(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: "inherit",
    ...opts,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
  return res;
}

function parseSemverToVersionCode(version) {
  const m = String(version || "0.0.0").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return 1;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  return major * 10000 + minor * 100 + patch;
}

function originFromStartUrl(startUrl) {
  const u = new URL(startUrl);
  return { host: u.host, origin: u.origin, startPath: u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/` };
}

function ensureJdkHint() {
  const ver = run("java", ["-version"]);
  const text = `${ver.stderr || ""}\n${ver.stdout || ""}`;
  const m = text.match(/version "(\d+)/);
  if (m && Number(m[1]) >= 21) {
    console.warn(
      [
        "",
        "Warning: detected Java " + m[1] + ".",
        "Android / Bubblewrap builds usually need JDK 17.",
        "On macOS:  export JAVA_HOME=$(/usr/libexec/java_home -v 17)",
        "",
      ].join("\n"),
    );
  }
}

function preferJdk17Env(env) {
  if (process.env.JAVA_HOME && /jdk-?17|openjdk@17|temurin-17|zulu-17/i.test(process.env.JAVA_HOME)) {
    return env;
  }
  const candidates = [];
  if (process.platform === "darwin") {
    const home = run("/usr/libexec/java_home", ["-v", "17"]);
    if (home.status === 0 && home.stdout?.trim()) candidates.push(home.stdout.trim());
  }
  for (const p of [
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk@17",
    "/usr/local/opt/openjdk@17",
  ]) {
    if (existsSync(join(p, "bin", "java"))) candidates.push(p);
  }
  if (candidates[0]) {
    console.log(`Using JAVA_HOME=${candidates[0]}`);
    return { ...env, JAVA_HOME: candidates[0] };
  }
  return env;
}

function ensureBubblewrapConfig(env) {
  const cfgDir = join(homedir(), ".bubblewrap");
  const cfgPath = join(cfgDir, "config.json");
  if (existsSync(cfgPath)) return;
  mkdirSync(cfgDir, { recursive: true });
  const jdkPath = env.JAVA_HOME || "";
  // Empty androidSdkPath lets Bubblewrap download/manage its own SDK under ~/.bubblewrap
  writeFileSync(
    cfgPath,
    JSON.stringify(
      {
        jdkPath,
        androidSdkPath: "",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`Wrote ${cfgPath} (first Bubblewrap run may download the Android SDK).`);
}

function readOrCreatePassword() {
  const fromEnv =
    process.env.BUBBLEWRAP_KEYSTORE_PASSWORD || process.env.BUBBLEWRAP_KEY_PASSWORD;
  if (fromEnv) {
    return {
      store: process.env.BUBBLEWRAP_KEYSTORE_PASSWORD || fromEnv,
      key: process.env.BUBBLEWRAP_KEY_PASSWORD || fromEnv,
    };
  }
  const passFile = join(twaDir, ".keystore-password");
  if (existsSync(passFile)) {
    const p = readFileSync(passFile, "utf8").trim();
    return { store: p, key: p };
  }
  const p = randomBytes(18).toString("base64url");
  writeFileSync(passFile, `${p}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`Created ${passFile} (gitignored). Keep it if you upload to Play Console.`);
  return { store: p, key: p };
}

function ensureKeystore(passwords) {
  const keystorePath = join(twaDir, "android.keystore");
  if (existsSync(keystorePath)) return keystorePath;
  console.log("Creating android-twa/android.keystore …");
  const res = run("keytool", [
    "-genkeypair",
    "-v",
    "-keystore",
    keystorePath,
    "-alias",
    "android",
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-storepass",
    passwords.store,
    "-keypass",
    passwords.key,
    "-dname",
    "CN=MyHomeGames, OU=MyHomeGames, O=Vige, L=Unknown, ST=Unknown, C=IT",
  ]);
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout || "keytool failed");
    process.exit(1);
  }
  return keystorePath;
}

function sha256Fingerprint(keystorePath, passwords) {
  // Java 25+ keytool -list -v can crash (MissingFormatArgumentException).
  // Export DER cert and hash with Node crypto instead.
  const bin = spawnSync(
    "keytool",
    [
      "-exportcert",
      "-alias",
      "android",
      "-keystore",
      keystorePath,
      "-storepass",
      passwords.store,
    ],
    { encoding: "buffer" },
  );
  if (bin.status !== 0 || !bin.stdout?.length) {
    console.warn(
      "Could not export keystore certificate:",
      bin.stderr?.toString() || "keytool -exportcert failed",
    );
    return null;
  }
  const hash = createHash("sha256").update(bin.stdout).digest("hex").toUpperCase();
  return hash.match(/.{1,2}/g)?.join(":") ?? null;
}

function writeAssetLinks(packageId, fingerprint) {
  if (!fingerprint) return null;
  const doc = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageId,
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ];
  const out = join(twaDir, "assetlinks.json");
  writeFileSync(out, JSON.stringify(doc, null, 2) + "\n", "utf8");
  return out;
}

function syncTwaManifest({ host, origin, startPath, packageId }) {
  const templatePath = join(twaDir, "twa-manifest.json");
  const manifest = JSON.parse(readFileSync(templatePath, "utf8"));
  const versionName = packageJson.version;
  const versionCode = parseSemverToVersionCode(versionName);

  manifest.packageId = packageId;
  manifest.host = host;
  manifest.startUrl = startPath;
  manifest.fullScopeUrl = `${origin}${startPath}`;
  manifest.webManifestUrl = `${origin}${startPath}manifest.webmanifest`;
  manifest.iconUrl = `${origin}${startPath}icons/icon-512.png`;
  manifest.maskableIconUrl = `${origin}${startPath}icons/icon-maskable-512.png`;
  manifest.appVersionName = versionName;
  manifest.appVersion = versionName;
  manifest.appVersionCode = versionCode;
  manifest.signingKey = {
    path: "./android.keystore",
    alias: "android",
  };

  writeFileSync(templatePath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest;
}

function findAab() {
  const candidates = [
    join(twaDir, "app-release-bundle.aab"),
    join(twaDir, "app", "build", "outputs", "bundle", "release", "app-release.aab"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // Fallback: scan twaDir for *.aab
  try {
    for (const name of readdirSync(twaDir)) {
      if (name.endsWith(".aab")) return join(twaDir, name);
    }
  } catch {
    // ignore
  }
  return null;
}

function main() {
  const defaultStart = "https://myhomegames.vige.it/app/";
  const startUrl = argValue("start-url", defaultStart);
  const packageId = argValue("package-id", "it.vige.myhomegames");
  const outPath = resolve(
    argValue("out", join(twaDir, "dist", `MyHomeGames-${packageJson.version}.aab`)),
  );
  const skipPwaValidation = hasFlag("skip-pwa-validation");

  if (!existsSync(twaDir)) {
    console.error(`Missing ${twaDir}`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = originFromStartUrl(startUrl);
  } catch {
    console.error(`Invalid --start-url: ${startUrl}`);
    process.exit(1);
  }

  ensureJdkHint();
  let env = preferJdk17Env({ ...process.env });
  if (env.JAVA_HOME) {
    env = {
      ...env,
      PATH: `${join(env.JAVA_HOME, "bin")}${process.platform === "win32" ? ";" : ":"}${env.PATH || ""}`,
    };
  }
  ensureBubblewrapConfig(env);

  const passwords = readOrCreatePassword();
  env = {
    ...env,
    BUBBLEWRAP_KEYSTORE_PASSWORD: passwords.store,
    BUBBLEWRAP_KEY_PASSWORD: passwords.key,
  };

  ensureKeystore(passwords);
  const manifest = syncTwaManifest({
    host: parsed.host,
    origin: parsed.origin,
    startPath: parsed.startPath,
    packageId,
  });

  const fingerprint = sha256Fingerprint(join(twaDir, "android.keystore"), passwords);
  const assetLinksPath = writeAssetLinks(packageId, fingerprint);

  const bubblewrap = join(root, "node_modules", ".bin", "bubblewrap");
  const bubblewrapCmd = existsSync(bubblewrap) ? bubblewrap : "npx";
  const bubblewrapPrefix = existsSync(bubblewrap)
    ? []
    : ["--yes", "@bubblewrap/cli@1.25.0"];
  // Bubblewrap expects --manifest to be the twa-manifest.json *file*, not a directory.
  const manifestFile = join(twaDir, "twa-manifest.json");

  // Regenerate Android project from twa-manifest.json (non-interactive).
  runOrDie(
    bubblewrapCmd,
    [
      ...bubblewrapPrefix,
      "update",
      "--skipVersionUpgrade",
      `--manifest=${manifestFile}`,
    ],
    { cwd: twaDir, env },
  );

  const buildArgs = [
    ...bubblewrapPrefix,
    "build",
    `--manifest=${manifestFile}`,
  ];
  if (skipPwaValidation) buildArgs.push("--skipPwaValidation");

  runOrDie(bubblewrapCmd, buildArgs, { cwd: twaDir, env });

  const aab = findAab();
  if (!aab) {
    console.error("Build finished but no .aab was found under android-twa/");
    process.exit(1);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  copyFileSync(aab, outPath);

  console.log("");
  console.log(`✓ AAB: ${outPath}`);
  console.log(`  packageId: ${manifest.packageId}`);
  console.log(`  version:   ${manifest.appVersionName} (${manifest.appVersionCode})`);
  console.log(`  host:      https://${manifest.host}${manifest.startUrl}`);
  if (fingerprint) {
    console.log(`  SHA-256:   ${fingerprint}`);
  }
  if (assetLinksPath) {
    console.log(`  assetlinks: ${assetLinksPath}`);
    console.log(
      "  Deploy that file to https://" +
        manifest.host +
        "/.well-known/assetlinks.json so the TWA opens fullscreen.",
    );
  }
  console.log("");
}

main();
