import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  findCoverByTvFocusIdentity,
  peekTvCoverFocusIdentity,
  popTvCoverFocusIdentity,
  pushTvCoverFocusIdentity,
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

  it("finds a remounted cover by identity", () => {
    document.body.innerHTML = `
      <div data-mhg-game-id="99"><button class="games-list-cover" role="button" id="c"></button></div>
    `;
    const found = findCoverByTvFocusIdentity({ kind: "game", id: "99" });
    expect(found?.id).toBe("c");
  });
});
