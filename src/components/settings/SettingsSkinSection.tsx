import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSkin } from "../../contexts/SkinContext";
import { useSettings } from "../../contexts/SettingsContext";
import { SKIN_WEB_KEYS, type SkinWebManifest } from "../../skins/skinWebManifest";
import { API_BASE } from "../../config";

function isZipSkinFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith(".zip") || n.endsWith(".mhg-skin.zip");
}

export default function SettingsSkinSection() {
  const { t } = useTranslation();
  const { activeSkinId, skins, selectSkin, uploadSkin, deleteSkin } = useSkin();
  const { skinWeb, updateSkinWebFlags } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snapshotErrorIds, setSnapshotErrorIds] = useState<Record<string, boolean>>({});
  const canRemoveSkins = skins.length > 1;

  const handlePickFile = () => {
    setUploadError(null);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isZipSkinFile(file)) {
      setUploadError(t("settings.skin.errorNotZip"));
      return;
    }
    setBusy(true);
    setUploadError(null);
    try {
      await uploadSkin(file);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "";
      const map: Record<string, string> = {
        missing_archive: "settings.skin.errorMissingArchive",
        invalid_archive_type: "settings.skin.errorInvalidArchiveType",
        missing_skin_json: "settings.skin.errorMissingSkinJson",
        missing_css: "settings.skin.errorMissingCss",
        too_many_skins: "settings.skin.errorTooMany",
        invalid_zip_path: "settings.skin.errorInvalidZip",
        skin_install_failed: "settings.skin.errorInstallFailed",
        upload_failed: "settings.skin.errorUploadFailed",
      };
      const key = map[code];
      setUploadError(key ? t(key) : t("settings.skin.errorUploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] settings-card settings-card--spaced-top">
      <div className="settings-card-header">
        <h2 className="settings-card-title">{t("settings.skin.title")}</h2>
      </div>
      <div className="settings-card-content">
        <div className="settings-skin-upload-block">
          <div className="settings-label">{t("settings.skin.uploadTitle")}</div>
          <p className="settings-help-text">{t("settings.skin.uploadHint")}</p>
          <div className="settings-skin-upload-row">
            <input
              ref={fileRef}
              type="file"
              accept=".zip,.mhg-skin.zip,application/zip"
              hidden
              onChange={handleFileChange}
            />
            <button type="button" className="settings-button settings-skin-file-btn" onClick={handlePickFile} disabled={busy}>
              {t("settings.skin.chooseFile")}
            </button>
          </div>
          {uploadError && <p className="settings-help-text settings-help-text--error">{uploadError}</p>}
        </div>

        {skins.length > 0 && (
          <div className="settings-skin-list">
            <div className="settings-label">{t("settings.skin.installed")}</div>
            <ul
              className="settings-skin-installed"
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "10px",
                overflowX: "auto",
                paddingBottom: "6px",
              }}
            >
              {skins.map((s) => (
                <li
                  key={s.id}
                  className="settings-skin-installed-item"
                  style={{ minWidth: "156px", maxWidth: "156px", position: "relative", flex: "0 0 auto" }}
                >
                  <button
                    type="button"
                    className="settings-button"
                    onClick={() => void selectSkin(s.id)}
                    style={{
                      width: "100%",
                      padding: "6px",
                      border:
                        s.id === activeSkinId
                          ? "2px solid var(--mhg-primary, #4f46e5)"
                          : "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(0,0,0,0.2)",
                    }}
                    title={s.name}
                  >
                    {s.snapshotUrl && !snapshotErrorIds[s.id] ? (
                      <img
                        src={(() => {
                          const url = new URL(s.snapshotUrl, API_BASE);
                          url.searchParams.set("v", String(s.snapshotVersion));
                          return url.toString();
                        })()}
                        alt={s.name}
                        style={{
                          width: "100%",
                          height: "82px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          marginBottom: "6px",
                        }}
                        onError={() =>
                          setSnapshotErrorIds((prev) => ({
                            ...prev,
                            [s.id]: true,
                          }))
                        }
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "82px",
                          borderRadius: "6px",
                          marginBottom: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,0.08)",
                          fontSize: "11px",
                          opacity: 0.8,
                        }}
                      >
                        No snapshot
                      </div>
                    )}
                    <span
                      className="settings-skin-installed-name"
                      style={{
                        fontSize: "12px",
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.name}
                    </span>
                  </button>
                  {canRemoveSkins && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t("settings.skin.confirmRemove", { name: s.name }))) {
                          void deleteSkin(s.id);
                        }
                      }}
                      aria-label={t("settings.skin.remove")}
                      title={t("settings.skin.remove")}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        width: "22px",
                        height: "22px",
                        borderRadius: "999px",
                        border: "1px solid rgba(255,255,255,0.28)",
                        background: "rgba(0,0,0,0.68)",
                        color: "#fff",
                        fontWeight: 700,
                        lineHeight: 1,
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeSkinId && (
          /*
           * `.settings-skin-list` ships with `margin-top: 8px` but no bottom margin in the skin
           * bundles, and `.settings-field` only contributes `margin-bottom`, so without an
           * explicit top margin the options block collapses against the installed skins row.
           * Keep the gap inline so it stays consistent across skins (Plex, GOG, …).
           */
          <div className="settings-field settings-skin-options" style={{ marginTop: 32 }}>
            <div className="settings-label">{t("settings.skinOptions.title", "Options")}</div>
            <p className="settings-help-text">
              {t(
                "settings.skinOptions.description",
                "Fine-tune how the active skin renders the interface. When you install or switch to a skin, these options are reset to the values that skin declares in its manifest."
              )}
            </p>
            <div className="settings-library-options">
              {SKIN_WEB_KEYS.map((key) => (
                <label key={key} className="settings-library-option">
                  <input
                    type="checkbox"
                    checked={skinWeb[key]}
                    onChange={(e) => {
                      const partial: Partial<SkinWebManifest> = { [key]: e.target.checked };
                      void updateSkinWebFlags(partial);
                    }}
                    className="settings-checkbox"
                  />
                  <span>{t(`settings.skinOptions.flags.${key}`, key)}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
