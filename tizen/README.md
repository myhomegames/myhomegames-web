# MyHomeGames → Samsung Tizen TV

Tizen **Web App** (`.wgt`) shell that installs on a Samsung Smart TV and opens the
same PWA you use in a browser:

```text
.wgt splash  →  https://…/app/  →  MyHomeGames server (LAN / tunnel)
```

Application ID: `VigeMHG001.MyHomeGames` (package id `VigeMHG001`, exactly 10
alphanumeric characters before the dot).

This guide is for a **first-time sideload** on a physical Samsung TV (Developer
Mode). It is not a Samsung Apps Store submission guide.

---

## What you need

| Item | Notes |
| --- | --- |
| Mac / Linux / Windows PC | Same LAN as the TV |
| Samsung Smart TV (Tizen) | 2016+; tested on 2024 S90D (Tizen 9) |
| Samsung account | Required for the **Samsung distributor** certificate |
| Node.js + npm | To run `npm run tizen:package` |
| Tizen tooling | Cursor/VS Code **Tizen Extension**, and/or [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download) |
| `zip` CLI | Used by the packaging script (preinstalled on macOS) |

### Recommended IDE setup (Cursor / VS Code)

1. Open the `myhomegames-web` repo.
2. Install the workspace recommendations (`.vscode/extensions.json`):
   - `tizen.vscode-tizen-csharp` — Tizen Extension (SDK tools, Certificate Manager, Package Manager)
   - `anysphere.csharp` — required dependency of the Tizen Extension on **Cursor**
3. The first time you use Tizen commands, the extension downloads its own SDK under
   `~/.tizen-extension-platform/` (separate from Tizen Studio).

Optional: install **Tizen Studio** as well. The `tizen` CLI used for signing in this
guide lives at:

```bash
$HOME/tizen-studio/tools/ide/bin/tizen
$HOME/tizen-studio/tools/sdb          # Studio copy of sdb
```

The Cursor extension usually puts `sdb` here (and may already append it to your shell
`PATH` via `~/.zshrc` / `~/.bashrc`):

```bash
$HOME/.tizen-extension-platform/server/sdktools/data/tools/sdb
```

If `sdb` or `tizen` is “command not found”, either open a **new** terminal after
installing the extension, or:

```bash
source ~/.zshrc   # or ~/.bashrc
# or set PATH explicitly for this session:
export PATH="$HOME/tizen-studio/tools/ide/bin:$HOME/tizen-studio/tools:$HOME/.tizen-extension-platform/server/sdktools/data/tools:$PATH"
```

---

## Repository layout (`tizen/`)

| Path | Role |
| --- | --- |
| `config.xml` | Widget metadata, privileges, allow-navigation |
| `index.html`, `css/`, `js/` | Splash UI, then `location.replace` to the PWA |
| `icon.png` | Launcher icon |
| `scripts/package-tizen.mjs` (repo root) | Builds an **unsigned** clean `.wgt` |
| `*.wgt`, signatures, `Debug/` | **Gitignored** — never commit these |

Default start URL (override at package time): `https://myhomegames.vige.it/app/`.

---

## 1. Enable Developer Mode on the TV

On recent Samsung TVs (2022+) there is often **no** menu labelled “Smart Hub”.

1. Press **Home** on the remote.
2. Open **Apps** (the app store / apps panel — not the general Settings menu).
3. Open **App Settings** (gear icon, or scroll to settings inside Apps).
4. With focus on that settings UI, enter **`12345`** on the remote  
   (if nothing happens, try **`00000`**. Some firmwares need the **123** key first for the number pad).
5. Set **Developer mode** → **On**.
6. Set **Host PC IP** to your computer’s LAN IP (same subnet as the TV).
7. Power-cycle the TV completely (hold Power ~2s, or unplug). With **Instant On**, a
   light standby reboot is not enough.
8. After reboot, Apps should show something like **Develop Mode** at the top.

Find the TV’s IP in TV network settings (or your router).

---

## 2. Connect with `sdb`

```bash
export PATH="$HOME/.tizen-extension-platform/server/sdktools/data/tools:$HOME/tizen-studio/tools:$PATH"

sdb connect <TV_IP>
sdb devices
```

Expected:

```text
<TV_IP>:26101    device    <MODEL>
```

### Device Unique ID (DUID)

Needed when creating the Samsung distributor certificate:

```bash
sdb shell 0 getduid
```

Example output: a short alphanumeric string (e.g. `7XCFVOONDZZ4O`).  
(`sdb capability | grep duid` often prints nothing — prefer `getduid`.)

You can also read it on the TV under Support / Contact Samsung on some firmwares.

---

## 3. Create a Samsung certificate profile

A **Tizen public** distributor certificate is **not** enough for a consumer TV.
Sideload fails with certificate errors (`118`) unless you use a **Samsung**
distributor certificate that includes this TV’s **DUID**.

### In Cursor / VS Code

1. `Cmd+Shift+P` / `Ctrl+Shift+P` → **Tizen: Create Certificate**
2. Choose **Create Samsung Certificate** (not Tizen-only).
3. Profile name, e.g. `MyHomeGamesTV`.
4. Author: create new (name + strong password — save it).
5. Distributor: create new; privilege **Partner** if available, else Public; version Latest.
6. Sign in with your **Samsung account** when prompted.
7. Add the TV **DUID** from step 2.
8. Finish and ensure the profile is **Active** (**Tizen: Show Certificate**).

If Samsung options are missing: **Tizen: Package Manager** → install
**Certificate Manager** and **Samsung Certificate Extension**.

Certificates created by the extension typically land under:

```text
~/SamsungCertificate/<ProfileName>/
```

and the extension’s profile XML under:

```text
~/.tizen-extension-platform/server/sdktools/sdk-data/profile/profiles.xml
```

### Register the same profile for the Studio `tizen` CLI

The Studio CLI reads a **different** file:

```text
~/tizen-studio-data/profile/profiles.xml
```

So after creating the profile in Cursor, register it for CLI signing (use the
passwords you chose; flags are `-d` / `-dp`, not `--dist-path`):

```bash
export PATH="$HOME/tizen-studio/tools/ide/bin:$HOME/tizen-studio/tools:$PATH"

tizen security-profiles add \
  -n MyHomeGamesTV \
  -a "$HOME/SamsungCertificate/MyHomeGamesTV/author.p12" \
  -p 'YOUR_AUTHOR_PASSWORD' \
  -d "$HOME/SamsungCertificate/MyHomeGamesTV/distributor.p12" \
  -dp 'YOUR_DISTRIBUTOR_PASSWORD' \
  -A

tizen security-profiles list
```

You should see `MyHomeGamesTV` with **Active** `O`.

---

## 4. Build an unsigned package (clean)

From the **repo root** (`myhomegames-web`):

```bash
npm install          # first time
npm run tizen:package
```

Optional custom PWA URL:

```bash
npm run tizen:package -- --start-url=https://myhomegames.vige.it/app/
```

Output: `tizen/MyHomeGames.wgt` (gitignored). This archive contains **only** the
widget files (`config.xml`, `index.html`, `icon.png`, `css/`, `js/`).

> **Do not** run `tizen package` directly on the `tizen/` folder if it still
> contains old `.wgt` files, `Debug/`, README, or leftover signatures. That produces
> a dirty archive and install fails with signature errors (`118`, `-4`).

---

## 5. Sign in a clean staging directory

```bash
export PATH="$HOME/tizen-studio/tools/ide/bin:$HOME/tizen-studio/tools:$PATH"

rm -rf /tmp/mhg-tizen-sign && mkdir -p /tmp/mhg-tizen-sign
cd /tmp/mhg-tizen-sign

unzip -o /ABSOLUTE/PATH/TO/myhomegames-web/tizen/MyHomeGames.wgt
rm -f author-signature.xml signature1.xml

tizen package -t wgt -s MyHomeGamesTV -- .

# Copy signed widget back (still gitignored)
cp MyHomeGames.wgt /ABSOLUTE/PATH/TO/myhomegames-web/tizen/MyHomeGames.wgt
```

The CLI should print paths under `~/SamsungCertificate/...` for author and
distributor — not `tizen-distributor-signer.p12` (that would be the public Tizen
cert).

---

## 6. Install and launch on the TV

```bash
cd /ABSOLUTE/PATH/TO/myhomegames-web

sdb connect <TV_IP>
sdb push tizen/MyHomeGames.wgt /home/owner/share/tmp/sdk_tools/MyHomeGames.wgt
sdb shell 0 vd_appinstall VigeMHG001 /home/owner/share/tmp/sdk_tools/MyHomeGames.wgt
```

Success looks like:

```text
app_id[VigeMHG001] installing[100]
app_id[VigeMHG001] install completed
```

Launch:

```bash
sdb shell 0 was_execute VigeMHG001.MyHomeGames
```

Or open **MyHomeGames** from **Home → Apps** on the TV.

---

## Update after code changes

Once certificates and Developer Mode are set up, redeploy with:

```bash
npm run tizen:deploy -- --tv=<TV_IP>
```

Only changes under `tizen/` (shell) need a redeploy. PWA / server fixes that you already
host at the start URL do not require reinstalling the `.wgt`.

---

## 7. After launch

You should see the local splash briefly, then the PWA.

**First-time Cloudflare on Smart TV:** the Tizen app does **not** open the Cloudflare
Access login page (that UI is not D-pad friendly). Instead the PWA shows a large
**device code** (PIN) and a QR / URL such as `myhomegames-server.vige.it/link`.

1. On your phone or PC, open that link (or scan the QR).
2. Sign in with Cloudflare Access and enter the code from the TV.
3. The TV polls the tunnel manager, receives the tunnel payload, and adopts your
   public API URL — same end state as a browser “Connect tunnel”, without using the
   remote on Access.

After the library is linked once, a stored public API URL is reused on later launches
(until you disconnect). Focus styles for D-pad navigation apply when the PWA detects
a Smart TV user agent (`isSmartTvBrowser()`).

Phone shortcut from Settings (any already-connected device): **Link a TV** →
`https://myhomegames-server.vige.it/link`.

**Ops note:** Cloudflare Access needs **Bypass** policies for `/api/device/code`,
`/api/device/poll`, and `/link` on `myhomegames-server.vige.it` (see
`myhomegames-proxy` README). Keep `/api/device/approve` and `/api/get-token` behind Access.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `zsh: command not found: sdb` / `tizen` | PATH not loaded | New terminal, `source ~/.zshrc`, or export PATH as above |
| `sdb devices` empty | Developer Mode / wrong Host IP / Instant On | Re-check Apps developer settings; full power cycle; same LAN |
| `install failed[118]` + certificate chain | Tizen public distributor | Create **Samsung** cert with this TV’s DUID; re-sign |
| `install failed[118]` + invalid signature / `-4` | Dirty `.wgt` or wrong profile | Re-run unsigned package + sign in `/tmp` staging with `MyHomeGamesTV` |
| `tizen package -s MyHomeGamesTV` but `security-profiles list` only shows another profile | CLI profiles XML ≠ Cursor profiles | `tizen security-profiles add ... -A` as in §3 |
| `--dist-path` is not a valid option | Older/newer CLI flag names | Use `-d` and `-dp` |
| `launch failed[400]` | App not installed | Fix install first; then `was_execute` |
| App opens then blank / login unusable with D-pad | Old Access redirect on TV | Update PWA; use device-code pairing (§7) — phone completes Access |

Useful checks:

```bash
sdb shell 0 getduid
sdb shell 0 vd_applist | grep -i Vige
tizen security-profiles list
unzip -l tizen/MyHomeGames.wgt    # should be a short list of app files only
```

Uninstall:

```bash
sdb shell 0 vd_appuninstall VigeMHG001
```

---

## Store (Samsung Apps TV Seller Office)

A **hosted** app (shell + navigate to remote PWA) is suitable for developer sideload.
Public store listing of hosted content usually needs partnership / Content Manager
approval. A fully offline SPA package would be a separate product decision.

---

## Commands (summary)

After the one-time certificate / Developer Mode setup, update the app on the TV with:

```bash
npm run tizen:deploy -- --tv=<TV_IP>
# example:
npm run tizen:deploy -- --tv=192.168.0.165
```

This runs: unsigned package → sign with profile `MyHomeGamesTV` → `sdb` push/install → launch.

Useful variants:

```bash
TIZEN_TV_IP=192.168.0.165 npm run tizen:deploy
npm run tizen:deploy -- --tv=192.168.0.165 --profile=MyHomeGamesTV
npm run tizen:deploy -- --tv=192.168.0.165 --start-url=https://myhomegames.vige.it/app/
npm run tizen:deploy -- --tv=192.168.0.165 --no-launch
```

Unsigned package only (no TV):

```bash
npm run tizen:package
```
