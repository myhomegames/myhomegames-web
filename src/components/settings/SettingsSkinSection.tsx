import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSkin } from "../../contexts/SkinContext";
import { BUILTIN_SKIN_EMPTY_ID, BUILTIN_SKIN_PLEX_ID } from "../../skins/skinIds";

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
    if (!file.name.toLowerCase().endsWith(".css")) {
      setUploadError(t("settings.skin.errorNotCss"));
      return;
    }
    setBusy(true);
    setUploadError(null);
    try {
      const text = await file.text();
      const name = newName.trim() || file.name.replace(/\.css$/i, "") || t("settings.skin.unnamed");
      uploadSkin(name, text);
      setNewName("");
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "";
      if (code === "empty_css") setUploadError(t("settings.skin.errorEmpty"));
      else if (code === "css_too_large") setUploadError(t("settings.skin.errorTooLarge"));
      else if (code === "too_many_skins") setUploadError(t("settings.skin.errorTooMany"));
      else setUploadError(t("settings.skin.errorRead"));
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
          <select
            id="skin-active-select"
            className="settings-select settings-select--skin"
            value={activeSkinId}
            onChange={(e) => selectSkin(e.target.value)}
          >
            {skins.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.id === BUILTIN_SKIN_PLEX_ID ? ` (${t("settings.skin.defaultBuiltIn")})` : ""}
                {s.id === BUILTIN_SKIN_EMPTY_ID ? ` (${t("settings.skin.emptyTestBuiltIn")})` : ""}
              </option>
            ))}
          </select>
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
            <input ref={fileRef} type="file" accept=".css,text/css" hidden onChange={handleFileChange} />
            <button type="button" className="settings-button settings-skin-file-btn" onClick={handlePickFile} disabled={busy}>
              {t("settings.skin.chooseFile")}
            </button>
          </div>
          {uploadError && <p className="settings-help-text settings-help-text--error">{uploadError}</p>}
        </div>

        {skins.filter((s) => !s.builtin).length > 0 && (
          <div className="settings-skin-list">
            <div className="settings-label">{t("settings.skin.installed")}</div>
            <ul className="settings-skin-installed">
              {skins
                .filter((s) => !s.builtin)
                .map((s) => (
                  <li key={s.id} className="settings-skin-installed-item">
                    <span className="settings-skin-installed-name">{s.name}</span>
                    <button
                      type="button"
                      className="settings-skin-remove"
                      onClick={() => {
                        if (window.confirm(t("settings.skin.confirmRemove", { name: s.name }))) {
                          deleteSkin(s.id);
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
