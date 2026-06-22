import type { TFunction } from "i18next";

/** IGDB `company_sizes` ids documented in the public API. */
export const IGDB_COMPANY_SIZE_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function formatIgdbCompanySize(
  companySizeId: number | undefined,
  t: TFunction
): string | null {
  if (companySizeId == null || Number.isNaN(companySizeId)) return null;
  return String(t(`igdbCompanySizes.${companySizeId}`));
}
