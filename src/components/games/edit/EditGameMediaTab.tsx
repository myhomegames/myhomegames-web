import type { TFunction } from "i18next";
import type { ChangeEvent, RefObject } from "react";
import type { GameItem } from "../../../types";
import Cover from "../Cover";
import ScreenshotsAndVideosEditor from "./ScreenshotsAndVideosEditor";
type EditGameMediaTabProps = {
  t: TFunction;
  game: GameItem;
  saving: boolean;
  showTitle: boolean;
  onShowTitleChange: (value: boolean) => void;
  coverRemoved: boolean;
  coverPreview: string | null;
  /** Local / upload preview only — external URLs are edited below, not shown in Cover */
  coverLocalPreviewUrl: string;
  uploadingCover: boolean;
  coverInputRef: RefObject<HTMLInputElement | null>;
  handleCoverFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onGameUpdate: (updatedGame: GameItem) => void;
  handleCoverRemoveSuccess: () => void;
  externalCoverUrl: string;
  onExternalCoverChange: (value: string) => void;
  backgroundRemoved: boolean;
  backgroundPreview: string | null;
  backgroundLocalPreviewUrl: string;
  uploadingBackground: boolean;
  backgroundInputRef: RefObject<HTMLInputElement | null>;
  handleBackgroundFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  handleBackgroundRemoveSuccess: () => void;
  externalBackgroundUrl: string;
  onExternalBackgroundChange: (value: string) => void;
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
  coverLocalPreviewUrl,
  uploadingCover,
  coverInputRef,
  handleCoverFileSelect,
  onGameUpdate,
  handleCoverRemoveSuccess,
  externalCoverUrl,
  onExternalCoverChange,
  backgroundRemoved,
  backgroundPreview,
  backgroundLocalPreviewUrl,
  uploadingBackground,
  backgroundInputRef,
  handleBackgroundFileSelect,
  handleBackgroundRemoveSuccess,
  externalBackgroundUrl,
  onExternalBackgroundChange,
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
      {/* Cover + external URL (label allineata alla colonna Cover/Background) */}
      <div className="edit-game-modal-media-block">
        <div className="edit-game-modal-media-row">
          <div className="edit-game-modal-media-info">
            <div className="edit-game-modal-label">{t("gameDetail.cover", "Cover")}</div>
            <div className="edit-game-modal-media-description">
              {t("gameDetail.coverFormat", "Recommended format: WebP, ratio 2:3 (e.g., 400x600px)")}
            </div>
          </div>
          <div className="edit-game-modal-media-image-container">
            {(() => {
              const currentCoverUrl = coverRemoved ? "" : coverLocalPreviewUrl;
              const hasCover = currentCoverUrl && currentCoverUrl.trim() !== "";
              const isCoverFromIgdb = false;
              return (
                <>
                  <Cover
                    key={`cover-${coverRemoved ? "removed" : coverPreview ? "preview" : coverLocalPreviewUrl}`}
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
                    hidden
                    onChange={handleCoverFileSelect}
                    aria-label={t("gameDetail.cover", "Cover")}
                  />
                </>
              );
            })()}
          </div>
        </div>
        <div className="edit-game-modal-media-row edit-game-modal-external-url-row">
          <div className="edit-game-modal-media-info">
            <label htmlFor="edit-game-external-cover-url" className="edit-game-modal-label">
              {t("gameDetail.externalCoverUrl", "External cover URL")}
            </label>
          </div>
          <div className="edit-game-modal-external-url-input-column">
            <input
              id="edit-game-external-cover-url"
              type="url"
              className="edit-game-modal-external-url-input"
              value={externalCoverUrl}
              onChange={(e) => onExternalCoverChange(e.target.value)}
              disabled={saving}
              placeholder={t("gameDetail.externalCoverUrlPlaceholder", "https://… (used when no local cover)")}
              autoComplete="off"
            />
            <p className="edit-game-modal-external-url-hint">
              {t("gameDetail.externalUrlHint", "A local uploaded file takes priority over this URL.")}
            </p>
          </div>
        </div>
      </div>

      {/* Background + external URL */}
      <div className="edit-game-modal-media-block">
        <div className="edit-game-modal-media-row edit-game-modal-media-row--background">
          <div className="edit-game-modal-media-info">
            <div className="edit-game-modal-label">{t("gameDetail.background", "Background")}</div>
            <div className="edit-game-modal-media-description">
              {t("gameDetail.backgroundFormat", "Recommended format: WebP, ratio 16:9 (e.g., 1920x1080px)")}
            </div>
          </div>
          <div className="edit-game-modal-media-image-container">
            {(() => {
              const currentBackgroundUrl = backgroundRemoved ? "" : backgroundLocalPreviewUrl;
              const hasBackground = currentBackgroundUrl && currentBackgroundUrl.trim() !== "";
              const isBackgroundFromIgdb = false;
              return (
                <>
                  <Cover
                    key={`background-${backgroundRemoved ? "removed" : backgroundPreview ? "preview" : backgroundLocalPreviewUrl}`}
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
                    hidden
                    onChange={handleBackgroundFileSelect}
                    aria-label={t("gameDetail.background", "Background")}
                  />
                </>
              );
            })()}
          </div>
        </div>
        <div className="edit-game-modal-media-row edit-game-modal-external-url-row">
          <div className="edit-game-modal-media-info">
            <label htmlFor="edit-game-external-background-url" className="edit-game-modal-label">
              {t("gameDetail.externalBackgroundUrl", "External background URL")}
            </label>
          </div>
          <div className="edit-game-modal-external-url-input-column">
            <input
              id="edit-game-external-background-url"
              type="url"
              className="edit-game-modal-external-url-input"
              value={externalBackgroundUrl}
              onChange={(e) => onExternalBackgroundChange(e.target.value)}
              disabled={saving}
              placeholder={t("gameDetail.externalBackgroundUrlPlaceholder", "https://… (used when no local background)")}
              autoComplete="off"
            />
            <p className="edit-game-modal-external-url-hint">
              {t("gameDetail.externalUrlHint", "A local uploaded file takes priority over this URL.")}
            </p>
          </div>
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
