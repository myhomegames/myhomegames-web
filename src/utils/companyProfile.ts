import type { CollectionInfo, CompanyProfileFields } from "../types";

const COMPANY_PROFILE_FIELD_KEYS = [
  "status",
  "countryCode",
  "started",
  "changedOn",
  "knownAs",
  "legalName",
  "companySize",
  "companySizeId",
  "formerly",
  "parentCompany",
  "updatedTo",
] as const satisfies ReadonlyArray<keyof CompanyProfileFields>;

export function pickCompanyProfileFields(
  item: CollectionInfo | null | undefined,
): CompanyProfileFields {
  if (!item) return {};
  const fields: CompanyProfileFields = {};
  for (const key of COMPANY_PROFILE_FIELD_KEYS) {
    const value = item[key];
    if (value !== undefined) {
      (fields as Record<string, unknown>)[key] = value;
    }
  }
  return fields;
}

export function hasCompanyProfileFields(item: CollectionInfo | null | undefined): boolean {
  return Object.keys(pickCompanyProfileFields(item)).length > 0;
}

export function mergeCompanyProfileOntoCollectionInfo<T extends CollectionInfo>(
  item: T,
  profile: CompanyProfileFields | null | undefined,
): T {
  const next = { ...item } as T;
  for (const key of COMPANY_PROFILE_FIELD_KEYS) {
    delete (next as Record<string, unknown>)[key];
  }
  if (profile && typeof profile === "object") {
    Object.assign(next, profile);
  }
  return next;
}

export function parseCompanyProfileFromApi(
  raw: Record<string, unknown> | null | undefined,
): CompanyProfileFields {
  if (!raw || typeof raw !== "object") return {};
  const fields: CompanyProfileFields = {};
  for (const key of COMPANY_PROFILE_FIELD_KEYS) {
    const value = raw[key];
    if (value !== undefined) {
      (fields as Record<string, unknown>)[key] = value;
    }
  }
  return fields;
}

export function applyCompanyProfileFieldsToPayload(
  payload: Record<string, unknown>,
  profile: CompanyProfileFields | null,
): Record<string, unknown> {
  const next = { ...payload };
  for (const key of COMPANY_PROFILE_FIELD_KEYS) {
    delete next[key];
  }
  if (profile && typeof profile === "object") {
    Object.assign(next, profile);
  } else if (profile === null) {
    for (const key of COMPANY_PROFILE_FIELD_KEYS) {
      next[key] = null;
    }
  }
  return next;
}

export function collectionInfoFromApi(raw: Record<string, unknown>): CollectionInfo {
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    summary: typeof raw.summary === "string" ? raw.summary : "",
    cover: typeof raw.cover === "string" ? raw.cover : undefined,
    background: typeof raw.background === "string" ? raw.background : undefined,
    externalCoverUrl:
      raw.externalCoverUrl === null || typeof raw.externalCoverUrl === "string"
        ? (raw.externalCoverUrl as string | null)
        : undefined,
    externalBackgroundUrl:
      raw.externalBackgroundUrl === null || typeof raw.externalBackgroundUrl === "string"
        ? (raw.externalBackgroundUrl as string | null)
        : undefined,
    showTitle: raw.showTitle !== false,
    childs: Array.isArray(raw.childs) ? raw.childs : [],
    ...parseCompanyProfileFromApi(raw),
  };
}

export { COMPANY_PROFILE_FIELD_KEYS };
