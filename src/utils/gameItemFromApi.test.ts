import { describe, expect, it } from "vitest";
import i18n from "../i18n/config";
import { gameItemFromApi } from "./gameItemFromApi";

describe("gameItemFromApi", () => {
  it("keeps a localized summary string and the detail fields a page reload would load", () => {
    const game = gameItemFromApi({
      id: 42,
      title: "Maniac",
      summary: "Nuova descrizione",
      cover: "/covers/42",
      background: "/backgrounds/42",
      logo: "/logos/42",
      externalLogoUrl: "https://cdn.example/logo.png",
      day: 1,
      month: 2,
      year: 1993,
      stars: 8,
      criticratings: 9,
      userratings: 8.5,
      genre: [1],
      executables: ["Play"],
      executableFileNames: ["01-Play-6.sh"],
      themes: [2],
      platforms: [6],
      gameModes: [1],
      playerPerspectives: [1],
      websites: [{ url: "https://example.com" }],
      ageRatings: [{ rating: 1, category: 1 }],
      developers: [{ id: 3, name: "Lucas" }],
      publishers: [{ id: 4, name: "LucasArts" }],
      franchise: [{ id: 5, name: "Maniac" }],
      collection: [{ id: 7, name: "Maniac" }],
      screenshots: ["/shots/1"],
      videos: ["/videos/1"],
      gameEngines: [8],
      keywords: ["avventura"],
      alternativeNames: ["Maniac Mansion"],
      similarGames: [{ id: 9, name: "Zak" }],
      type: 0,
    });

    expect(game.summary).toBe("Nuova descrizione");
    expect(game.executableFileNames).toEqual(["01-Play-6.sh"]);
    expect(game.externalLogoUrl).toBe("https://cdn.example/logo.png");
    expect(game.series).toEqual([{ id: 7, name: "Maniac" }]);
    expect(game.keywords).toEqual(["avventura"]);
    expect(game.similarGames).toEqual([{ id: 9, name: "Zak" }]);
    expect(game.screenshots).toEqual(["/shots/1"]);
  });

  it("resolves a locale map to the active language", async () => {
    await i18n.changeLanguage("it");
    const game = gameItemFromApi({
      id: 1,
      title: "Test",
      summary: { en: "English text", it: "Testo italiano" },
    });
    expect(game.summary).toBe("Testo italiano");
  });
});
