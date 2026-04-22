/** Case-insensitive substring match on game (or entity) title for the header title filter. */
export function titleMatchesFilter(title: string | undefined | null, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (title ?? "").toLowerCase().includes(q);
}
