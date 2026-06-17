export function parseSemver(version: string): [number, number, number] | null {
  const v = version.trim().replace(/^v/i, "");
  const core = v.split("-")[0];
  const parts = core.split(".").map((n) => parseInt(n, 10));
  if (parts.length < 1 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** True when `a` > `b` (semver). */
export function semverGreater(a: string, b: string): boolean {
  const va = parseSemver(a);
  const vb = parseSemver(b);
  if (!va || !vb) return false;
  for (let i = 0; i < 3; i++) {
    if (va[i] > vb[i]) return true;
    if (va[i] < vb[i]) return false;
  }
  return false;
}
