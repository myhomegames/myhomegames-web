import type { TFunction } from "i18next";
import type { ChangeEvent, RefObject } from "react";
import { useState, useEffect, useMemo } from "react";
import { API_BASE } from "../../../config";
import { buildApiUrl, getEmbedVideoUrl } from "../../../utils/api";
import MediaGallery from "../MediaGallery";
import "./EditGameMediaTab.css";

type ScreenshotsAndVideosEditorProps = {
  t: TFunction;
  screenshots: string[];
  videos: string[];
  pendingScreenshotFiles: File[];
  onScreenshotsChange: (screenshots: string[]) => void;
  onVideosChange: (videos: string[]) => void;
  onAddPendingScreenshotFile: (file: File) => void;
  onRemoveScreenshotAt: (index: number) => void;
  saving: boolean;
  screenshotInputRef?: RefObject<HTMLInputElement | null>;
};

export default function ScreenshotsAndVideosEditor({
  t,
  screenshots,
  videos,
  pendingScreenshotFiles,
  onScreenshotsChange,
  onVideosChange,
  onAddPendingScreenshotFile,
  onRemoveScreenshotAt,
  saving,
  screenshotInputRef: screenshotInputRefProp,
}: ScreenshotsAndVideosEditorProps) {
  const [newScreenshotUrl, setNewScreenshotUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const screenshotInputRef = screenshotInputRefProp ?? { current: null };

  const resolveScreenshotUrl = (url: string) =>
    !url ? "" : url.startsWith("http") ? url : buildApiUrl(API_BASE, url);

  // Object URLs for pending files (revoke on unmount or when pending list changes)
  const pendingPreviewUrls = useMemo(() => pendingScreenshotFiles.map((f) => URL.createObjectURL(f)), [pendingScreenshotFiles]);
  useEffect(() => {
    return () => {
      pendingPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingPreviewUrls]);

  const handleScreenshotUrlChange = (index: number, url: string) => {
    const next = [...screenshots];
    next[index] = url.trim();
    onScreenshotsChange(next.filter(Boolean));
  };
  const handleScreenshotRemove = (index: number) => {
    onRemoveScreenshotAt(index);
  };
  const handleScreenshotAdd = () => {
    const url = newScreenshotUrl.trim();
    if (!url) return;
    onScreenshotsChange([...screenshots, url]);
    setNewScreenshotUrl("");
  };

  const handleVideoUrlChange = (index: number, url: string) => {
    const next = [...videos];
    next[index] = url.trim();
    onVideosChange(next.filter(Boolean));
  };
  const handleVideoRemove = (index: number) => {
    onVideosChange(videos.filter((_, i) => i !== index));
  };
  const handleVideoAdd = () => {
    const url = newVideoUrl.trim();
    if (!url) return;
    onVideosChange([...videos, url]);
    setNewVideoUrl("");
  };

  const handleScreenshotFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    onAddPendingScreenshotFile(file);
    event.target.value = "";
  };

  const totalScreenshotCount = screenshots.length + pendingScreenshotFiles.length;
  const hasMedia = totalScreenshotCount > 0 || videos.length > 0;
  const resolvedScreenshotsForGallery = useMemo(
    () => [...screenshots.map(resolveScreenshotUrl), ...pendingPreviewUrls],
    [screenshots, pendingPreviewUrls]
  );

  return (
    <div className="edit-game-modal-media-editor">
      {/* Videos - first */}
      <div className="edit-game-modal-media-group">
        <div className="edit-game-modal-media-group-label">
          {t("gameDetail.videos", "Video")}
        </div>
        {videos.map((url, index) => (
          <div key={`v-${index}`} className="edit-game-modal-media-item">
            <div className="edit-game-modal-media-item-preview edit-game-modal-media-item-preview-video edit-game-modal-media-item-preview-with-remove">
              {url ? (
                <iframe
                  src={getEmbedVideoUrl(url)}
                  title=""
                  className="edit-game-modal-media-item-thumb-video"
                />
              ) : (
                <div className="edit-game-modal-media-item-placeholder" />
              )}
              <button
                type="button"
                className="edit-game-modal-media-item-remove-overlay"
                onClick={() => handleVideoRemove(index)}
                disabled={saving}
                aria-label={t("common.remove", "Rimuovi")}
                title={t("common.remove", "Rimuovi")}
              />
            </div>
            <input
              type="url"
              className="edit-game-modal-media-item-input"
              value={url}
              onChange={(e) => handleVideoUrlChange(index, e.target.value)}
              onBlur={(e) => handleVideoUrlChange(index, e.target.value)}
              placeholder="https://www.youtube.com/embed/..."
              disabled={saving}
            />
          </div>
        ))}
        <div className="edit-game-modal-media-add">
          <input
            type="url"
            className="edit-game-modal-media-item-input"
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVideoAdd()}
            placeholder={t("gameDetail.addVideoUrl", "URL nuovo video (embed)...")}
            disabled={saving}
          />
          <button type="button" className="edit-game-modal-media-add-btn" onClick={handleVideoAdd} disabled={saving || !newVideoUrl.trim()}>
            {t("gameDetail.add", "Aggiungi")}
          </button>
        </div>
      </div>

      {/* Screenshots (URLs + pending files) */}
      <div className="edit-game-modal-media-group">
        <div className="edit-game-modal-media-group-label">
          {t("gameDetail.screenshots", "Screenshots")}
        </div>
        {screenshots.map((url, index) => (
          <div key={`s-${index}`} className="edit-game-modal-media-item">
            <div className="edit-game-modal-media-item-preview edit-game-modal-media-item-preview-with-remove">
              {url ? (
                <img src={resolveScreenshotUrl(url)} alt="" className="edit-game-modal-media-item-thumb" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="edit-game-modal-media-item-placeholder" />
              )}
              <button
                type="button"
                className="edit-game-modal-media-item-remove-overlay"
                onClick={() => handleScreenshotRemove(index)}
                disabled={saving}
                aria-label={t("common.remove", "Rimuovi")}
                title={t("common.remove", "Rimuovi")}
              />
            </div>
            <input
              type="url"
              className="edit-game-modal-media-item-input"
              value={url}
              onChange={(e) => handleScreenshotUrlChange(index, e.target.value)}
              onBlur={(e) => handleScreenshotUrlChange(index, e.target.value)}
              placeholder="https://..."
              disabled={saving}
            />
          </div>
        ))}
        {pendingScreenshotFiles.map((file, index) => (
          <div key={`p-${index}`} className="edit-game-modal-media-item">
            <div className="edit-game-modal-media-item-preview edit-game-modal-media-item-preview-with-remove">
              {pendingPreviewUrls[index] ? (
                <img src={pendingPreviewUrls[index]} alt="" className="edit-game-modal-media-item-thumb" />
              ) : (
                <div className="edit-game-modal-media-item-placeholder" />
              )}
              <button
                type="button"
                className="edit-game-modal-media-item-remove-overlay"
                onClick={() => handleScreenshotRemove(screenshots.length + index)}
                disabled={saving}
                aria-label={t("common.remove", "Rimuovi")}
                title={t("common.remove", "Rimuovi")}
              />
            </div>
            <span className="edit-game-modal-media-item-pending-label" title={file.name}>
              {file.name}
            </span>
          </div>
        ))}
        <div className="edit-game-modal-media-add">
          <input
            type="url"
            className="edit-game-modal-media-item-input"
            value={newScreenshotUrl}
            onChange={(e) => setNewScreenshotUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScreenshotAdd()}
            placeholder={t("gameDetail.addScreenshotUrl", "URL nuovo screenshot...")}
            disabled={saving}
          />
          <button type="button" className="edit-game-modal-media-add-btn" onClick={handleScreenshotAdd} disabled={saving || !newScreenshotUrl.trim()}>
            {t("gameDetail.add", "Aggiungi")}
          </button>
          <button
            type="button"
            className="edit-game-modal-media-add-btn edit-game-modal-media-upload-btn"
            onClick={() => !saving && screenshotInputRef.current?.click()}
            disabled={saving}
          >
            {t("gameDetail.uploadScreenshot", "Carica file")}
          </button>
          <input
            ref={screenshotInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleScreenshotFileSelect}
            aria-label={t("gameDetail.uploadScreenshot", "Carica screenshot")}
          />
        </div>
      </div>

      {/* Preview gallery when there is media */}
      {hasMedia && (
        <div className="edit-game-modal-media-group">
          <div className="edit-game-modal-media-group-label">
            {t("gameDetail.preview", "Anteprima")}
          </div>
          <div className="edit-game-modal-media-gallery-wrapper">
            <MediaGallery screenshots={resolvedScreenshotsForGallery} videos={videos} />
          </div>
        </div>
      )}
    </div>
  );
}
