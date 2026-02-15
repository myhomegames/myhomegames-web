import type { FilterValue, GameItem } from "./types";

type TagField = "platforms" | "themes" | "gameModes" | "playerPerspectives" | "gameEngines";

/** Normalize tag field from API ({ id, title }[] or string[]) to string[] (titles). */
export function toTagTitles(
  tags: Array<{ id: number; title: string } | string> | string[] | undefined | null
): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.map((t) => (typeof t === "object" && t != null && "title" in t ? t.title : String(t)));
}

/** Get display label for a tag filter value (id or legacy title) from games. */
export function getTagLabelFromGames(
  games: GameItem[] | undefined,
  field: TagField,
  value: FilterValue
): string {
  const list: Array<{ id: number; title: string } | string> = games?.flatMap((g) => {
    const f = g[field];
    return Array.isArray(f) ? (f as Array<{ id: number; title: string } | string>) : [];
  }) ?? [];
  const tag = list.find(
    (t: unknown) =>
      (typeof t === "object" && t != null && "id" in t && (t as { id: number }).id === Number(value)) ||
      t === value
  );
  if (typeof tag === "object" && tag != null && "title" in tag) return (tag as { title: string }).title;
  if (typeof tag === "string") return tag;
  return String(value);
}
