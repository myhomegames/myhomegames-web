# MyHomeGames → Android (Play Store AAB)

Android **App Bundle** (`.aab`) shell that installs like a native app and opens the
same PWA you use in a browser, via a
[Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/)
([Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)):

```text
.aab launcher  →  https://…/app/  →  MyHomeGames server (LAN / tunnel)
```

Application ID (package name): `it.vige.myhomegames`.

This guide is for building a **Play Store–uploadable** AAB (and a local test APK)
around the hosted PWA. It does **not** embed the web assets in the package — same
idea as the Tizen shell in [`tizen/README.md`](../tizen/README.md).

---

## What you need

| Item | Notes |
| --- | --- |
| Mac / Linux / Windows PC | Build machine |
| Node.js + npm | To run `npm run android:aab` |
| **JDK 17** | Android Gradle Plugin often rejects newer JDKs (e.g. 21/25) |
| Network | Fetches PWA icons; first run may download the Android SDK under `~/.bubblewrap` |
| Live PWA | Default start URL: `https://myhomegames.vige.it/app/` must be reachable |
| Google Play Console account | Only if you upload the AAB to Play |

### JDK 17 (recommended)

```bash
# macOS (Homebrew)
brew install openjdk@17
export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || echo /opt/homebrew/opt/openjdk@17)"
export PATH="$JAVA_HOME/bin:$PATH"
```

The packaging script also tries to auto-detect Homebrew’s OpenJDK 17. If you see
Java 25 (or another unsupported version) warnings, set `JAVA_HOME` explicitly as
above.

---

## Repository layout (`android-twa/`)

| Path | Role |
| --- | --- |
| `twa-manifest.json` | Bubblewrap TWA config (host, icons, package id, version) |
| `scripts/package-android-aab.mjs` (repo root) | Non-interactive `update` + `build` → `.aab` |
| `android.keystore`, `.keystore-password` | **Gitignored** — created on first run |
| `assetlinks.json`, `dist/*.aab`, `app/`, `gradle*`, `*.apk` | **Gitignored** — build outputs |

Default start URL (override at package time): `https://myhomegames.vige.it/app/`.

---

## 1. Install dependencies

From the `myhomegames-web` repo root:

```bash
npm install
```

This pulls `@bubblewrap/cli` (devDependency).

---

## 2. Build the AAB

```bash
npm run android:aab
```

Useful variants:

```bash
npm run android:aab -- --start-url=https://myhomegames.vige.it/app/
npm run android:aab -- --out=android-twa/dist/MyHomeGames.aab
npm run android:aab -- --package-id=it.vige.myhomegames
npm run android:aab -- --skip-pwa-validation
```

Default output:

```text
android-twa/dist/MyHomeGames-<version>.aab
```

(`<version>` comes from `package.json`.)

The script also writes a signed test APK under `android-twa/` (gitignored) when
Bubblewrap produces one.

> **Do not** commit keystores, passwords, `.aab`, or `.apk` files.

---

## 3. Signing

First successful run creates (gitignored):

- `android-twa/android.keystore`
- `android-twa/.keystore-password`

Override passwords with environment variables:

```bash
export BUBBLEWRAP_KEYSTORE_PASSWORD=...
export BUBBLEWRAP_KEY_PASSWORD=...
npm run android:aab
```

**Keep the same keystore** for every Play Console upload of this package id.
Losing it means you cannot update the same listing with a new signing key
(without Play App Signing recovery flows).

---

## 4. Digital Asset Links (fullscreen TWA)

After a build, the script writes `android-twa/assetlinks.json` with the keystore
SHA-256 fingerprint. Publish it at:

```text
https://myhomegames.vige.it/.well-known/assetlinks.json
```

Content-Type should be `application/json`. Without a matching asset links file,
Android may show the Chrome URL bar instead of a fullscreen Trusted Web Activity.

Verify (after deploy):

```bash
curl -sS https://myhomegames.vige.it/.well-known/assetlinks.json
```

Google’s statement list tester can also check package name + fingerprint.

---

## 5. Upload to Play Console

1. Open [Google Play Console](https://play.google.com/console) → create / select the app
   with package name `it.vige.myhomegames` (or your `--package-id`).
2. Create a release (internal / closed / production) and upload
   `android-twa/dist/MyHomeGames-<version>.aab`.
3. Complete store listing, content rating, and privacy policy as required.
4. Ensure `.well-known/assetlinks.json` is live on the PWA host before relying on
   fullscreen TWA behaviour in production.

A **hosted** TWA (shell + remote PWA) is the intended model, same as Tizen sideload.
An offline SPA packaged inside the APK would be a separate product decision.

---

## Commands (summary)

```bash
npm run android:aab
npm run android:aab -- --start-url=https://myhomegames.vige.it/app/
npm run android:aab -- --out=android-twa/dist/MyHomeGames.aab
npm run android:aab -- --skip-pwa-validation
```

Related (Samsung TV shell):

```bash
npm run tizen:package
npm run tizen:deploy -- --tv=<TV_IP>
```

See [`tizen/README.md`](../tizen/README.md).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `EISDIR: illegal operation on a directory, read` | Old script passed a folder to `--manifest` | Use current `scripts/package-android-aab.mjs` (expects `twa-manifest.json` file) |
| `keytool` / `MissingFormatArgumentException` on Java 25 | `keytool -list -v` bug | Script uses `exportcert` + SHA-256; prefer JDK 17 for the Gradle build |
| Gradle / AGP fails on Java 21+ | Unsupported JDK | `export JAVA_HOME=…/openjdk@17` then re-run |
| PWA validation fails | Host unreachable or bad icons | Check the live URL; or `--skip-pwa-validation` |
| TWA shows URL bar | Missing / wrong asset links | Deploy `assetlinks.json` with the build fingerprint |
| Play rejects upload | Wrong keystore / versionCode | Reuse the same keystore; bump `package.json` version (drives `appVersionCode`) |

First Bubblewrap run may download the Android SDK into `~/.bubblewrap` and ask to
accept licenses in some environments — re-run after setup completes.
