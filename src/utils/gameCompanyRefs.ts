import type { CollectionItem } from "../types";

export type CompanyRef = { id: number | string; name?: string | null };

function catalogNameById(refs: CompanyRef[] | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const ref of refs ?? []) {
    if (ref?.id == null) continue;
    const name = ref.name?.trim();
    if (name) map.set(String(ref.id), name);
  }
  return map;
}

function isPlaceholderName(name: string, id: string): boolean {
  return name === id || name === String(Number(id));
}

function normalizeCompanyRef(
  id: number,
  catalogById: Map<string, string>,
  nameFromApi?: string | null,
): { id: number; name: string } {
  const idStr = String(id);
  const catalogName = catalogById.get(idStr);
  const apiName = nameFromApi?.trim();
  if (catalogName) return { id, name: catalogName };
  if (apiName && !isPlaceholderName(apiName, idStr)) return { id, name: apiName };
  return { id, name: catalogName ?? apiName ?? idStr };
}

/** Keep `{ id, name }` on imported games even when the API returns bare ids or placeholder names. */
export function mergeDeveloperPublisherRefsForGame(
  apiValue: unknown,
  catalogRefs: CompanyRef[] | null | undefined,
): Array<{ id: number; name: string }> | null {
  const catalogById = catalogNameById(catalogRefs);

  if (!Array.isArray(apiValue) || apiValue.length === 0) {
    if (!catalogRefs?.length) return null;
    const fromCatalog = catalogRefs
      .filter((ref) => ref?.id != null && catalogById.has(String(ref.id)))
      .map((ref) => normalizeCompanyRef(Number(ref.id), catalogById, ref.name));
    return fromCatalog.length > 0 ? fromCatalog : null;
  }

  const merged = apiValue.map((entry) => {
    if (typeof entry === "object" && entry != null && "id" in entry) {
      const id = Number((entry as { id: number }).id);
      const name = (entry as { name?: string }).name;
      return normalizeCompanyRef(id, catalogById, name);
    }
    return normalizeCompanyRef(Number(entry), catalogById);
  });

  return merged.length > 0 ? merged : null;
}

function toCollectionItem(ref: CompanyRef): CollectionItem | null {
  if (ref?.id == null) return null;
  const title = ref.name?.trim();
  if (!title) return null;
  return {
    id: String(ref.id),
    title,
    summary: "",
    showTitle: true,
    childs: [],
  };
}

/** Optimistic context update for developers/publishers created during catalog import. */
export function dispatchImportedCompaniesAdded(
  developers?: CompanyRef[] | null,
  publishers?: CompanyRef[] | null,
): void {
  for (const ref of developers ?? []) {
    const developer = toCollectionItem(ref);
    if (!developer) continue;
    window.dispatchEvent(new CustomEvent("developerAdded", { detail: { developer } }));
  }
  for (const ref of publishers ?? []) {
    const publisher = toCollectionItem(ref);
    if (!publisher) continue;
    window.dispatchEvent(new CustomEvent("publisherAdded", { detail: { publisher } }));
  }
}
