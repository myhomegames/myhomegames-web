import type { CollectionLikeResourceType } from "../components/collections/EditCollectionLikeModal";
import type { CollectionItem } from "../types";

/** Collection-like wrapper: one sub-collection-like child and no direct games → title only, no cover. */
export function isTitleOnlyWrapperCollectionLike(
  item: Pick<CollectionItem, "childs">,
  directGamesCount: number,
): boolean {
  if (directGamesCount > 0) return false;
  const childIds = Array.isArray(item.childs)
    ? item.childs.map((id) => String(id)).filter((id) => id.length > 0)
    : [];
  return childIds.length === 1;
}

/** Synthetic game id used in sliders: `collectionlike:{collections|developers|publishers}:{id}` */
export function parseCollectionLikePseudoGameId(id: unknown): {
  resourceType: CollectionLikeResourceType;
  childId: string;
} | null {
  const s = String(id ?? "");
  if (!s.startsWith("collectionlike:")) return null;
  const parts = s.split(":");
  if (parts.length < 3) return null;
  const resourceType = parts[1] as CollectionLikeResourceType;
  if (resourceType !== "collections" && resourceType !== "developers" && resourceType !== "publishers") {
    return null;
  }
  const childId = parts[2];
  if (!childId) return null;
  return { resourceType, childId };
}
