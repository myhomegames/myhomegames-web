# Themes (skins)

MyHomeGames Web applies **one active skin at a time**: a single CSS string injected into a `<style id="mhg-active-skin-bundle">` element in the document head. Built-in themes ship with the app; you can also **install custom skins** from the Settings page (stored in the browser).

## Built-in skins

| ID | Name | Purpose |
|----|------|---------|
| `builtin-plex` | Plex | Default look. CSS lives under `src/skins/plex/` and is assembled in `src/skins/plex/bundle.ts`. |
| `builtin-empty` | Empty | No theme rules (Tailwind + `index.css` shell only). Useful to verify that skin switching works. |

The active skin id is stored in `localStorage` under `mhg_active_skin_id`. While the app runs, `document.documentElement.dataset.mhgSkin` is set to `plex`, `empty`, or `custom` for the active built-ins vs user skins.

---

## Installing a skin (browser, no code)

1. Open **Settings** and find the **Skin / theme** section (`SettingsSkinSection`).
2. Optionally enter a **display name** (otherwise the file name is used).
3. Click **Choose file** and pick a **`.css`** file (plain text CSS).
4. The skin is saved, activated immediately, and appears in the **Active skin** dropdown.

**Limits** (see `src/skins/skinStorage.ts`):

- Up to **24** custom skins stored per origin.
- Each skin’s CSS may be at most **600,000** characters after trim.
- Empty files are rejected.

**Removal**: use **Remove** next to an installed custom skin. Built-in Plex and Empty cannot be deleted.

**Important — full replacement, not overrides**

When a custom skin is active, its CSS **replaces** the entire Plex bundle for that session. The app does **not** merge your file on top of Plex. A small “override-only” file will **not** inherit Plex: you need a stylesheet that covers everything you care about (often by starting from the bundled Plex CSS and editing it).

**Persistence**: custom skins live in `localStorage` (`mhg_custom_skins_v1`). They are per-browser and per-origin; clearing site data removes them.

---

## Creating a skin

You have two approaches: **contribute a built-in skin in the repo** (TypeScript bundle), or **author a single `.css` file** for upload (typically derived from Plex).

### Option A — Custom skin file for Settings upload

1. Use the **Plex** skin as the baseline. In a checkout of this repo, the concatenated bundle is built in `src/skins/plex/bundle.ts` from many `?raw` imports; the output order is documented in that file (globals → app → components → pages).
2. For a one-off theme, build the app or concatenate those sources locally into **one** `.css` file, then edit classes (e.g. under `.mhg-` and skin-specific selectors in `src/skins/plex/`).
3. Upload that file via **Settings → Skin** as described above.

Tips:

- Inspect the running app with DevTools to find class names and structure.
- Keep file size under the character limit; drop unused sections if you forked a huge bundle.

### Option B — New built-in skin in the repository

Use this when the theme should ship with the app (no upload step).

1. **Folder layout**  
   Add a directory next to Plex, e.g. `src/skins/mytheme/`, mirroring Plex where needed:

   - `base/` — global tokens, resets, typography (see `src/skins/plex/base/globals.css`).
   - `app/` — shell layout (see `src/skins/plex/app/App.css`).
   - `components/`, `pages/` — CSS aligned with React feature areas (same paths as under `src/skins/plex/`).

2. **Bundle module**  
   Create `src/skins/mytheme/bundle.ts` that imports every CSS file with `?raw`, concatenates them in a **stable order** (same idea as `PLEX_SKIN_CSS` in `src/skins/plex/bundle.ts`). Order matters for cascade.

3. **Wire it up**

   - `src/skins/skinIds.ts` — add id/name constants and include the new id in `isBuiltinSkinId` / built-in set.
   - `src/contexts/SkinContext.tsx` — add the skin to the `skins` list passed to the UI; extend `SkinProvider` props if you need another bundled string (today: `plexCss`, `emptySkinCss`).
   - `src/skins/skinRuntime.ts` — in `applyActiveSkinFromStorage`, resolve the new id to the bundled string (same pattern as Plex and Empty).
   - `src/main.tsx` — import the new bundle, pass it into `SkinProvider`, and include it in the object passed to `applyActiveSkinFromStorage` on startup.

4. **Components**  
   React components import skin CSS via paths under `src/skins/plex/...` for the default theme. For a second built-in, you either keep **one** canonical tree of CSS per skin (recommended) or introduce indirection; today the codebase is oriented around the Plex tree as the reference implementation.

5. **Settings UI**  
   If the new skin is built-in, add labels/options in i18n and in `SettingsSkinSection` / `skinIds` like the Empty skin, so users can select it.

---

## Reference files

| Topic | File |
|-------|------|
| Startup injection | `src/main.tsx` |
| Provider & selection / upload | `src/contexts/SkinContext.tsx` |
| Apply CSS + `data-mhg-skin` | `src/skins/skinRuntime.ts` |
| `localStorage` keys & limits | `src/skins/skinStorage.ts` |
| Built-in ids | `src/skins/skinIds.ts` |
| Plex concatenated bundle | `src/skins/plex/bundle.ts` |
| Upload UI | `src/components/settings/SettingsSkinSection.tsx` |

---

## Troubleshooting

- **Blank or broken UI after upload** — the file likely omitted large parts of the baseline theme. Start from a full Plex concatenation or switch back to **Plex** in Settings.
- **Skin disappeared** — `localStorage` was cleared or you are on a different device or browser profile.
- **“Too many skins” / “CSS too large”** — remove unused custom skins or shrink the file to fit the limits above.
