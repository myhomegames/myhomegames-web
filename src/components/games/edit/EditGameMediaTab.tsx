import type { TFunction } from "i18next";
import type { ChangeEvent, RefObject } from "react";
import type { GameItem } from "../../../types";
import Cover from "../Cover";
import ScreenshotsAndVideosEditor from "./ScreenshotsAndVideosEditor";
import "./EditGameMediaTab.css";

type EditGameMediaTabProps = {
  t: TFunction;
  game: GameItem;
  saving: boolean;
  showTitle: boolean;
  onShowTitleChange: (value: boolean) => void;
  coverRemoved: boolean;
  coverPreview: string | null;
  coverUrlWithTimestamp: string;
  uploadingCover: boolean;
  coverInputRef: RefObject<HTMLInputElement | null>;
  handleCoverFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onGameUpdate: (updatedGame: GameItem) => void;
  handleCoverRemoveSuccess: () => void;
  backgroundRemoved: boolean;
  backgroundPreview: string | null;
  backgroundUrlWithTimestamp: string;
  uploadingBackground: boolean;
  backgroundInputRef: RefObject<HTMLInputElement | null>;
  handleBackgroundFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  handleBackgroundRemoveSuccess: () => void;
  screenshotInputRef?: RefObject<HTMLInputElement | null>;
  pendingScreenshotFiles: File[];
  onAddPendingScreenshotFile: (file: File) => void;
  onRemoveScreenshotAt: (index: number) => void;
};

function ensureStringArray(v: string[] | null | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [];
}

export default function EditGameMediaTab({
  t,
  game,
  saving,
  showTitle,
  onShowTitleChange,
  coverRemoved,
  coverPreview,
  coverUrlWithTimestamp,
  uploadingCover,
  coverInputRef,
  handleCoverFileSelect,
  onGameUpdate,
  handleCoverRemoveSuccess,
  backgroundRemoved,
  backgroundPreview,
  backgroundUrlWithTimestamp,
  uploadingBackground,
  backgroundInputRef,
  handleBackgroundFileSelect,
  handleBackgroundRemoveSuccess,
  screenshotInputRef: screenshotInputRefProp,
  pendingScreenshotFiles,
  onAddPendingScreenshotFile,
  onRemoveScreenshotAt,
}: EditGameMediaTabProps) {
  const screenshots = ensureStringArray(game.screenshots);
  const videos = ensureStringArray(game.videos);

  const handleScreenshotsChange = (next: string[]) => {
    onGameUpdate({ ...game, screenshots: next.length > 0 ? next : [] });
  };
  const handleVideosChange = (next: string[]) => {
    onGameUpdate({ ...game, videos: next.length > 0 ? next : [] });
  };
  const handleRemoveScreenshotAt = (index: number) => {
    if (index < screenshots.length) {
      handleScreenshotsChange(screenshots.filter((_, i) => i !== index));
    } else {
      onRemoveScreenshotAt(index - screenshots.length);
    }
  };

  return (
    <div className="edit-game-modal-media">
      <div className="edit-game-modal-media-options">
        <label className="edit-game-modal-media-checkbox-label">
          <input
            type="checkbox"
            checked={showTitle}
            onChange={(e) => onShowTitleChange(e.target.checked)}
            aria-label={t("gameDetail.showTitle", "Show title on cover")}
          />
          <span>{t("gameDetail.showTitle", "Show title on cover")}</span>
        </label>
      </div>
      {/* Cover Section - First Row */}
      <div className="edit-game-modal-media-row">
        <div className="edit-game-modal-media-info">
          <div className="edit-game-modal-label">{t("gameDetail.cover", "Cover")}</div>
          <div className="edit-game-modal-media-description">
            {t("gameDetail.coverFormat", "Recommended format: WebP, ratio 2:3 (e.g., 400x600px)")}
          </div>
        </div>
        <div className="edit-game-modal-media-image-container">
          {(() => {
            const currentCoverUrl = coverRemoved ? "" : (coverPreview || coverUrlWithTimestamp);
            const hasCover = currentCoverUrl && currentCoverUrl.trim() !== "";
            const isCoverFromIgdb = false;
            return (
              <>
                <Cover
                  key={`cover-${coverRemoved ? "removed" : coverPreview ? "preview" : coverUrlWithTimestamp}`}
                  title={game.title}
                  coverUrl={currentCoverUrl}
                  width={150}
                  height={200}
                  showTitle={false}
                  detail={false}
                  play={false}
                  showBorder={true}
                  aspectRatio="3/4"
                  onUpload={() => !uploadingCover && !saving && coverInputRef.current?.click()}
                  uploading={uploadingCover}
                  showRemoveButton={!!hasCover && !coverRemoved && !isCoverFromIgdb}
                  removeMediaType="cover"
                  removeResourceId={game.id}
                  removeResourceType="games"
                  onGameUpdate={onGameUpdate}
                  onRemoveSuccess={handleCoverRemoveSuccess}
                  removeDisabled={saving || uploadingCover}
                />
                <input
                  ref={coverInputRef}
                  id="edit-game-cover-input"
                  name="cover"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleCoverFileSelect}
                  aria-label={t("gameDetail.cover", "Cover")}
                />
              </>
            );
          })()}
        </div>
      </div>

      {/* Background Section - Second Row */}
      <div className="edit-game-modal-media-row">
        <div className="edit-game-modal-media-info">
          <div className="edit-game-modal-label">{t("gameDetail.background", "Background")}</div>
          <div className="edit-game-modal-media-description">
            {t("gameDetail.backgroundFormat", "Recommended format: WebP, ratio 16:9 (e.g., 1920x1080px)")}
          </div>
        </div>
        <div className="edit-game-modal-media-image-container">
          {(() => {
            const currentBackgroundUrl = backgroundRemoved ? "" : (backgroundPreview || backgroundUrlWithTimestamp);
            const hasBackground = currentBackgroundUrl && currentBackgroundUrl.trim() !== "";
            const isBackgroundFromIgdb = false;
            return (
              <>
                <Cover
                  key={`background-${backgroundRemoved ? "removed" : backgroundPreview ? "preview" : backgroundUrlWithTimestamp}`}
                  title={game.title}
                  coverUrl={currentBackgroundUrl}
                  width={300}
                  height={169}
                  showTitle={false}
                  detail={false}
                  play={false}
                  showBorder={true}
                  aspectRatio="16/9"
                  onUpload={() => !uploadingBackground && !saving && backgroundInputRef.current?.click()}
                  uploading={uploadingBackground}
                  showRemoveButton={!!hasBackground && !backgroundRemoved && !isBackgroundFromIgdb}
                  removeMediaType="background"
                  removeResourceId={game.id}
                  removeResourceType="games"
                  onGameUpdate={onGameUpdate}
                  onRemoveSuccess={handleBackgroundRemoveSuccess}
                  removeDisabled={saving || uploadingBackground}
                />
                <input
                  ref={backgroundInputRef}
                  id="edit-game-background-input"
                  name="background"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleBackgroundFileSelect}
                  aria-label={t("gameDetail.background", "Background")}
                />
              </>
            );
          })()}
        </div>
      </div>

      {/* Screenshots & Videos - editable (separate component) */}
      <div className="edit-game-modal-media-row edit-game-modal-media-row-stack">
        <div className="edit-game-modal-media-info">
          <div className="edit-game-modal-label">{t("gameDetail.screenshotsAndVideos", "Video e screenshots")}</div>
          <div className="edit-game-modal-media-description">
            {t("gameDetail.screenshotsAndVideosDescription", "Aggiungi, modifica o rimuovi URL di video e screenshot. Salva per applicare.")}
          </div>
        </div>
        <ScreenshotsAndVideosEditor
          t={t}
          screenshots={screenshots}
          videos={videos}
          pendingScreenshotFiles={pendingScreenshotFiles}
          onScreenshotsChange={handleScreenshotsChange}
          onVideosChange={handleVideosChange}
          onAddPendingScreenshotFile={onAddPendingScreenshotFile}
          onRemoveScreenshotAt={handleRemoveScreenshotAt}
          saving={saving}
          screenshotInputRef={screenshotInputRefProp}
        />
      </div>
    </div>
  );
}
