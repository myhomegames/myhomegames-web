import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import { useTagLists } from "../../contexts/TagListsContext";
import TagEditor from "../common/TagEditor";
import type { GameItem } from "../../types";
import { buildApiUrl } from "../../utils/api";
import "./ManageInstallationModal.css";

type ExecutableState = {
  label: string;
  platform: string;
  file: File | null;
  existingPath: string | null;
  /** Full filename on server (e.g. Play-1.sh) when row loaded from game.executables */
  existingFileName?: string | null;
  isExisting?: boolean;
};

type ManageInstallationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  game: GameItem;
  onNeedRefresh?: () => void;
  onGameUpdate: (updatedGame: GameItem) => void;
};

export default function ManageInstallationModal({
  isOpen,
  onClose,
  game,
  onNeedRefresh,
  onGameUpdate,
}: ManageInstallationModalProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const { tagLabels } = useTagLists();
  const availablePlatforms = useMemo(
    () => Array.from(tagLabels.platforms.values()),
    [tagLabels.platforms]
  );
  /** Map platform title -> id for building label-platformId filename */
  const platformTitleToId = useMemo(() => {
    const m = new Map<string, string>();
    tagLabels.platforms.forEach((title, id) => m.set(title, String(id)));
    return m;
  }, [tagLabels.platforms]);
  /** Map platform id -> title to show platform from filename (id after hyphen) */
  const platformIdToTitle = useMemo(() => {
    const m = new Map<string, string>();
    tagLabels.platforms.forEach((title, id) => m.set(String(id), title));
    return m;
  }, [tagLabels.platforms]);

  const sanitizeLabel = (s: string) => (s || "").replace(/[^a-zA-Z0-9_-]/g, "_");

  const getDisplayFileName = (executable: ExecutableState, index: number): string => {
    const effectiveLabel = (executable.label && executable.label.trim()) || (executable.platform && executable.platform.trim()) || "script";
    const sanitized = sanitizeLabel(effectiveLabel);
    const platformId = executable.platform ? platformTitleToId.get(executable.platform) ?? "" : "";
    const base = platformId ? `${sanitized}-${platformId}` : sanitized;
    const ext = executable.file
      ? (executable.file.name.toLowerCase().endsWith(".bat") ? ".bat" : ".sh")
      : executable.existingFileName?.toLowerCase().endsWith(".bat")
        ? ".bat"
        : ".sh";
    const prefix = String(index + 1).padStart(2, "0") + "-";
    return base ? prefix + base + ext : "";
  };

  // Initialize executables from game.executables; platform and filename from executableFileNames (NN-label-platformId.ext)
  const getInitialExecutables = (): ExecutableState[] => {
    if (game.executables && game.executables.length > 0) {
      const fileNames = game.executableFileNames ?? [];
      return game.executables.map((exec, i) => {
        let platform = "";
        const fullName = fileNames[i]; // e.g. "01-Play-1.sh"
        let basenameNoExt = fullName ? fullName.replace(/\.(sh|bat)$/i, "") : "";
        // Strip leading numeratore (NN-) so we get "label-platformId"
        if (basenameNoExt) {
          basenameNoExt = basenameNoExt.replace(/^\d+-/, "");
        }
        if (basenameNoExt && basenameNoExt.includes("-")) {
          const platformId = basenameNoExt.slice(basenameNoExt.lastIndexOf("-") + 1);
          platform = platformIdToTitle.get(platformId) ?? "";
        }
        return {
          label: exec || "script",
          platform,
          file: null,
          existingPath: null,
          existingFileName: fullName ?? null,
          isExisting: true,
        };
      });
    }
    return [];
  };

  const [executables, setExecutables] = useState<ExecutableState[]>(getInitialExecutables());
  const [initialExecutables, setInitialExecutables] = useState<ExecutableState[]>(getInitialExecutables());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottomRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      const initial = getInitialExecutables();
      setInitialExecutables(initial);
      setExecutables(
        initial.length > 0 ? initial : [{ label: "", platform: "", file: null, existingPath: null, existingFileName: null, isExisting: false }]
      );
      setError(null);
    }
  }, [isOpen, game]);

  useEffect(() => {
    if (isOpen && game.executables?.length && !(game.executableFileNames && game.executableFileNames.length)) {
      onNeedRefresh?.();
    }
  }, [isOpen, game?.id]);

  useEffect(() => {
    if (shouldScrollToBottomRef.current && contentRef.current) {
      shouldScrollToBottomRef.current = false;
      contentRef.current.scrollTo({ top: contentRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [executables.length]);

  useEffect(() => {
    if (error && contentRef.current) {
      contentRef.current.scrollTo({ top: contentRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [error]);

  // Check if there are any changes compared to initial state
  const hasChanges = (): boolean => {
    // Check if number of executables changed
    if (executables.length !== initialExecutables.length) {
      return true;
    }

    // Check if order changed
    for (let i = 0; i < executables.length; i++) {
      const current = executables[i];
      const initial = initialExecutables[i];

      // Check if label changed
      if (current.label.trim() !== (initial?.label.trim() || "")) {
        return true;
      }

      // Check if platform changed
      if ((current.platform || "").trim() !== (initial?.platform || "").trim()) {
        return true;
      }

      // Check if a new file was selected
      if (current.file !== null && initial?.file === null) {
        return true;
      }
    }

    // Check if order changed by comparing labels at each position
    for (let i = 0; i < executables.length; i++) {
      if (executables[i].label.trim() !== initialExecutables[i]?.label.trim()) {
        return true;
      }
    }

    return false;
  };

  const handleAddExecutable = () => {
    shouldScrollToBottomRef.current = true;
    setExecutables([...executables, { label: "", platform: "", file: null, existingPath: null, existingFileName: null, isExisting: false }]);
  };

  const handleRemoveExecutable = (index: number) => {
    setExecutables(executables.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Prevent drag when clicking on inputs or buttons
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input') || target.closest('button')) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    // Set drag image to empty image for better visual feedback
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const updated = [...executables];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dragOverIndex, 0, draggedItem);
      setExecutables(updated);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear dragOver if we're actually leaving the element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      const index = parseInt(e.currentTarget.getAttribute('data-index') || '-1', 10);
      if (index >= 0 && dragOverIndex === index) {
        setDragOverIndex(null);
      }
    }
  };

  const handleUpdateLabel = (index: number, label: string) => {
    const updated = [...executables];
    updated[index] = { ...updated[index], label: label.trim() };
    setExecutables(updated);
  };

  /** Single platform per executable: onTagsChange receives new list; we keep only one (last selected). */
  const handlePlatformChange = (index: number, tags: string[]) => {
    const platform = tags.length ? tags[tags.length - 1] : "";
    const updated = [...executables];
    updated[index] = { ...updated[index], platform };
    setExecutables(updated);
  };

  const handleBrowseFile = async (index: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sh,.bat";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.sh') && !fileName.endsWith('.bat')) {
          alert(t("gameDetail.invalidFileType", "Only .sh and .bat files are allowed"));
          return;
        }
        const updated = [...executables];
        updated[index] = { 
          ...updated[index], 
          file: file,
          existingPath: null,
          existingFileName: null,
        };
        setExecutables(updated);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    // File required for each executable; platform is optional
    for (let i = 0; i < executables.length; i++) {
      const exec = executables[i];
      const hasFile = exec.file !== null || exec.isExisting === true;
      if (!hasFile) {
        setError(t("manageInstallation.fileRequired", "File is required for each executable."));
        return;
      }
    }

    // Primary key: (effective label, platform). No duplicates. Use same fallback as save (label → platform → "script").
    const keyOf = (exec: ExecutableState) => {
      const effectiveLabel = (exec.label && exec.label.trim()) || (exec.platform && exec.platform.trim()) || "script";
      return `${effectiveLabel.toLowerCase()}|${(exec.platform || "").trim().toLowerCase()}`;
    };
    const seen = new Set<string>();
    for (let i = 0; i < executables.length; i++) {
      const key = keyOf(executables[i]);
      if (seen.has(key)) {
        setError(t("manageInstallation.duplicateKey", "Duplicate executable: the same label and platform cannot appear more than once."));
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    setLoading(true);
    setError(null);

    try {
      // Upload only files that have been selected (ignore executables without file)
      for (const exec of executables) {
        // Skip executables without a file selected (existing executables that are not being modified)
        if (!exec.file) continue;

        // Default label: custom label, else platform name, else "script"
        const effectiveLabel = (exec.label && exec.label.trim()) || (exec.platform && exec.platform.trim()) || "script";
        const platformId = platformTitleToId.get(exec.platform) ?? "";

        const formData = new FormData();
        formData.append('file', exec.file);
        formData.append('label', effectiveLabel);
        formData.append('platformId', platformId);
        if (exec.platform && exec.platform.trim()) {
          formData.append('platform', exec.platform.trim());
        }

        const uploadUrl = buildApiUrl(API_BASE, `/games/${game.id}/upload-executable`);
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'X-Auth-Token': getApiToken() || '',
            // Don't set Content-Type - let browser set it with boundary for FormData
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Failed to upload executable' }));
          throw new Error(errorData.error || 'Failed to upload executable');
        }
      }

      // Build final executables array and platform ids (same order) for sync/rename on server
      // Label fallback: label → platform → "script" (same for new uploads and existing rows)
      const finalExecutables: string[] = [];
      const executablePlatformIds: string[] = [];
      for (const exec of executables) {
        const label = (exec.label && exec.label.trim()) || (exec.platform && exec.platform.trim()) || "script";
        if (label.length > 0) {
          finalExecutables.push(label);
          executablePlatformIds.push(exec.platform ? platformTitleToId.get(exec.platform) ?? "" : "");
        }
      }

      const updateUrl = buildApiUrl(API_BASE, `/games/${game.id}`);
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': getApiToken() || '',
        },
        body: JSON.stringify({
          executables: finalExecutables.length > 0 ? finalExecutables : null,
          executablePlatformIds: finalExecutables.length > 0 ? executablePlatformIds : null,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({ error: 'Failed to update executables' }));
        throw new Error(errorData.error || 'Failed to update executables');
      }

      const updateResult = await updateResponse.json();
      if (updateResult.game) {
        onGameUpdate(updateResult.game);
        onClose();
      } else {
        // Fetch the game to get updated state
        const fetchUrl = buildApiUrl(API_BASE, `/games/${game.id}`);
        const fetchResponse = await fetch(fetchUrl, {
          headers: {
            'X-Auth-Token': getApiToken() || '',
          },
        });
        if (fetchResponse.ok) {
          const gameData = await fetchResponse.json();
          onGameUpdate(gameData);
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Error updating executables:', err);
      setError(err.message || t("common.error", "Error"));
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="manage-installation-modal-overlay" onClick={onClose}>
      <div className="manage-installation-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="manage-installation-modal-header">
          <h2>{t("manageInstallation.title", "Manage Installation")}</h2>
          <button
            className="manage-installation-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div ref={contentRef} className="manage-installation-modal-content">
          <p className="manage-installation-modal-description">
            {t("manageInstallation.description", "Configure multiple executable scripts for this game. The first script will be used by the Play button.")}
          </p>

          <div className="manage-installation-executables-list">
            {executables.map((executable, index) => {
              const isDragOver = dragOverIndex === index && draggedIndex !== null;
              return (
                <div
                  key={index}
                  data-index={index}
                  className={`manage-installation-executable-item ${isDragOver ? 'manage-installation-executable-item-drag-over' : ''}`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={handleDragLeave}
                  onMouseDown={(e) => {
                    // Prevent drag when clicking on inputs or buttons
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input') || target.closest('button')) {
                      e.stopPropagation();
                    }
                  }}
                >
                  <div className="manage-installation-executable-order-controls">
                    <div className="manage-installation-executable-number">{index + 1}</div>
                  </div>
                <div className="manage-installation-executable-fields">
                  <div className="manage-installation-field-group">
                    <label htmlFor={`manage-installation-label-${index}`}>
                      {t("manageInstallation.label", "Label")}
                    </label>
                    <input
                      id={`manage-installation-label-${index}`}
                      name={`executableLabel-${index}`}
                      type="text"
                      value={executable.label}
                      onChange={(e) => handleUpdateLabel(index, e.target.value)}
                      placeholder={t("manageInstallation.labelPlaceholder", "e.g., Play, Launch, Install")}
                    />
                  </div>
                  <div className="manage-installation-field-group">
                    <label htmlFor={`manage-installation-platform-${index}`}>
                      {t("manageInstallation.platform", "Platform")}
                    </label>
                    {isOpen && (
                      <TagEditor
                        key={`manage-installation-platform-${game.id}-${index}-${isOpen}`}
                        mode="freeform"
                        selectedTags={executable.platform ? [executable.platform] : []}
                        onTagsChange={(tags) => handlePlatformChange(index, tags)}
                        disabled={saving}
                        placeholder={t("gameDetail.addPlatform", "Add platform...")}
                        availableTags={availablePlatforms}
                        allowCreate={true}
                      />
                    )}
                  </div>
                  <div className="manage-installation-field-group">
                    <label htmlFor={`manage-installation-path-${index}`}>
                      {t("manageInstallation.path", "File")}
                    </label>
                    <div className="manage-installation-path-input-group">
                      <input
                        id={`manage-installation-path-${index}`}
                        name={`executablePath-${index}`}
                        type="text"
                        value={getDisplayFileName(executable, index)}
                        readOnly
                        placeholder={t("manageInstallation.pathPlaceholder", "No file selected")}
                      />
                      <button
                        type="button"
                        onClick={() => handleBrowseFile(index)}
                        className="manage-installation-browse-button"
                      >
                        {t("common.browse", "Browse")}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExecutable(index)}
                  className="manage-installation-remove-button"
                  title={t("common.remove", "Remove")}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddExecutable}
            className="manage-installation-add-button"
          >
            + {t("manageInstallation.addExecutable", "Add Executable")}
          </button>

          {error && (
            <div className="manage-installation-modal-error">{error}</div>
          )}
        </div>
        <div className="manage-installation-modal-footer">
          <button
            className="manage-installation-modal-cancel"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            className="manage-installation-modal-save"
            onClick={handleSave}
            disabled={saving || !hasChanges()}
          >
            {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
