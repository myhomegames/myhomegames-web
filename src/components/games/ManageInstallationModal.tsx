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

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...executables];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setExecutables(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === executables.length - 1) return;
    const updated = [...executables];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setExecutables(updated);
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
            {executables.map((executable, index) => (
              <div key={index} className="manage-installation-executable-item">
                <div className="manage-installation-executable-order-controls">
                  <div className="manage-installation-executable-number">{index + 1}</div>
                  <div className="manage-installation-order-buttons">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="manage-installation-order-button"
                      title={t("manageInstallation.moveUp", "Move up")}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 15l-6-6-6 6"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === executables.length - 1}
                      className="manage-installation-order-button"
                      title={t("manageInstallation.moveDown", "Move down")}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="manage-installation-executable-fields">
                  <div className="manage-installation-field-group">
                    <label>{t("manageInstallation.label", "Label")}</label>
                    <input
                      type="text"
                      value={executable.label}
                      onChange={(e) => handleUpdateLabel(index, e.target.value)}
                      placeholder={t("manageInstallation.labelPlaceholder", "e.g., Play, Launch, Install")}
                    />
                  </div>
                  <div className="manage-installation-field-group">
                    <label>{t("manageInstallation.path", "File")}</label>
                    <div className="manage-installation-path-input-group">
                      <input
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
            ))}
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
