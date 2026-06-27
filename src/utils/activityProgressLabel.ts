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

  const { itemLabel, step, totalSteps, phaseIndex, phaseTotal, percent } = progress;

  if (itemLabel?.trim() && step != null && totalSteps != null && phaseIndex != null && phaseTotal != null) {
    return t("metadataReload.tooltip.withItem", {
      phase: phaseLabel,
      item: itemLabel.trim(),
      step,
      total: totalSteps,
      phaseIndex,
      phaseTotal,
      percent,
    });
  }

  if (step != null && totalSteps != null) {
    return t("metadataReload.tooltip.progress", {
      phase: phaseLabel,
      step,
      total: totalSteps,
      percent,
    });
  }

  return t("metadataReload.tooltip.simple", {
    phase: phaseLabel,
    percent,
  });
}
