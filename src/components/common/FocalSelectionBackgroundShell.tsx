import type { ReactNode } from "react";
import BackgroundManager from "./BackgroundManager";
import { API_BASE } from "../../config";
import { buildBackgroundUrl } from "../../utils/api";

export type FocalSelectionMedia = {
  id: string;
  background?: string;
};

type FocalSelectionBackgroundShellProps = {
  enabled: boolean;
  selection?: FocalSelectionMedia | null;
  children: ReactNode;
};

export function resolveFocalBackdropUrl(selection?: FocalSelectionMedia | null): string {
  if (!selection?.background?.trim()) return "";
  return buildBackgroundUrl(API_BASE, selection.background);
}

/** Full-page background driven by the focal-selected game or collection-like (wheel/step). */
export default function FocalSelectionBackgroundShell({
  enabled,
  selection = null,
  children,
}: FocalSelectionBackgroundShellProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  const backgroundUrl = resolveFocalBackdropUrl(selection);
  const hasBackground = Boolean(backgroundUrl.trim());
  const elementId = selection
    ? `focal:${selection.id}:${selection.background ?? ""}`
    : "focal:none";

  return (
    <BackgroundManager
      backgroundUrl={backgroundUrl}
      hasBackground={hasBackground}
      elementId={elementId}
      autoShowWhenAvailable
    >
      {children}
    </BackgroundManager>
  );
}
