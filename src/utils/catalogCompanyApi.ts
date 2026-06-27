import { getApiBase } from "../config";
import { buildApiUrl, buildApiHeaders } from "./api";
import { buildCatalogApiUrl } from "./catalogApi";
import type { CatalogCompanyInfo } from "../types";
import { parseCompanyMergePayloadFromApi } from "./companyProfile";
import {
  isBulkMetadataReloadAbortedError,
  throwIfMetadataReloadAborted,
} from "./bulkMetadataReloadContext";

type CompanyRole = "developers" | "publishers";

type CompanyRef = { id: number; name?: string | null };

type RefreshRemoteCompanyProfileOptions = {
  syncParent?: boolean;
  signal?: AbortSignal;
  relationDepth?: number;
  /** Company ids already synced in this relation walk (prevents formerly ↔ updatedTo loops). */
  visitedIds?: Set<string>;
};

/** Safety cap for IGDB company relation chains (parent / updatedTo / formerly). */
const MAX_COMPANY_RELATION_SYNC_DEPTH = 16;

/**
 * Fetch company profile via /igdb/* (proxy) and merge into local library storage.
 * When the profile references related companies, merges their IGDB profiles too and
 * links parent/child hierarchy via merge-company-profile (parentCompany, updatedTo, formerly).
 */
export async function refreshRemoteCompanyProfileViaApi(
  resourceType: CompanyRole,
  itemId: string,
  title?: string,
  options: RefreshRemoteCompanyProfileOptions = {},
): Promise<void> {
  const syncParent = options.syncParent !== false;
  const signal = options.signal;
  const depth = options.relationDepth ?? 0;
  const visited = options.visitedIds ?? new Set<string>();

  if (depth > MAX_COMPANY_RELATION_SYNC_DEPTH) {
    return;
  }

  if (visited.has(itemId)) {
    return;
  }

  visited.add(itemId);

  throwIfMetadataReloadAborted();

  const params: Record<string, string> = {};
  if (title?.trim()) params.name = title.trim();

  const catalogRes = await fetch(buildCatalogApiUrl(`/igdb/company/${itemId}`, params), {
    headers: buildApiHeaders(),
    signal,
  });

  if (!catalogRes.ok) {
    return;
  }

  const catalogData = (await catalogRes.json()) as CatalogCompanyInfo | null;

  throwIfMetadataReloadAborted();

  const profile = parseCompanyMergePayloadFromApi(catalogData ?? undefined);
  const parentCompany = catalogData?.parentCompany;
  const hasParentHint = parentCompany?.id != null;
  const hasRelationHint =
    hasParentHint ||
    catalogData?.updatedTo?.id != null ||
    catalogData?.formerly?.id != null;

  if (Object.keys(profile).length === 0 && !hasRelationHint) {
    return;
  }

  const mergeBody: Record<string, unknown> = { ...profile };
  if (hasParentHint) {
    mergeBody.parentCompany = parentCompany;
  }
  const resolvedTitle =
    title?.trim() ||
    (typeof profile.title === "string" ? profile.title.trim() : "") ||
    (typeof catalogData?.title === "string" ? catalogData.title.trim() : "");
  if (resolvedTitle && mergeBody.title == null) {
    mergeBody.title = resolvedTitle;
  }

  const mergeUrl = buildApiUrl(getApiBase(), `/${resourceType}/${itemId}/merge-company-profile`);
  const mergeRes = await fetch(mergeUrl, {
    method: "POST",
    headers: {
      ...buildApiHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mergeBody),
    signal,
  });

  if (!mergeRes.ok) {
    const body = await mergeRes.text().catch(() => "");
    console.warn(
      `Company profile merge failed for ${resourceType}/${itemId}:`,
      mergeRes.status,
      body,
    );
    return;
  }

  const mergePayload = (await mergeRes.json().catch(() => null)) as Record<string, unknown> | null;
  const mergeStatus = mergePayload?.status;
  const createdKey = resourceType === "developers" ? "developer" : "publisher";
  const createdItem = mergePayload?.[createdKey] as
    | { id?: string | number; title?: string }
    | undefined;

  if (mergeStatus === "created" && createdItem?.id != null && createdItem.title) {
    const collectionItem = {
      id: String(createdItem.id),
      title: createdItem.title,
      summary: "",
      showTitle: true,
      childs: [] as string[],
    };
    if (resourceType === "developers") {
      window.dispatchEvent(new CustomEvent("developerAdded", { detail: { developer: collectionItem } }));
    } else {
      window.dispatchEvent(new CustomEvent("publisherAdded", { detail: { publisher: collectionItem } }));
    }
  } else if (resourceType === "developers") {
    window.dispatchEvent(new CustomEvent("developerUpdated", { detail: {} }));
  } else {
    window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: {} }));
  }

  if (!syncParent) {
    return;
  }

  const syncRelated = async (
    relation: "parentCompany" | "updatedTo" | "formerly",
    ref: { id?: number; name?: string | null } | undefined,
  ) => {
    throwIfMetadataReloadAborted();

    if (ref?.id == null) {
      return;
    }

    const relatedId = String(ref.id);
    if (relatedId === itemId || visited.has(relatedId)) {
      return;
    }

    try {
      await refreshRemoteCompanyProfileViaApi(
        resourceType,
        relatedId,
        ref.name ?? undefined,
        {
          syncParent: true,
          signal,
          relationDepth: depth + 1,
          visitedIds: visited,
        },
      );
    } catch (error) {
      if (isBulkMetadataReloadAbortedError(error)) throw error;
      throw error;
    }
  };

  await syncRelated("parentCompany", parentCompany);
  await syncRelated("updatedTo", catalogData?.updatedTo);
  await syncRelated("formerly", catalogData?.formerly);
}

/** Company profile sync after catalog game import (IGDB reads only via /igdb/*). */
export async function syncCompanyProfilesAfterGameImport(
  developers?: CompanyRef[] | null,
  publishers?: CompanyRef[] | null,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  for (const item of developers ?? []) {
    if (item?.id != null) {
      tasks.push(refreshRemoteCompanyProfileViaApi("developers", String(item.id), item.name ?? undefined));
    }
  }
  for (const item of publishers ?? []) {
    if (item?.id != null) {
      tasks.push(refreshRemoteCompanyProfileViaApi("publishers", String(item.id), item.name ?? undefined));
    }
  }
  await Promise.all(tasks);
}
