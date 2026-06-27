import type { CollectionLikeResourceType } from "../components/collections/EditCollectionLikeModal";

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

export type ActiveCollectionLikeDetail = {
  resourceType: CollectionLikeResourceType;
  id: string;
};

/** True when a collection-like row refers to the detail page already open. */
export function matchesActiveCollectionLikeDetail(
  resourceType: CollectionLikeResourceType,
  targetId: string,
  active?: ActiveCollectionLikeDetail | null,
): boolean {
  if (!active) return false;
  return active.resourceType === resourceType && String(active.id) === String(targetId);
}

export function isCollectionLikePseudoActiveDetail(
  gameId: unknown,
  active?: ActiveCollectionLikeDetail | null,
): boolean {
  const parsed = parseCollectionLikePseudoGameId(gameId);
  if (!parsed || !active) return false;
  return matchesActiveCollectionLikeDetail(parsed.resourceType, parsed.childId, active);
}
