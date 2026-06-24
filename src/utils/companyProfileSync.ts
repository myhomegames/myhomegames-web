import type { CollectionInfo, CollectionItem, CompanyProfileFields } from "../types";
import {
  COMPANY_PROFILE_FIELD_KEYS,
  mergeCompanyProfileOntoCollectionInfo,
  pickCompanyProfileFields,
} from "./companyProfile";

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
> &
  CompanyProfileFields;

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
    ...pickCompanyProfileFields(item),
  };
}

export function mergeCompanyProfileOntoItem<T extends CollectionItem>(
  item: T,
  profile: CompanyProfilePatch,
): T {
  if (String(item.id) !== String(profile.id)) return item;
  const { id: _id, ...rest } = profile;
  return mergeCompanyProfileOntoCollectionInfo(
    {
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
    },
    pickCompanyProfileFields(profile),
  );
}

export function dispatchCompanyProfileUpdated(item: CollectionInfo) {
  window.dispatchEvent(
    new CustomEvent("companyProfileUpdated", {
      detail: { profile: pickCompanyProfilePatch(item) },
    }),
  );
}

export function dispatchCollectionLikeChildLinked(
  resourceType: "developers" | "publishers" | "collections",
  parentId: string | number,
  childId: string | number,
) {
  window.dispatchEvent(
    new CustomEvent("collectionLikeChildLinked", {
      detail: {
        resourceType,
        parentId: String(parentId),
        childId: String(childId),
      },
    }),
  );
}

export function syncIgdbParentCompanyChildLinkInUI(
  resourceType: "developers" | "publishers",
  item: CollectionInfo,
) {
  const parent = pickCompanyProfileFields(item).parentCompany;
  if (parent?.id == null) return;
  dispatchCollectionLikeChildLinked(resourceType, parent.id, item.id);
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
  syncIgdbParentCompanyChildLinkInUI(resourceType, updatedItem);
}

export { COMPANY_PROFILE_FIELD_KEYS };
