import { getApiBase } from "../config";
import { buildApiUrl, buildApiHeaders } from "./api";
import { buildCatalogApiUrl } from "./catalogApi";
import type { CatalogCompanyInfo } from "../types";
import { parseCompanyMergePayloadFromApi } from "./companyProfile";

type CompanyRole = "developers" | "publishers";

type CompanyRef = { id: number; name?: string | null };

/**
 * Fetch company profile via /igdb/* (proxy) and merge into local library storage.
 * When the profile references related companies, merges their IGDB profiles too and
 * links parent/child hierarchy via merge-company-profile (parentCompany, updatedTo, formerly).
 */
export async function refreshRemoteCompanyProfileViaApi(
  resourceType: CompanyRole,
  itemId: string,
  title?: string,
  options: { syncParent?: boolean } = {},
): Promise<void> {
  const syncParent = options.syncParent !== false;

  const params: Record<string, string> = {};
  if (title?.trim()) params.name = title.trim();

  const catalogRes = await fetch(buildCatalogApiUrl(`/igdb/company/${itemId}`, params), {
    headers: buildApiHeaders(),
  });
  if (!catalogRes.ok) return;

  const catalogData = (await catalogRes.json()) as CatalogCompanyInfo | null;
  const profile = parseCompanyMergePayloadFromApi(catalogData ?? undefined);
  const parentCompany = catalogData?.parentCompany;
  const hasParentHint = parentCompany?.id != null;
  const hasRelationHint =
    hasParentHint ||
    catalogData?.updatedTo?.id != null ||
    catalogData?.formerly?.id != null;
  if (Object.keys(profile).length === 0 && !hasRelationHint) return;

  const mergeBody: Record<string, unknown> = { ...profile };
  if (hasParentHint) {
    mergeBody.parentCompany = parentCompany;
  }

  const mergeRes = await fetch(buildApiUrl(getApiBase(), `/${resourceType}/${itemId}/merge-company-profile`), {
    method: "POST",
    headers: {
      ...buildApiHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mergeBody),
  });
  if (!mergeRes.ok) {
    console.warn(
      `Company profile merge failed for ${resourceType}/${itemId}:`,
      mergeRes.status,
      await mergeRes.text().catch(() => ""),
    );
    return;
  }

  if (resourceType === "developers") {
    window.dispatchEvent(new CustomEvent("developerUpdated", { detail: {} }));
  } else {
    window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: {} }));
  }

  if (!syncParent) return;

  const relatedIds = new Set<string>();
  const syncRelated = async (ref: { id?: number; name?: string | null } | undefined) => {
    if (ref?.id == null) return;
    const relatedId = String(ref.id);
    if (relatedId === itemId || relatedIds.has(relatedId)) return;
    relatedIds.add(relatedId);
    await refreshRemoteCompanyProfileViaApi(
      resourceType,
      relatedId,
      ref.name ?? undefined,
      { syncParent: true },
    );
  };

  await syncRelated(parentCompany);
  await syncRelated(catalogData?.updatedTo);
  await syncRelated(catalogData?.formerly);
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
