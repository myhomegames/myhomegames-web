import type { IgdbCompanyInfo } from "../types";
import { IGDB_COMPANY_SIZE_IDS } from "./igdbCompany";

export const IGDB_COMPANY_STATUS_KEYS = ["active", "defunct", "merge", "renamed"] as const;

export type IgdbCompanyInfoFormState = {
  status: string;
  countryCode: string;
  started: string;
  changedOn: string;
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
    started: "",
    changedOn: "",
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
  return {
    status: info.status?.trim().toLowerCase() ?? "",
    countryCode: info.countryCode != null ? String(info.countryCode) : "",
    started: info.started ?? "",
    changedOn: info.changedOn ?? "",
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

  const started = state.started.trim();
  if (started) info.started = started;

  const changedOn = state.changedOn.trim();
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
