import type { TFunction } from "i18next";
import type { ActivityProgress } from "../contexts/LoadingContext";

export function formatActivityProgressLabel(
  t: TFunction,
  progress: ActivityProgress | null | undefined,
): string | undefined {
  if (!progress) return undefined;

  const phaseLabel = t(`metadataReload.phase.${progress.phase}`, {
    defaultValue: progress.phase,
  });

  return `${phaseLabel} (${progress.percent}%)`;
}
