/**
 * Durable Smart TV cover focus across detail ↔ list navigation.
 * DOM nodes unmount on route change, so we keep a stack of list-item ids
 * pushed when Enter opens a cover, and restore the top entry after Back.
 */

export const TV_COVER_FOCUS_STORAGE_KEY = "mhgTvCoverFocusStack";

export type TvCoverFocusIdentity = {
  kind: "game" | "tag" | "collection";
  id: string;
};

function cssEscapeIdent(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function readStack(): TvCoverFocusIdentity[] {
  try {
    const raw = sessionStorage.getItem(TV_COVER_FOCUS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is TvCoverFocusIdentity =>
        !!entry &&
        (entry.kind === "game" ||
          entry.kind === "tag" ||
          entry.kind === "collection") &&
        typeof entry.id === "string" &&
        entry.id.length > 0,
    );
  } catch {
    return [];
  }
}

function writeStack(stack: TvCoverFocusIdentity[]): void {
  try {
    sessionStorage.setItem(
      TV_COVER_FOCUS_STORAGE_KEY,
      JSON.stringify(stack.slice(-20)),
    );
  } catch {
    /* ignore */
  }
}

export function tvCoverIdentityFrom(el: HTMLElement | null): TvCoverFocusIdentity | null {
  if (!el) return null;
  const gameHost = el.closest("[data-mhg-game-id]") as HTMLElement | null;
  const gameId = gameHost?.getAttribute("data-mhg-game-id");
  if (gameId) return { kind: "game", id: gameId };

  const tagHost = el.closest("[data-mhg-tag-id]") as HTMLElement | null;
  const tagId = tagHost?.getAttribute("data-mhg-tag-id");
  if (tagId) return { kind: "tag", id: tagId };

  const collectionHost = el.closest("[data-mhg-collection-id]") as HTMLElement | null;
  const collectionId = collectionHost?.getAttribute("data-mhg-collection-id");
  if (collectionId) return { kind: "collection", id: collectionId };

  return null;
}

/** Remember the cover that is about to open a detail / child list (Enter / OK). */
export function pushTvCoverFocusIdentity(el: HTMLElement | null): void {
  const identity = tvCoverIdentityFrom(el);
  if (!identity) return;
  const stack = readStack();
  const top = stack[stack.length - 1];
  if (top && top.kind === identity.kind && top.id === identity.id) {
    return;
  }
  stack.push(identity);
  writeStack(stack);
}

export function peekTvCoverFocusIdentity(): TvCoverFocusIdentity | null {
  const stack = readStack();
  return stack[stack.length - 1] ?? null;
}

export function popTvCoverFocusIdentity(): TvCoverFocusIdentity | null {
  const stack = readStack();
  const top = stack.pop() ?? null;
  writeStack(stack);
  return top;
}

function coverControlFromHost(host: HTMLElement): HTMLElement | null {
  if (host.classList.contains("games-list-cover")) return host;
  return (
    host.querySelector<HTMLElement>(
      ".games-list-cover[role='button'], .games-list-cover[tabindex]",
    ) ?? host.querySelector<HTMLElement>(".games-list-cover")
  );
}

export function findCoverByTvFocusIdentity(
  identity: TvCoverFocusIdentity,
): HTMLElement | null {
  const attr =
    identity.kind === "game"
      ? "data-mhg-game-id"
      : identity.kind === "tag"
        ? "data-mhg-tag-id"
        : "data-mhg-collection-id";
  const host = document.querySelector<HTMLElement>(
    `[${attr}="${cssEscapeIdent(identity.id)}"]`,
  );
  if (!host) return null;
  return coverControlFromHost(host);
}

/**
 * Fixed-focal wrappers often own `mhg-cover-scale-selected` while the
 * `data-mhg-*` identity lives on a child tile (game / tag / collection item).
 */
function identityHostFromSelectedTile(selected: HTMLElement): HTMLElement | null {
  if (tvCoverIdentityFrom(selected)) return selected;
  return selected.querySelector<HTMLElement>(
    "[data-mhg-game-id], [data-mhg-tag-id], [data-mhg-collection-id]",
  );
}

/**
 * Fixed-focal lists remount only a window around the selected index. After Back,
 * the selected tile is the one that should match the persisted identity.
 */
export function findSelectedCoverMatchingIdentity(
  identity: TvCoverFocusIdentity,
): HTMLElement | null {
  const selected = document.querySelector<HTMLElement>(".mhg-cover-scale-selected");
  if (!selected) return null;
  const host = identityHostFromSelectedTile(selected);
  if (!host) return null;
  const selectedIdentity = tvCoverIdentityFrom(host);
  if (
    !selectedIdentity ||
    selectedIdentity.kind !== identity.kind ||
    selectedIdentity.id !== identity.id
  ) {
    return null;
  }
  return coverControlFromHost(host);
}

/** Best available cover for Enter / OK while in the fixed-focal content zone. */
export function resolveCoverElForTvFocusPush(): HTMLElement | null {
  const selected = document.querySelector<HTMLElement>(".mhg-cover-scale-selected");
  if (selected) {
    const host = identityHostFromSelectedTile(selected);
    if (host) return host;
  }
  const focused = document.activeElement;
  if (focused instanceof HTMLElement && tvCoverIdentityFrom(focused)) {
    return focused;
  }
  return null;
}
