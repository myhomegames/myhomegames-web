import { describe, expect, it } from "vitest";

import { formatActivityProgressLabel } from "./activityProgressLabel";

const t = (key: string, options?: Record<string, unknown>) => {
  const map: Record<string, string> = {
    "metadataReload.phase.developers": "Aggiornamento developer",
    "metadataReload.phase.developer": "Aggiornamento developer",
    "metadataReload.tooltip.withItem":
      "{{phase}}: {{item}} — {{step}}/{{total}} ({{percent}}%)",
    "metadataReload.tooltip.withItemInPhase":
      "{{phase}}: {{item}} — {{step}}/{{total}} ({{percent}}%), elemento {{phaseIndex}}/{{phaseTotal}}",
    "metadataReload.tooltip.progress": "{{phase}} — {{step}}/{{total}} ({{percent}}%)",
    "metadataReload.tooltip.simple": "{{phase}} ({{percent}}%)",
  };

  let value = map[key] ?? String(options?.defaultValue ?? key);
  if (options) {
    for (const [k, v] of Object.entries(options)) {
      if (k === "defaultValue") continue;
      value = value.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return value;
};

describe("formatActivityProgressLabel", () => {
  it("includes item name and step counters during bulk reload", () => {
    expect(
      formatActivityProgressLabel(t, {
        phase: "developers",
        percent: 3,
        itemLabel: "Atari SA",
        step: 1,
        totalSteps: 29,
        phaseIndex: 1,
        phaseTotal: 5,
      }),
    ).toBe("Aggiornamento developer: Atari SA — 1/29 (3%), elemento 1/5");
  });

  it("includes item name for single metadata reload", () => {
    expect(
      formatActivityProgressLabel(t, {
        phase: "developer",
        percent: 25,
        itemLabel: "Atari SA",
        step: 1,
        totalSteps: 1,
        phaseIndex: 1,
        phaseTotal: 1,
      }),
    ).toBe("Aggiornamento developer: Atari SA — 1/1 (25%)");
  });

  it("falls back to progress-only label without item name", () => {
    expect(
      formatActivityProgressLabel(t, {
        phase: "developers",
        percent: 10,
        step: 3,
        totalSteps: 29,
      }),
    ).toBe("Aggiornamento developer — 3/29 (10%)");
  });
});
