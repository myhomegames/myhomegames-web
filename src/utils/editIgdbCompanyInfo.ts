import type { IgdbCompanyInfo } from "../types";
import { IGDB_COMPANY_SIZE_IDS } from "./igdbCompany";

export const IGDB_COMPANY_STATUS_KEYS = ["active", "defunct", "merge", "renamed"] as const;

export type YearMonthDayParts = {
  year: string;
  month: string;
  day: string;
};

export function parseIgdbCompanyDateString(value?: string | null): YearMonthDayParts {
  const empty: YearMonthDayParts = { year: "", month: "", day: "" };
  const trimmed = value?.trim();
  if (!trimmed) return empty;

  const fullMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (fullMatch) {
    return {
      year: fullMatch[1],
      month: String(Number(fullMatch[2])),
      day: String(Number(fullMatch[3])),
    };
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (monthMatch) {
    return {
      year: monthMatch[1],
      month: String(Number(monthMatch[2])),
      day: "",
    };
  }

  const yearMatch = /^(\d{4})$/.exec(trimmed);
  if (yearMatch) {
    return { year: yearMatch[1], month: "", day: "" };
  }

  const quarterMatch = /^(\d{4})\s+Q[1-4]$/i.exec(trimmed);
  if (quarterMatch) {
    return { year: quarterMatch[1], month: "", day: "" };
  }

  return empty;
}

export function buildIgdbCompanyDateString(parts: YearMonthDayParts): string {
  const year = parts.year.trim();
  if (!year) return "";

  const month = parts.month.trim();
  const day = parts.day.trim();
  const monthNum = month ? Number(month) : NaN;
  const dayNum = day ? Number(day) : NaN;

  if (!Number.isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
    const monthPadded = String(monthNum).padStart(2, "0");
    if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
      return `${year}-${monthPadded}-${String(dayNum).padStart(2, "0")}`;
    }
    return `${year}-${monthPadded}`;
  }

  return year;
}

export type IgdbCompanyInfoFormState = {
  status: string;
  countryCode: string;
  startedYear: string;
  startedMonth: string;
  startedDay: string;
  changedOnYear: string;
  changedOnMonth: string;
  changedOnDay: string;
  knownAs: string;
  legalName: string;
  companySizeId: string;
  formerlyId: string;
  formerlyName: string;
  parentCompanyId: string;
  parentCompanyName: string;
  updatedToId: string;
  updatedToName: string;
};

export function emptyIgdbCompanyInfoFormState(): IgdbCompanyInfoFormState {
  return {
    status: "",
    countryCode: "",
    startedYear: "",
    startedMonth: "",
    startedDay: "",
    changedOnYear: "",
    changedOnMonth: "",
    changedOnDay: "",
    knownAs: "",
    legalName: "",
    companySizeId: "",
    formerlyId: "",
    formerlyName: "",
    parentCompanyId: "",
    parentCompanyName: "",
    updatedToId: "",
    updatedToName: "",
  };
}

export function igdbCompanyInfoToFormState(
  info?: IgdbCompanyInfo | null
): IgdbCompanyInfoFormState {
  if (!info) return emptyIgdbCompanyInfoFormState();
  const started = parseIgdbCompanyDateString(info.started);
  const changedOn = parseIgdbCompanyDateString(info.changedOn);
  return {
    status: info.status?.trim().toLowerCase() ?? "",
    countryCode: info.countryCode != null ? String(info.countryCode) : "",
    startedYear: started.year,
    startedMonth: started.month,
    startedDay: started.day,
    changedOnYear: changedOn.year,
    changedOnMonth: changedOn.month,
    changedOnDay: changedOn.day,
    knownAs: info.knownAs ?? "",
    legalName: info.legalName ?? "",
    companySizeId: info.companySizeId != null ? String(info.companySizeId) : "",
    formerlyId: info.formerly?.id != null ? String(info.formerly.id) : "",
    formerlyName: info.formerly?.name ?? "",
    parentCompanyId: info.parentCompany?.id != null ? String(info.parentCompany.id) : "",
    parentCompanyName: info.parentCompany?.name ?? "",
    updatedToId: info.updatedTo?.id != null ? String(info.updatedTo.id) : "",
    updatedToName: info.updatedTo?.name ?? "",
  };
}

function parseOptionalId(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const id = Number(trimmed);
  return Number.isNaN(id) ? undefined : id;
}

function buildCompanyReference(
  idValue: string,
  nameValue: string
): { id?: number; name: string } | undefined {
  const name = nameValue.trim();
  if (!name) return undefined;
  const id = parseOptionalId(idValue);
  return id != null ? { id, name } : { name };
}

export function formStateToIgdbCompanyInfo(
  state: IgdbCompanyInfoFormState
): IgdbCompanyInfo | null {
  const info: IgdbCompanyInfo = {};
  const status = state.status.trim().toLowerCase();
  if (status) info.status = status;

  const countryCode = parseOptionalId(state.countryCode);
  if (countryCode != null) info.countryCode = countryCode;

  const started = buildIgdbCompanyDateString({
    year: state.startedYear,
    month: state.startedMonth,
    day: state.startedDay,
  });
  if (started) info.started = started;

  const changedOn = buildIgdbCompanyDateString({
    year: state.changedOnYear,
    month: state.changedOnMonth,
    day: state.changedOnDay,
  });
  if (changedOn) info.changedOn = changedOn;

  const knownAs = state.knownAs.trim();
  if (knownAs) info.knownAs = knownAs;

  const legalName = state.legalName.trim();
  if (legalName) info.legalName = legalName;

  const companySizeId = parseOptionalId(state.companySizeId);
  if (
    companySizeId != null &&
    (IGDB_COMPANY_SIZE_IDS as readonly number[]).includes(companySizeId)
  ) {
    info.companySizeId = companySizeId;
  }

  const formerly = buildCompanyReference(state.formerlyId, state.formerlyName);
  if (formerly) info.formerly = formerly as IgdbCompanyInfo["formerly"];

  const parentCompany = buildCompanyReference(state.parentCompanyId, state.parentCompanyName);
  if (parentCompany) info.parentCompany = parentCompany as IgdbCompanyInfo["parentCompany"];

  const updatedTo = buildCompanyReference(state.updatedToId, state.updatedToName);
  if (updatedTo) info.updatedTo = updatedTo as IgdbCompanyInfo["updatedTo"];

  return Object.keys(info).length > 0 ? info : null;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function igdbCompanyInfoFormStatesEqual(
  a: IgdbCompanyInfoFormState,
  b: IgdbCompanyInfoFormState
): boolean {
  return stableStringify(formStateToIgdbCompanyInfo(a)) === stableStringify(formStateToIgdbCompanyInfo(b));
}
