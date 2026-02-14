import { useState, useEffect } from "react";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";
import { buildApiHeaders } from "../../../utils/api";
import "./FranchiseSeriesEditor.css";

export type IdNameItem = { id: number; name: string };

type FranchiseSeriesEditorProps = {
  label: string;
  value: IdNameItem[];
  onChange: (value: IdNameItem[]) => void;
  disabled?: boolean;
  apiEndpoint: string; // e.g. "franchises" or "series"
  listResponseKey: string; // e.g. "franchises" or "series"
};

export default function FranchiseSeriesEditor({
  label,
  value,
  onChange,
  disabled,
  apiEndpoint,
  listResponseKey,
}: FranchiseSeriesEditorProps) {
  const [options, setOptions] = useState<IdNameItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || options.length > 0) return;
    let cancelled = false;
    setLoading(true);
    const url = buildApiUrl(API_BASE, `/${apiEndpoint}`);
    fetch(url, { headers: buildApiHeaders({ Accept: "application/json" }) })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (cancelled) return;
        const list = (data[listResponseKey] || []) as Array<{ id: number; title?: string; name?: string }>;
        setOptions(
          list.map((x) => ({
            id: Number(x.id),
            name: String(x.title ?? x.name ?? x.id),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, apiEndpoint, listResponseKey]);

  const valueIds = new Set(value.map((v) => v.id));
  const available = options.filter((o) => !valueIds.has(o.id));

  const handleAdd = (item: IdNameItem) => {
    onChange([...value, item]);
    setOpen(false);
  };

  const handleRemove = (id: number) => {
    onChange(value.filter((v) => v.id !== id));
  };

  return (
    <div className="edit-game-modal-field">
      <div className="edit-game-modal-label">{label}</div>
      {value.length > 0 && (
        <div className="franchise-series-chips">
          {value.map((item) => (
            <span key={item.id} className="franchise-series-chip">
              <span className="franchise-series-chip-label">{item.name}</span>
              {!disabled && (
                <button
                  type="button"
                  className="franchise-series-chip-remove"
                  onClick={() => handleRemove(item.id)}
                  aria-label="Remove"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <div className="franchise-series-add">
          <button
            type="button"
            className="franchise-series-add-button"
            onClick={() => setOpen((o) => !o)}
            disabled={loading}
          >
            {loading ? "…" : "+"}
          </button>
          {open && (
            <div className="franchise-series-dropdown">
              {available.length === 0 && !loading && (
                <div className="franchise-series-dropdown-empty">Nessuna opzione disponibile</div>
              )}
              {available.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="franchise-series-dropdown-item"
                  onClick={() => handleAdd(item)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
