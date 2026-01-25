import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import type { GameItem } from "../../types";
import { buildApiUrl } from "../../utils/api";
import "./ManageInstallationModal.css";

// Import path for basename
const path = {
  basename: (filePath: string) => {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1];
  }
};

type ExecutableState = {
  label: string;
  file: File | null;
  existingPath: string | null; // Path to existing file (if not uploading new file)
};

type ManageInstallationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  game: GameItem;
  onGameUpdate: (updatedGame: GameItem) => void;
};

export default function ManageInstallationModal({
  isOpen,
  onClose,
  game,
  onGameUpdate,
}: ManageInstallationModalProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  
  // Initialize executables from game.executables
  const getInitialExecutables = (): ExecutableState[] => {
    if (game.executables && game.executables.length > 0) {
      return game.executables.map(exec => ({
        label: exec || "script",
        file: null,
        existingPath: null, // executables is just an array of names, not paths
      }));
    }
    return [];
  };

  const [executables, setExecutables] = useState<ExecutableState[]>(getInitialExecutables());
  const [initialExecutables, setInitialExecutables] = useState<ExecutableState[]>(getInitialExecutables());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial = getInitialExecutables();
      setExecutables(initial);
      setInitialExecutables(initial);
      setError(null);
    }
  }, [isOpen, game]);

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
    setExecutables([...executables, { label: "", file: null, existingPath: null }]);
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
    updated[index] = { ...updated[index], label };
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
          existingPath: null // Clear existing path when new file is selected
        };
        setExecutables(updated);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    // Validate all executables have label
    for (let i = 0; i < executables.length; i++) {
      if (!executables[i].label || !executables[i].label.trim()) {
        setError(t("manageInstallation.labelRequired", "All executables must have a label"));
        return;
      }
    }

    setSaving(true);
    setLoading(true);
    setError(null);

    try {
      // Upload only files that have been selected (ignore executables without file)
      for (const exec of executables) {
        // Skip executables without a file selected (existing executables that are not being modified)
        if (!exec.file) continue;

        if (!exec.label || !exec.label.trim()) {
          continue; // Skip if no label
        }

        const formData = new FormData();
        formData.append('file', exec.file);
        formData.append('label', exec.label.trim());

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

      // Build final executables array with all labels (preserving existing ones without file)
      const finalExecutables = executables
        .map(exec => exec.label.trim())
        .filter(label => label.length > 0);

      // Update executables array in game (this will sync files on server)
      const updateUrl = buildApiUrl(API_BASE, `/games/${game.id}`);
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': getApiToken() || '',
        },
        body: JSON.stringify({ 
          executables: finalExecutables.length > 0 ? finalExecutables : null 
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
            ×
          </button>
        </div>
        <div className="manage-installation-modal-content">
          <p className="manage-installation-modal-description">
            {t("manageInstallation.description", "Configure multiple executable scripts for this game. The first script will be used by the Play button.")}
          </p>
          
          {error && (
            <div className="manage-installation-modal-error">{error}</div>
          )}

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
                    <label htmlFor={`manage-installation-path-${index}`}>
                      {t("manageInstallation.path", "File")}
                    </label>
                    <div className="manage-installation-path-input-group">
                      <input
                        id={`manage-installation-path-${index}`}
                        name={`executablePath-${index}`}
                        type="text"
                        value={
                          executable.file 
                            ? executable.file.name 
                            : executable.existingPath 
                              ? path.basename(executable.existingPath)
                              : executable.label
                                ? `${executable.label}.sh`
                                : ""
                        }
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
                  ×
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
