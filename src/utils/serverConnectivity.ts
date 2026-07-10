import { getApiBase } from "../config";
import { buildApiHeaders, buildApiUrl } from "./api";

export async function probeServerReachable(apiBase: string = getApiBase()): Promise<boolean> {
  try {
    const url = buildApiUrl(apiBase, "/version");
    const res = await fetch(url, {
      headers: buildApiHeaders({ Accept: "application/json" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
