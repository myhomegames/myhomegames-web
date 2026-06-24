import { useState, useRef, useMemo, useLayoutEffect, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useDevelopers } from "../contexts/DevelopersContext";
import { useTitleFilterQuery } from "../contexts/TitleFilterContext";
import { useSkin } from "../contexts/SkinContext";
import CollectionsList from "../components/lists/CollectionsList";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import { compareTitles } from "../utils/stringUtils";
import { titleMatchesFilter } from "../utils/titleFilter";
import type { CollectionItem } from "../types";
import { buildCoverUrl } from "../utils/api";
import FocalSelectionBackgroundShell, {
  type FocalSelectionMedia,
} from "../components/common/FocalSelectionBackgroundShell";
import {
  buildCollectionIndexPeekSnapshot,
  captureIndexListLayoutAnchor,
  clearContextRailReturnSession,
  navigateWithContextRailPeek,
  resolveContextRailReturnPeek,
  resolveSnapshotSelectedIndex,
} from "../utils/contextRailIndexPeek";
import { useActivationLockUntilPointerMove } from "../hooks/useActivationLockUntilPointerMove";
import { isContextRailActivationLocked } from "../utils/contextRailActivationLock";

type DevelopersPageProps = {
  onPlay?: (game: import("../types").GameItem) => void;
  coverSize: number;
};

export default function DevelopersPage({ onPlay, coverSize }: DevelopersPageProps) {
  const { setLoading } = useLoading();
  const { developers, rootDevelopers, isLoading: developersLoading, updateDeveloper } = useDevelopers();
  const titleFilterQuery = useTitleFilterQuery();
  const { activeSkinWeb } = useSkin();
  const navigate = useNavigate();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const [sortAscending] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    setLoading(developersLoading || !isReady);
  }, [developersLoading, isReady, setLoading]);

  const fixedFocalCollections = activeSkinWeb.verticalCoverAlignment;
  const focalBackgroundEnabled =
    activeSkinWeb.autoShowBackgroundOnSelection && fixedFocalCollections;
  const [focalSelection, setFocalSelection] = useState<FocalSelectionMedia | null>(null);
  const handleFocalSelectionChange = useCallback((collection: CollectionItem | null) => {
    if (!collection) {
      setFocalSelection(null);
      return;
    }
    setFocalSelection({
      id: String(collection.id),
      background: collection.background,
    });
  }, []);
  useScrollRestoration(scrollContainerRef, "developers", !fixedFocalCollections);

  const sortedDevelopers = useMemo(() => {
    const unique = rootDevelopers.filter((d, i, self) =>
      i === self.findIndex((x) => String(x.id) === String(d.id))
    );
    const sorted = [...unique].sort((a, b) =>
      sortAscending ? compareTitles(a.title || "", b.title || "") : -compareTitles(a.title || "", b.title || "")
    );
    return sorted.filter((d) => titleMatchesFilter(d.title, titleFilterQuery));
  }, [rootDevelopers, sortAscending, titleFilterQuery]);

  const allDevelopersForCount = useMemo(() => {
    return developers.filter((d, i, self) =>
      i === self.findIndex((x) => String(x.id) === String(d.id))
    );
  }, [developers]);

  const contextRailPeekEnabled =
    fixedFocalCollections && activeSkinWeb.compactCollectionLikeDetail;

  const handleDeveloperActivate = useCallback(
    (developer: CollectionItem, index: number) => {
      if (isContextRailActivationLocked()) return;
      const path = `/developers/${developer.id}`;
      if (contextRailPeekEnabled) {
        navigateWithContextRailPeek(
          navigate,
          path,
          buildCollectionIndexPeekSnapshot(
            sortedDevelopers,
            index,
            coverSize,
            "developers",
            captureIndexListLayoutAnchor(scrollContainerRef.current),
          ),
          "developers",
        );
        return;
      }
      navigate(path);
    },
    [contextRailPeekEnabled, sortedDevelopers, navigate, coverSize],
  );

  const contextRailReturnPeek = useMemo(() => {
    if (!contextRailPeekEnabled) return null;
    return resolveContextRailReturnPeek("developers", location.state);
  }, [contextRailPeekEnabled, location.state]);

  const contextRailMotionReturn = contextRailReturnPeek != null;
  const activationLocked = useActivationLockUntilPointerMove(contextRailMotionReturn);

  const restoreSelectedIndex = useMemo(() => {
    if (!contextRailReturnPeek || sortedDevelopers.length === 0) return undefined;
    return resolveSnapshotSelectedIndex(sortedDevelopers, contextRailReturnPeek);
  }, [contextRailReturnPeek, sortedDevelopers]);

  useEffect(() => {
    if (contextRailReturnPeek) {
      clearContextRailReturnSession();
    }
  }, [contextRailReturnPeek]);

  function handleDeveloperClick(developer: CollectionItem) {
    const index = sortedDevelopers.findIndex(
      (entry) => String(entry.id) === String(developer.id),
    );
    handleDeveloperActivate(developer, index >= 0 ? index : 0);
  }

  useLayoutEffect(() => {
    if (developersLoading && sortedDevelopers.length === 0) setIsReady(false);
    else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsReady(true));
      });
    }
  }, [developersLoading, sortedDevelopers.length]);

  useEffect(() => {
    if (!fixedFocalCollections) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const pinOuterScroll = () => {
      if (el.scrollTop !== 0) el.scrollTop = 0;
    };
    pinOuterScroll();
    el.addEventListener("scroll", pinOuterScroll, { passive: true });
    return () => el.removeEventListener("scroll", pinOuterScroll);
  }, [fixedFocalCollections, isReady, sortedDevelopers.length]);

  return (
    <FocalSelectionBackgroundShell
      enabled={focalBackgroundEnabled}
      selection={focalSelection}
    >
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
        <div
          className={`home-page-content-wrapper home-page-fade-in${isReady ? " home-page-fade-in--ready" : ""}${contextRailMotionReturn ? " mhg-context-rail-motion-return" : ""}`}
        >
          <div ref={scrollContainerRef} className="home-page-scroll-container">
            <CollectionsList
              collections={sortedDevelopers}
              allItemsForCount={allDevelopersForCount}
              onCollectionClick={handleDeveloperClick}
              onCollectionActivate={contextRailPeekEnabled ? handleDeveloperActivate : undefined}
              onPlay={onPlay}
              isLoading={developersLoading}
              showEdit={true}
              gamesPath="developers"
                onCollectionUpdate={(updated) => updateDeveloper({ ...updated, gameCount: developers.find((d) => String(d.id) === String(updated.id))?.gameCount })}
                buildCoverUrl={buildCoverUrl}
                coverSize={coverSize}
                itemRefs={itemRefs}
                scrollContainerRef={scrollContainerRef}
                onFocalSelectionChange={
                  focalBackgroundEnabled ? handleFocalSelectionChange : undefined
                }
                restoreSelectedIndex={restoreSelectedIndex}
                activationLocked={activationLocked}
            />
          </div>
        </div>
        {isReady && !activeSkinWeb.disableAlphabetNavigator && !activeSkinWeb.verticalCoverAlignment && (
          <AlphabetNavigator
            games={sortedDevelopers as any}
            scrollContainerRef={scrollContainerRef}
            itemRefs={itemRefs}
            ascending={sortAscending}
            virtualizedGridRef={(scrollContainerRef.current as any)?.__virtualizedGridRef}
            viewMode="grid"
            coverSize={coverSize}
          />
        )}
      </div>
    </main>
    </FocalSelectionBackgroundShell>
  );
}
