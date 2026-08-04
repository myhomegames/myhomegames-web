import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  findCoverByTvFocusIdentity,
  findSelectedCoverMatchingIdentity,
  isTvCoverListFadePending,
  peekTvCoverFocusIdentity,
  popTvCoverFocusIdentity,
  pushTvCoverFocusId,
  pushTvCoverFocusIdentity,
  resolveCoverElForTvFocusPush,
  TV_COVER_FOCUS_STORAGE_KEY,
  tvCoverIdentityFrom,
} from "./tvCoverFocusRestore";

describe("tvCoverFocusRestore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = "";
  });

  it("reads game / tag / collection identity from hosts", () => {
    document.body.innerHTML = `
      <div data-mhg-game-id="42"><button class="games-list-cover" role="button"></button></div>
      <div data-mhg-tag-id="action"><button class="games-list-cover" tabindex="0"></button></div>
      <div data-mhg-collection-id="c9"><button class="games-list-cover" role="button"></button></div>
    `;
    const gameCover = document.querySelector(".games-list-cover") as HTMLElement;
    expect(tvCoverIdentityFrom(gameCover)).toEqual({ kind: "game", id: "42" });
    const tagCover = document.querySelectorAll(".games-list-cover")[1] as HTMLElement;
    expect(tvCoverIdentityFrom(tagCover)).toEqual({ kind: "tag", id: "action" });
    const colCover = document.querySelectorAll(".games-list-cover")[2] as HTMLElement;
    expect(tvCoverIdentityFrom(colCover)).toEqual({ kind: "collection", id: "c9" });
  });

  it("pushes and pops a cover focus stack", () => {
    document.body.innerHTML = `
      <div data-mhg-tag-id="rpg"><button class="games-list-cover" role="button" id="tag"></button></div>
      <div data-mhg-game-id="7"><button class="games-list-cover" role="button" id="game"></button></div>
    `;
    pushTvCoverFocusIdentity(document.getElementById("tag"));
    pushTvCoverFocusIdentity(document.getElementById("game"));
    expect(peekTvCoverFocusIdentity()).toEqual({ kind: "game", id: "7" });
    expect(popTvCoverFocusIdentity()).toEqual({ kind: "game", id: "7" });
    expect(peekTvCoverFocusIdentity()).toEqual({ kind: "tag", id: "rpg" });
    expect(sessionStorage.getItem(TV_COVER_FOCUS_STORAGE_KEY)).toContain("rpg");
  });

  it("pushes identity by id without a DOM node", () => {
    pushTvCoverFocusId("game", 42);
    expect(peekTvCoverFocusIdentity()).toEqual({ kind: "game", id: "42" });
    pushTvCoverFocusId("game", "42");
    expect(peekTvCoverFocusIdentity()).toEqual({ kind: "game", id: "42" });
  });

  it("finds a remounted cover by identity", () => {
    document.body.innerHTML = `
      <div data-mhg-game-id="99"><button class="games-list-cover" role="button" id="c"></button></div>
    `;
    const found = findCoverByTvFocusIdentity({ kind: "game", id: "99" });
    expect(found?.id).toBe("c");
  });

  it("finds cover without role/tabindex fallback", () => {
    document.body.innerHTML = `
      <div data-mhg-collection-id="col1"><div class="games-list-cover" id="bare"></div></div>
    `;
    expect(findCoverByTvFocusIdentity({ kind: "collection", id: "col1" })?.id).toBe(
      "bare",
    );
  });

  it("matches selected fixed-focal host to identity", () => {
    document.body.innerHTML = `
      <div class="mhg-cover-scale-selected" data-mhg-game-id="55">
        <div class="games-list-cover" role="button" id="sel"></div>
      </div>
    `;
    expect(
      findSelectedCoverMatchingIdentity({ kind: "game", id: "55" })?.id,
    ).toBe("sel");
    expect(findSelectedCoverMatchingIdentity({ kind: "game", id: "other" })).toBeNull();
  });

  it("resolves identity from child when selected is the fixed-focal wrapper", () => {
    document.body.innerHTML = `
      <div class="fixed-focal-games-item mhg-cover-scale-selected">
        <div data-mhg-game-id="88">
          <div class="games-list-cover" role="button" id="inner"></div>
        </div>
      </div>
    `;
    expect(tvCoverIdentityFrom(resolveCoverElForTvFocusPush())).toEqual({
      kind: "game",
      id: "88",
    });
    expect(findSelectedCoverMatchingIdentity({ kind: "game", id: "88" })?.id).toBe(
      "inner",
    );
  });

  it("resolves push target from selected fixed-focal tile", () => {
    document.body.innerHTML = `
      <div class="mhg-cover-scale-selected" data-mhg-collection-id="c1">
        <div class="games-list-cover" role="button"></div>
      </div>
    `;
    const el = resolveCoverElForTvFocusPush();
    expect(tvCoverIdentityFrom(el)).toEqual({ kind: "collection", id: "c1" });
  });

  it("detects pending virtualized list fade", () => {
    expect(isTvCoverListFadePending()).toBe(false);
    document.body.innerHTML = `<div class="virtualized-list-fade"></div>`;
    expect(isTvCoverListFadePending()).toBe(true);
    document.body.innerHTML = `<div class="virtualized-list-fade virtualized-list-fade--ready"></div>`;
    expect(isTvCoverListFadePending()).toBe(false);
  });
});
