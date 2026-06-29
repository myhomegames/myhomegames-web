import { describe, expect, it } from "vitest";

// Mirror of useAutoTranslate finalize logic
function formatTranslation(text: string): string {
  const normalized = text.replace(/-/g, " ").trim();
  if (!normalized) return normalized;
  const lower = normalized.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function finalizeTranslatedText(text: string, format: "title" | "prose"): string {
  if (format === "prose") return text.trim();
  return formatTranslation(text);
}

describe("finalizeTranslatedText", () => {
  it("preserves capitalization in prose mode", () => {
    const translated = "Prima frase. Seconda frase con Maiuscole.";
    expect(finalizeTranslatedText(translated, "prose")).toBe(translated);
  });

  it("sentence-cases titles in title mode", () => {
    expect(finalizeTranslatedText("ACTION-adventure", "title")).toBe("Action adventure");
  });
});
