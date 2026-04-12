import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSkin } from "../../contexts/SkinContext";

function isZipSkinFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith(".zip") || n.endsWith(".mhg-skin.zip");
}

export default function SettingsSkinSection() {
  const { t } = useTranslation();
  const { activeSkinId, skins, selectSkin, uploadSkin, deleteSkin } = useSkin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [newName, setNewName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      await uploadSkin(file, newName.trim() || undefined);
      setNewName("");
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
        <p className="settings-help-text settings-help-text--twitch-intro">{t("settings.skin.subtitle")}</p>
        <p className="settings-help-text">{t("settings.skin.saveNote")}</p>

        <div className="settings-field settings-field-row">
          <label className="settings-label" htmlFor="skin-active-select">
            {t("settings.skin.active")}
          </label>
          {skins.length === 0 ? (
            <select
              id="skin-active-select"
              className="settings-select settings-select--skin"
              disabled
              value=""
            >
              <option value="">{t("settings.skin.noSkinsYet")}</option>
            </select>
          ) : (
            <select
              id="skin-active-select"
              className="settings-select settings-select--skin"
              value={activeSkinId}
              onChange={(e) => void selectSkin(e.target.value)}
            >
              <option value="">{t("settings.skin.noneSelected")}</option>
              {skins.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="settings-skin-upload-block">
          <div className="settings-label">{t("settings.skin.uploadTitle")}</div>
          <p className="settings-help-text">{t("settings.skin.uploadHint")}</p>
          <div className="settings-skin-upload-row">
            <input
              type="text"
              className="settings-input"
              placeholder={t("settings.skin.displayNamePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label={t("settings.skin.displayName")}
            />
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
            <ul className="settings-skin-installed">
              {skins.map((s) => (
                <li key={s.id} className="settings-skin-installed-item">
                  <span className="settings-skin-installed-name">{s.name}</span>
                  <button
                    type="button"
                    className="settings-skin-remove"
                    onClick={() => {
                      if (window.confirm(t("settings.skin.confirmRemove", { name: s.name }))) {
                        void deleteSkin(s.id);
                      }
                    }}
                  >
                    {t("settings.skin.remove")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
