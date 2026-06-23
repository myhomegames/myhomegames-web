import type { TFunction } from "i18next";
import iso3166NumericToAlpha2 from "../data/iso3166NumericToAlpha2.json";

/** IGDB `company_sizes` ids documented in the public API. */
export const IGDB_COMPANY_SIZE_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const numericToAlpha2 = iso3166NumericToAlpha2 as Record<string, string>;

export type IgdbCountryOption = {
  code: number;
  label: string;
};

const countryOptionCache = new Map<string, IgdbCountryOption[]>();

export function listIgdbCountryOptions(language: string): IgdbCountryOption[] {
  const cacheKey = language || "en";
  const cached = countryOptionCache.get(cacheKey);
  if (cached) return cached;

  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([cacheKey], { type: "region" });
  } catch {
    display = null;
  }

  const options: IgdbCountryOption[] = [];
  for (const [numericCode, alpha2] of Object.entries(numericToAlpha2)) {
    const code = Number(numericCode);
    if (Number.isNaN(code)) continue;
    options.push({
      code,
      label: display?.of(alpha2) ?? alpha2,
    });
  }

  options.sort((a, b) => a.label.localeCompare(b.label, cacheKey, { sensitivity: "base" }));
  countryOptionCache.set(cacheKey, options);
  return options;
}

export function formatIgdbCountryCode(
  countryCode: number | undefined,
  language: string
): string | null {
  if (countryCode == null || Number.isNaN(countryCode)) return null;

  const alpha2 = numericToAlpha2[String(countryCode)];
  if (!alpha2) return null;

  try {
    const display = new Intl.DisplayNames([language], { type: "region" });
    return display.of(alpha2) ?? null;
  } catch {
    return null;
  }
}

export function formatIgdbCompanySize(
  companySizeId: number | undefined,
  t: TFunction
): string | null {
  if (companySizeId == null || Number.isNaN(companySizeId)) return null;
  return String(t(`igdbCompanySizes.${companySizeId}`));
}
