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

  if (itemLabel?.trim() && step != null && totalSteps != null) {
    const params = {
      phase: phaseLabel,
      item: itemLabel.trim(),
      step,
      total: totalSteps,
      percent,
    };

    if (phaseIndex != null && phaseTotal != null && phaseTotal > 1) {
      return t("metadataReload.tooltip.withItemInPhase", {
        ...params,
        phaseIndex,
        phaseTotal,
      });
    }

    return t("metadataReload.tooltip.withItem", params);
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
