import type { CollectionInfo, CollectionItem } from "../types";

export type CompanyProfilePatch = Pick<
  CollectionInfo,
  | "id"
  | "title"
  | "summary"
  | "cover"
  | "background"
  | "externalCoverUrl"
  | "externalBackgroundUrl"
  | "showTitle"
  | "childs"
  | "igdbCompanyInfo"
>;

export function pickCompanyProfilePatch(item: CollectionInfo): CompanyProfilePatch {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    cover: item.cover,
    background: item.background,
    externalCoverUrl: item.externalCoverUrl,
    externalBackgroundUrl: item.externalBackgroundUrl,
    showTitle: item.showTitle,
    childs: item.childs,
    igdbCompanyInfo: item.igdbCompanyInfo,
  };
}

export function mergeCompanyProfileOntoItem<T extends CollectionItem>(
  item: T,
  profile: CompanyProfilePatch,
): T {
  if (String(item.id) !== String(profile.id)) return item;
  return {
    ...item,
    title: profile.title ?? item.title,
    summary: profile.summary ?? item.summary,
    cover: profile.cover !== undefined ? profile.cover : item.cover,
    background: profile.background !== undefined ? profile.background : item.background,
    externalCoverUrl:
      profile.externalCoverUrl !== undefined ? profile.externalCoverUrl : item.externalCoverUrl,
    externalBackgroundUrl:
      profile.externalBackgroundUrl !== undefined
        ? profile.externalBackgroundUrl
        : item.externalBackgroundUrl,
    showTitle: profile.showTitle !== undefined ? profile.showTitle : item.showTitle,
    childs: profile.childs !== undefined ? profile.childs : item.childs,
    igdbCompanyInfo:
      profile.igdbCompanyInfo !== undefined ? profile.igdbCompanyInfo : item.igdbCompanyInfo,
  };
}

export function dispatchCompanyProfileUpdated(item: CollectionInfo) {
  window.dispatchEvent(
    new CustomEvent("companyProfileUpdated", {
      detail: { profile: pickCompanyProfilePatch(item) },
    }),
  );
}

export function dispatchDeveloperOrPublisherUpdated(
  resourceType: "developers" | "publishers",
  updatedItem: CollectionInfo,
) {
  if (resourceType === "developers") {
    window.dispatchEvent(
      new CustomEvent("developerUpdated", { detail: { developer: updatedItem } }),
    );
  } else {
    window.dispatchEvent(
      new CustomEvent("publisherUpdated", { detail: { publisher: updatedItem } }),
    );
  }
  dispatchCompanyProfileUpdated(updatedItem);
}
