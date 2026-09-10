# Android App Bundle (PWA → TWA)

Builds a Play Store **`.aab`** that opens the hosted MyHomeGames PWA inside a
[Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/)
via [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

## Prerequisites

- **JDK 17** (recommended). Newer JDKs often fail with Android Gradle Plugin.
  - macOS: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`
  - or: `brew install openjdk@17` then the script auto-detects Homebrew’s JDK 17
- Network access (icons + first-time Android SDK download under `~/.bubblewrap`)
- The live PWA must be reachable (default: `https://myhomegames.vige.it/app/`)
- If PWA validation fails (offline / temporary), use `--skip-pwa-validation`

## Build

```bash
npm install
npm run android:aab
```

Output (default):

```text
android-twa/dist/MyHomeGames-<version>.aab
```

Options:

```bash
npm run android:aab -- --start-url=https://myhomegames.vige.it/app/
npm run android:aab -- --out=android-twa/dist/MyHomeGames.aab
npm run android:aab -- --package-id=it.vige.myhomegames
npm run android:aab -- --skip-pwa-validation
```

## Signing

First run creates (gitignored):

- `android-twa/android.keystore`
- `android-twa/.keystore-password`

Override passwords with:

```bash
export BUBBLEWRAP_KEYSTORE_PASSWORD=...
export BUBBLEWRAP_KEY_PASSWORD=...
```

Keep the same keystore for Play Console uploads.

## Digital Asset Links

After a successful build, `android-twa/assetlinks.json` is written with the
keystore SHA-256 fingerprint. Publish it at:

```text
https://myhomegames.vige.it/.well-known/assetlinks.json
```

Without this file, Android may show the URL bar instead of a fullscreen TWA.

## Notes

- This does **not** embed the web assets in the APK/AAB; the app loads the live
  PWA URL (same idea as the Tizen shell).
- `twa-manifest.json` is updated by the script with version from `package.json`
  and the chosen `--start-url`.
