# MyHomeGames → Google Play (Trusted Web Activity)

Wrapper Android (TWA / Bubblewrap) della PWA su
`https://myhomegames.vige.it/app/`.

L’App Store iOS non è coperto qui (serve un wrapper tipo Capacitor + review Apple).

## Prerequisiti

- Node.js 18+
- Account [Google Play Console](https://play.google.com/console) (quota sviluppatore una tantum)
- JDK 17 + Android SDK (Bubblewrap può scaricarli al primo avvio)

## 1. Genera il progetto Android

Dalla root del repo:

```bash
cd twa
npx @bubblewrap/cli init \
  --manifest="https://myhomegames.vige.it/app/manifest.webmanifest" \
  --directory="."
```

Conferma i valori (o usa quelli già in `twa-manifest.json`):

| Campo | Valore |
| --- | --- |
| Host | `myhomegames.vige.it` |
| Start URL | `/app/` |
| Package ID | `it.vige.myhomegames` |
| Name | `MyHomeGames` |

Alla fine Bubblewrap crea keystore + progetto Gradle. **Non committare** `android.keystore`.

Se `twa-manifest.json` esiste già e vuoi solo rigenerare i file Android:

```bash
cd twa
npx @bubblewrap/cli update
```

## 2. Build AAB / APK

```bash
cd twa
npx @bubblewrap/cli build
```

Output tipici:

- `app-release-bundle.aab` → caricamento su Play Console
- `app-release-signed.apk` → test locale

## 3. Digital Asset Links (obbligatorio)

Senza questo file Chrome apre la PWA in Custom Tabs invece che full-screen TWA.

1. Su Play Console → App → Setup → App integrity → **App signing**  
   copia lo **SHA-256 certificate fingerprint** (quello di *App signing key*, non solo upload key).
2. In `twa/`:

```bash
npx @bubblewrap/cli fingerprint add "AA:BB:CC:..."
npx @bubblewrap/cli fingerprint generateAssetLinks
```

3. Pubblica il file generato su:

`https://myhomegames.vige.it/.well-known/assetlinks.json`

Sul ramo `main` (GitHub Pages usa `docs/`):

```text
docs/.well-known/assetlinks.json
```

Template di partenza: `assetlinks.template.json` (sostituisci il fingerprint).

Verifica:

```bash
curl -sI https://myhomegames.vige.it/.well-known/assetlinks.json
# deve essere 200 + application/json
```

Statement list Google:

`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://myhomegames.vige.it&relation=delegate_permission/common.handle_all_urls`

## 4. Play Console

1. Crea app → tipo **App** → gratuito  
2. Compila scheda store (descrizione, screenshot telefono, icona 512)  
3. Privacy policy URL (obbligatoria)  
4. Carica `app-release-bundle.aab` su un track (internal testing consigliato prima)  
5. Dopo la prima release con Play App Signing, riallinea `assetlinks.json` con lo SHA-256 di **App signing**

## Note MyHomeGames

- La PWA parla a un server self-hosted: nello store spiega chiaramente che serve un server MyHomeGames sulla rete di casa.
- Scope `/app/`: il TWA deve usare host + startUrl come sopra, non la homepage marketing.
- Aggiornamenti web: bastano i deploy della PWA; un nuovo AAB serve solo per cambiare package/icone/versionCode Android.

## Comandi utili

```bash
# dalla root
npm run twa:update   # bubblewrap update in ./twa
npm run twa:build    # bubblewrap build in ./twa
```
