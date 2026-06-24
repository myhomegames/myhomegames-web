import { getApiBase } from "../config";
import { buildApiUrl, buildApiHeaders } from "./api";
import { buildCatalogApiUrl } from "./catalogApi";
import { parseCompanyProfileFromApi } from "./companyProfile";

type CompanyRole = "developers" | "publishers";

type CompanyRef = { id: number; name?: string | null };

/**
 * Fetch company profile via /igdb/* (proxy) and merge into local library storage.
 */
export async function refreshRemoteCompanyProfileViaApi(
  resourceType: CompanyRole,
  itemId: string,
  title?: string,
): Promise<void> {
  const params: Record<string, string> = {};
  if (title?.trim()) params.name = title.trim();

  const catalogRes = await fetch(buildCatalogApiUrl(`/igdb/company/${itemId}`, params), {
    headers: buildApiHeaders(),
  });
  if (!catalogRes.ok) return;

  const catalogData = (await catalogRes.json()) as Record<string, unknown> | null;
  const profile = parseCompanyProfileFromApi(catalogData ?? undefined);
  if (Object.keys(profile).length === 0) return;

  const mergeRes = await fetch(buildApiUrl(getApiBase(), `/${resourceType}/${itemId}/merge-company-profile`), {
    method: "POST",
    headers: {
      ...buildApiHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });
  if (!mergeRes.ok) {
    console.warn(
      `Company profile merge failed for ${resourceType}/${itemId}:`,
      mergeRes.status,
      await mergeRes.text().catch(() => ""),
    );
  }
}

/** Best-effort company profile sync after catalog game import (IGDB reads only via /igdb/*). */
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
  await Promise.allSettled(tasks);
}
