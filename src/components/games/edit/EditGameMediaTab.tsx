import type { TFunction } from "i18next";
import type { ChangeEvent, RefObject } from "react";
import type { GameItem } from "../../../types";
import Cover from "../Cover";
import "./EditGameMediaTab.css";

type EditGameMediaTabProps = {
  t: TFunction;
  game: GameItem;
  saving: boolean;
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
};

export default function EditGameMediaTab({
  t,
  game,
  saving,
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
}: EditGameMediaTabProps) {
  return (
    <div className="edit-game-modal-media">
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
            // NEVER show IGDB images in edit modal - coverUrlWithTimestamp already filters them out
            const currentCoverUrl = coverRemoved ? "" : (coverPreview || coverUrlWithTimestamp);
            const hasCover = currentCoverUrl && currentCoverUrl.trim() !== "";
            // Check if cover is from IGDB (external URL) - don't show remove button for external images
            // Since we never show IGDB images, this is always false
            const isCoverFromIgdb = false;
            return (
              <>
                <Cover
                  key={`cover-${coverRemoved ? 'removed' : coverPreview ? 'preview' : coverUrlWithTimestamp}`}
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
            // NEVER show IGDB images in edit modal - backgroundUrlWithTimestamp already filters them out
            const currentBackgroundUrl = backgroundRemoved ? "" : (backgroundPreview || backgroundUrlWithTimestamp);
            const hasBackground = currentBackgroundUrl && currentBackgroundUrl.trim() !== "";
            // Check if background is from IGDB (external URL) - don't show remove button for external images
            // Since we never show IGDB images, this is always false
            const isBackgroundFromIgdb = false;
            return (
              <>
                <Cover
                  key={`background-${backgroundRemoved ? 'removed' : backgroundPreview ? 'preview' : backgroundUrlWithTimestamp}`}
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
                />
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
