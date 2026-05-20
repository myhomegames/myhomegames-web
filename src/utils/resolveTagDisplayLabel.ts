import type { TFunction } from "i18next";
import type { TagLabelsMap } from "../contexts/TagListsContext";
import { TAG_PAGE_CONFIGS, type TagKey } from "./tagPages";

function tagLabelsKeyFor(tagKey: TagKey): keyof TagLabelsMap {
  return tagKey === "franchise" ? "franchises" : (tagKey as keyof TagLabelsMap);
}

export type ResolveTagDisplayLabelParams = {
  tagKey?: TagKey;
  tagId: string;
  /** IGDB name, URL ?name=, server list title, or embedded game tag title */
  preferredName?: string | null;
  tagLabels?: TagLabelsMap;
  t?: TFunction;
  /** Legacy per-page resolver (i18n); receives tag id */
  getDisplayName?: (id: string) => string;
};

/** Human-readable label for a tag id (cover placeholder, context rail, sort). */
export function resolveTagDisplayLabel({
  tagKey,
  tagId,
  preferredName,
  tagLabels,
  t,
  getDisplayName,
}: ResolveTagDisplayLabelParams): string {
  const id = String(tagId);
  const trimmedPreferred = preferredName?.trim();
  if (trimmedPreferred && trimmedPreferred !== id) {
    return trimmedPreferred;
  }

  if (tagKey && tagLabels) {
    const fromLabels = tagLabels[tagLabelsKeyFor(tagKey)]?.get(id);
    if (fromLabels) return fromLabels;
  }

  if (getDisplayName) {
    const fromFn = getDisplayName(id);
    if (fromFn && fromFn !== id) return fromFn;
  }

  if (tagKey && t) {
    const fromConfig = TAG_PAGE_CONFIGS[tagKey].getDisplayName(t)(id);
    if (fromConfig && fromConfig !== id) return fromConfig;
  }

  return trimmedPreferred || id;
}
