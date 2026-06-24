import { useState, useEffect, useCallback, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useParams, useSearchParams, useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLoading } from "../contexts/LoadingContext";
import { useSkin } from "../contexts/SkinContext";
import { useSettings } from "../contexts/SettingsContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import { useTagLists } from "../contexts/TagListsContext";
import { useGamesListPage, sortGamesList } from "../hooks/useGamesListPage";
import { useCatalogGamesForSeriesFranchise } from "../hooks/useCatalogGamesForSeriesFranchise";
import { useCatalogGamesForTag, type CatalogTagKey } from "../hooks/useCatalogGamesForTag";
import GamesListPageContent from "../components/games/GamesListPageContent";
import Cover from "../components/games/Cover";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import LibrariesBar from "../components/layout/LibrariesBar";
import MainGamesToggle from "../components/ui/MainGamesToggle";
import NewGamesToggle from "../components/ui/NewGamesToggle";
import type { ViewMode } from "../types";
import type { GameItem, CollectionItem } from "../types";
import type { FilterField } from "../components/filters/types";
import { TAG_PAGE_CONFIGS, type TagKey } from "../utils/tagPages";
import { resolveTagDisplayLabel } from "../utils/resolveTagDisplayLabel";
import { navigateToLibraryRoot } from "../utils/libraryNavigation";
import {
  CONTEXT_RAIL_COVER_VIEW_TRANSITION,
  CONTEXT_RAIL_LIBRARY_VIEW_TRANSITION,
  contextRailViewTransitionsEnabled,
  readContextRailNavState,
} from "../utils/contextRailIndexPeek";
import ContextRailIndexPeek from "../components/contextRail/ContextRailIndexPeek";
import type { MainAppOutletContext } from "../layouts/MainAppLayout";
import { API_BASE } from "../config";
import { buildApiHeaders, buildApiUrl, buildCoverUrl } from "../utils/api";
import { isMainGameType } from "../utils/gameType";

type TagGamesPageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  allCollections?: CollectionItem[];
  tagField: FilterField;
  paramName: string;
  storageKey: string;
  tagKey?: TagKey;
  onCatalogGameClick?: (gameId: number) => void;
};

export default function TagGamesPage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  allCollections = [],
  tagField,
  paramName,
  storageKey,
  tagKey,
  onCatalogGameClick,
}: TagGamesPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const contextRailNavState = readContextRailNavState(location.state);
  const indexPeekSnapshot = contextRailNavState?.contextRailIndexPeek;
  const contextRailMotionEnter = contextRailNavState?.contextRailMotion === true;
  const outletContext = useOutletContext<MainAppOutletContext | null>();
  const { activeSkinWeb } = useSkin();
  const tagConfig = tagKey ? TAG_PAGE_CONFIGS[tagKey] : undefined;
  const { games: libraryGames } = useLibraryGames();
  const { catalogSearchEnabled } = useSettings();
  const { tagLabels } = useTagLists();
  const [searchParams] = useSearchParams();
  const { isLoading, setLoading } = useLoading();
  const params = useParams<Record<string, string>>();
  const rawParam = params[paramName];
  const tagValue = useMemo(
    () => (rawParam ? decodeURIComponent(rawParam) : null),
    [rawParam]
  );
  const contextRailLayout =
    !!tagValue &&
    !!tagKey &&
    activeSkinWeb.compactCollectionLikeDetail &&
    activeSkinWeb.verticalCoverAlignment;
  const contextRailViewTransitions = contextRailViewTransitionsEnabled(activeSkinWeb);
  const scopedStorageKey = useMemo(
    () => `${storageKey}_${tagValue ?? "__all__"}`,
    [storageKey, tagValue]
  );
  const libraryGameIds = useMemo(
    () => libraryGames.map((g) => (typeof g.id === "number" ? g.id : parseInt(String(g.id), 10))).filter((id) => !Number.isNaN(id)),
    [libraryGames]
  );

  const isSeriesOrFranchise = tagKey === "series" || tagKey === "franchise";
  const isCatalogTag = tagKey === "themes" || tagKey === "platforms" || tagKey === "gameModes" || tagKey === "playerPerspectives" || tagKey === "gameEngines" || tagKey === "developers" || tagKey === "publishers" || tagKey === "categories";
  const tagNameFromUrl = searchParams.get("name");
  const tagNameFromLabels = useMemo(() => {
    if (!tagValue || !tagKey || !isCatalogTag) return null;
    const key = tagKey as keyof typeof tagLabels;
    const map = tagLabels[key];
    return map && typeof map.get === "function" ? map.get(tagValue) ?? null : null;
  }, [tagValue, tagKey, isCatalogTag, tagLabels]);
  const catalogTagNameForFetch = tagNameFromUrl ?? tagNameFromLabels ?? undefined;

  const usePersistentShell = activeSkinWeb.persistentLibraryShell;
  const [localViewMode, setLocalViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(`viewMode_${scopedStorageKey}`);
    return (saved as ViewMode) || "grid";
  });
  const viewMode =
    usePersistentShell && outletContext ? outletContext.viewMode : localViewMode;
  const [showNewGames, setShowNewGames] = useState<boolean>(() => {
    const saved = localStorage.getItem(`showNewGames_${scopedStorageKey}`);
    if (saved === "false") return false;
    if (saved === "true") return true;
    return false;
  });
  const [mainGamesOnly, setMainGamesOnly] = useState<boolean>(() => {
    return localStorage.getItem(`mainGamesOnly_${scopedStorageKey}`) === "true";
  });
  const coverSizeFromOutlet = outletContext?.coverSize;
  const [localCoverSize] = useState(() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  });
  const coverSize =
    usePersistentShell && coverSizeFromOutlet != null ? coverSizeFromOutlet : localCoverSize;

  const hook = useGamesListPage({
    localStoragePrefix: `tag_${scopedStorageKey}`,
    defaultFilterField: tagField,
    listenToGameDeleted: true,
    gameEvents: ["gameUpdated", "gameDeleted"],
    scrollRestorationMode: viewMode === "table" ? undefined : viewMode,
    mainGamesOnly,
    setMainGamesOnly,
  });

  useEffect(() => {
    if (usePersistentShell) return;
    localStorage.setItem(`viewMode_${scopedStorageKey}`, localViewMode);
  }, [localViewMode, scopedStorageKey, usePersistentShell]);

  useEffect(() => {
    if (usePersistentShell) return;
    localStorage.setItem(`showNewGames_${scopedStorageKey}`, String(showNewGames));
  }, [showNewGames, scopedStorageKey, usePersistentShell]);

  useEffect(() => {
    if (usePersistentShell) return;
    localStorage.setItem(`mainGamesOnly_${scopedStorageKey}`, String(mainGamesOnly));
  }, [mainGamesOnly, scopedStorageKey, usePersistentShell]);

  useEffect(() => {
    if (usePersistentShell) return;
    const savedViewMode = localStorage.getItem(`viewMode_${scopedStorageKey}`);
    setLocalViewMode((savedViewMode as ViewMode) || "grid");

    const savedNewGames = localStorage.getItem(`showNewGames_${scopedStorageKey}`);
    if (savedNewGames === "true") setShowNewGames(true);
    else if (savedNewGames === "false") setShowNewGames(false);
    else setShowNewGames(false);

    setMainGamesOnly(localStorage.getItem(`mainGamesOnly_${scopedStorageKey}`) === "true");
  }, [scopedStorageKey, usePersistentShell]);

  const EFFECTIVE_TAG_FIELDS: FilterField[] = ["themes", "platforms", "gameModes", "playerPerspectives", "gameEngines", "developers", "publishers", "series", "franchise"];
  const effectiveTagKey = hook.filterField !== "all" && EFFECTIVE_TAG_FIELDS.includes(hook.filterField) ? hook.filterField : null;
  const effectiveTagValue = useMemo(() => {
    if (!effectiveTagKey) return null;
    switch (effectiveTagKey) {
      case "themes": return hook.selectedThemes;
      case "platforms": return hook.selectedPlatforms;
      case "gameModes": return hook.selectedGameModes;
      case "playerPerspectives": return hook.selectedPlayerPerspectives;
      case "gameEngines": return hook.selectedGameEngines;
      case "developers": return hook.selectedDevelopers;
      case "publishers": return hook.selectedPublishers;
      case "series": return hook.selectedSeries;
      case "franchise": return hook.selectedFranchise;
      default: return null;
    }
  }, [effectiveTagKey, hook.selectedThemes, hook.selectedPlatforms, hook.selectedGameModes, hook.selectedPlayerPerspectives, hook.selectedGameEngines, hook.selectedDevelopers, hook.selectedPublishers, hook.selectedSeries, hook.selectedFranchise]);
  const effectiveTagValueResolved = effectiveTagValue ?? (effectiveTagKey === tagField ? tagValue : null);
  const isEffectiveSeriesOrFranchise = effectiveTagKey === "series" || effectiveTagKey === "franchise";
  const isEffectiveCatalogTag = effectiveTagKey !== null && effectiveTagKey !== "series" && effectiveTagKey !== "franchise";
  const effectiveTagNameForFetch = useMemo(() => {
    if (!effectiveTagKey || !effectiveTagValueResolved || !isEffectiveCatalogTag) return undefined;
    const key = effectiveTagKey as keyof typeof tagLabels;
    const map = tagLabels[key];
    return map && typeof map.get === "function" ? map.get(String(effectiveTagValueResolved)) ?? undefined : undefined;
  }, [effectiveTagKey, effectiveTagValueResolved, isEffectiveCatalogTag, tagLabels]);

  const { catalogGames, loading: catalogLoading } = useCatalogGamesForSeriesFranchise(
    isEffectiveSeriesOrFranchise && catalogSearchEnabled ? effectiveTagKey as "series" | "franchise" : null,
    effectiveTagValueResolved,
    libraryGameIds,
    true
  );
  const { catalogGames: catalogTagGames, loading: catalogTagLoading, tagName: catalogTagName } = useCatalogGamesForTag(
    isEffectiveCatalogTag && catalogSearchEnabled ? (effectiveTagKey as CatalogTagKey) : null,
    effectiveTagValueResolved,
    libraryGameIds,
    true,
    effectiveTagNameForFetch ?? (effectiveTagKey === tagKey ? catalogTagNameForFetch : undefined)
  );

  const mergedGamesForSeriesFranchise = useMemo(() => {
    if (!isEffectiveSeriesOrFranchise || !catalogSearchEnabled) return null;
    const libraryGamesInSeries = hook.filteredAndSortedGames;
    const libraryById = new Map(libraryGamesInSeries.map((g) => [String(g.id), g]));
    const seenIds = new Set<string>();
    const merged: GameItem[] = [];
    for (const ig of catalogGames) {
      seenIds.add(String(ig.id));
      const lib = libraryById.get(String(ig.id));
      if (lib) {
        merged.push(lib);
      } else {
        merged.push({
          id: String(ig.id),
          title: ig.name,
          cover: ig.cover || undefined,
          year: ig.releaseDate ?? undefined,
          isCatalogOnly: true,
        });
      }
    }
    for (const lib of libraryGamesInSeries) {
      if (!seenIds.has(String(lib.id))) {
        merged.push(lib);
      }
    }
    return sortGamesList(merged, hook.sortField, hook.sortAscending);
  }, [isEffectiveSeriesOrFranchise, catalogSearchEnabled, hook.filteredAndSortedGames, catalogGames, hook.sortField, hook.sortAscending]);

  const mergedGamesForCatalogTag = useMemo(() => {
    if (!isEffectiveCatalogTag || !catalogSearchEnabled) return null;
    const libraryGamesFiltered = hook.filteredAndSortedGames;
    const libraryById = new Map(libraryGamesFiltered.map((g) => [String(g.id), g]));
    const seenIds = new Set<string>();
    const merged: GameItem[] = [];
    for (const ig of catalogTagGames) {
      seenIds.add(String(ig.id));
      const lib = libraryById.get(String(ig.id));
      if (lib) {
        merged.push(lib);
      } else {
        merged.push({
          id: String(ig.id),
          title: ig.name,
          cover: ig.cover || undefined,
          year: ig.releaseDate ?? undefined,
          isCatalogOnly: true,
        });
      }
    }
    for (const lib of libraryGamesFiltered) {
      if (!seenIds.has(String(lib.id))) {
        merged.push(lib);
      }
    }
    return sortGamesList(merged, hook.sortField, hook.sortAscending);
  }, [isEffectiveCatalogTag, catalogSearchEnabled, hook.filteredAndSortedGames, catalogTagGames, hook.sortField, hook.sortAscending]);

  const mergedGamesOverride = mergedGamesForSeriesFranchise ?? mergedGamesForCatalogTag;
  const selectedValueMatchesTag = useMemo(() => {
    if (!tagValue) return false;
    const normalized = String(tagValue);
    switch (tagField) {
      case "themes": return hook.selectedThemes != null && String(hook.selectedThemes) === normalized;
      case "platforms": return hook.selectedPlatforms != null && String(hook.selectedPlatforms) === normalized;
      case "gameModes": return hook.selectedGameModes != null && String(hook.selectedGameModes) === normalized;
      case "playerPerspectives": return hook.selectedPlayerPerspectives != null && String(hook.selectedPlayerPerspectives) === normalized;
      case "gameEngines": return hook.selectedGameEngines != null && String(hook.selectedGameEngines) === normalized;
      case "developers": return hook.selectedDevelopers != null && String(hook.selectedDevelopers) === normalized;
      case "publishers": return hook.selectedPublishers != null && String(hook.selectedPublishers) === normalized;
      case "genre": return hook.selectedGenre != null && String(hook.selectedGenre) === normalized;
      case "series": return hook.selectedSeries != null && String(hook.selectedSeries) === normalized;
      case "franchise": return hook.selectedFranchise != null && String(hook.selectedFranchise) === normalized;
      default: return true;
    }
  }, [tagField, tagValue, hook.selectedThemes, hook.selectedPlatforms, hook.selectedGameModes, hook.selectedPlayerPerspectives, hook.selectedGameEngines, hook.selectedDevelopers, hook.selectedPublishers, hook.selectedGenre, hook.selectedSeries, hook.selectedFranchise]);
  const canShowNewGamesToggle =
    (isSeriesOrFranchise || isCatalogTag) && !!catalogSearchEnabled && hook.filterField !== "all";
  const usePersistentTopBarTagToggles = usePersistentShell;
  const injectedTopBarTagToggles: ReactNode = useMemo(() => {
    if (!usePersistentTopBarTagToggles || viewMode !== "grid") return null;
    return (
      <>
        {canShowNewGamesToggle ? (
          <div className="library-item-detail-compact-top-action">
            <NewGamesToggle showNewGames={showNewGames} onChange={setShowNewGames} />
          </div>
        ) : null}
        <div className="library-item-detail-compact-top-action">
          <MainGamesToggle
            mainGamesOnly={hook.mainGamesOnly}
            onChange={hook.setMainGamesOnly}
          />
        </div>
      </>
    );
  }, [
    usePersistentTopBarTagToggles,
    viewMode,
    canShowNewGamesToggle,
    showNewGames,
    hook.mainGamesOnly,
    hook.setMainGamesOnly,
  ]);
  useEffect(() => {
    if (!usePersistentTopBarTagToggles) return;
    outletContext?.setTopBarBeforeMainGamesActions(injectedTopBarTagToggles);
    return () => outletContext?.setTopBarBeforeMainGamesActions(null);
  }, [usePersistentTopBarTagToggles, outletContext, injectedTopBarTagToggles]);
  const effectiveGamesOverride =
    canShowNewGamesToggle && showNewGames ? mergedGamesOverride : null;
  const gamesForList = useMemo(() => {
    const base = effectiveGamesOverride ?? hook.filteredAndSortedGames;
    if (!hook.mainGamesOnly) return base;
    return base.filter((g) => isMainGameType(g));
  }, [effectiveGamesOverride, hook.filteredAndSortedGames, hook.mainGamesOnly]);

  const { libraryGamesLoading, setFilterField, setSelectedThemes,
    setSelectedKeywords,
    setSelectedPlatforms,
    setSelectedGameModes,
    setSelectedPublishers,
    setSelectedDevelopers,
    setSelectedPlayerPerspectives,
    setSelectedGameEngines,
    setSelectedGenre,
    setSelectedSeries,
    setSelectedFranchise,
    setSortField,
    setSortAscending,
  } = hook;

  useEffect(() => {
    setLoading(libraryGamesLoading || hook.isFiltering);
  }, [libraryGamesLoading, hook.isFiltering, setLoading]);

  useEffect(() => {
    if (!tagValue) return;
    setFilterField(tagField);
    switch (tagField) {
      case "themes":
        setSelectedThemes(tagValue);
        break;
      case "keywords":
        setSelectedKeywords(tagValue);
        break;
      case "platforms":
        setSelectedPlatforms(tagValue);
        break;
      case "gameModes":
        setSelectedGameModes(tagValue);
        break;
      case "publishers":
        setSelectedPublishers(tagValue);
        break;
      case "developers":
        setSelectedDevelopers(tagValue);
        break;
      case "playerPerspectives":
        setSelectedPlayerPerspectives(tagValue);
        break;
      case "gameEngines":
        setSelectedGameEngines(tagValue);
        break;
      case "genre":
        setSelectedGenre(tagValue);
        break;
      case "series":
        setSelectedSeries(tagValue);
        setSortField("releaseDate");
        setSortAscending(true); /* true = ascending, oldest first (chronological) */
        break;
      case "franchise":
        setSelectedFranchise(tagValue);
        setSortField("releaseDate");
        setSortAscending(true); /* true = ascending, oldest first (chronological) */
        break;
      default:
        break;
    }
  }, [
    tagValue,
    tagField,
    setFilterField,
    setSelectedThemes,
    setSelectedKeywords,
    setSelectedPlatforms,
    setSelectedGameModes,
    setSelectedPublishers,
    setSelectedDevelopers,
    setSelectedPlayerPerspectives,
    setSelectedGameEngines,
    setSelectedGenre,
    setSelectedSeries,
    setSelectedFranchise,
    setSortField,
    setSortAscending,
  ]);

  const buildCoverUrlFn = useCallback(
    (apiBase: string, cover?: string, addTimestamp?: boolean) => {
      return buildCoverUrl(apiBase, cover, addTimestamp ?? true);
    },
    []
  );

  const handleGamesLoaded = useCallback(
    (games: GameItem[]) => {
      onGamesLoaded(games);
    },
    [onGamesLoaded]
  );

  const tagFilterLabel =
    isCatalogTag && selectedValueMatchesTag ? (catalogTagName ?? undefined) : undefined;

  const [tagListMeta, setTagListMeta] = useState<
    { cover?: string; title?: string } | undefined
  >(undefined);

  const tagDisplayTitle = useMemo(() => {
    if (!tagValue || !tagConfig) return "";
    return resolveTagDisplayLabel({
      tagKey,
      tagId: tagValue,
      preferredName:
        tagFilterLabel ?? tagNameFromUrl ?? tagListMeta?.title ?? tagNameFromLabels ?? undefined,
      tagLabels,
      t,
      getDisplayName: tagConfig.getDisplayName(t),
    });
  }, [
    tagValue,
    tagConfig,
    tagKey,
    tagFilterLabel,
    tagNameFromUrl,
    tagListMeta?.title,
    tagNameFromLabels,
    tagLabels,
    t,
  ]);

  useEffect(() => {
    if (!contextRailLayout || !tagValue || !tagConfig) {
      setTagListMeta(undefined);
      return;
    }
    const { listEndpoint, listResponseKey } = tagConfig.list;
    const endpoint = listEndpoint || tagConfig.list.routeBase;
    let isActive = true;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(buildApiUrl(API_BASE, endpoint), {
          headers: buildApiHeaders({ Accept: "application/json" }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        const rawItems = (json?.[listResponseKey] || []) as Array<{
          id: string | number;
          title?: string;
          cover?: string;
        }>;
        const match = rawItems.find((item) => String(item.id) === String(tagValue));
        if (isActive) {
          setTagListMeta(
            match ? { cover: match.cover, title: match.title } : undefined
          );
        }
      } catch {
        if (isActive) setTagListMeta(undefined);
      }
    })();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [contextRailLayout, tagValue, tagConfig]);

  const tagCoverUrl = useMemo(
    () => (tagListMeta?.cover ? buildCoverUrl(API_BASE, tagListMeta.cover) : ""),
    [tagListMeta?.cover],
  );

  const tagRailCoverWidth = coverSize;
  const tagRailCoverHeight = coverSize * (9 / 16);

  const gamesListContent = (
    <GamesListPageContent
      hook={hook}
      viewMode={viewMode}
      coverSize={coverSize}
      isLoading={isLoading || catalogLoading || catalogTagLoading}
      isReady={hook.isReady}
      allCollections={allCollections}
      onGameClick={onGameClick}
      onGamesLoaded={handleGamesLoaded}
      onPlay={onPlay}
      buildCoverUrlFn={buildCoverUrlFn}
      gamesOverride={effectiveGamesOverride}
      onCatalogGameClick={onCatalogGameClick}
      selectedFilterValueLabel={tagFilterLabel}
      contextRailGamesColumn={contextRailLayout}
      scrollContainerRef={contextRailLayout ? hook.scrollContainerRef : undefined}
      forceSingleColumnGrid={contextRailLayout}
      fixedFocalSelection={contextRailLayout}
    />
  );

  const alphabetNavigator =
    hook.sortField === "title" && hook.isReady && !activeSkinWeb.disableAlphabetNavigator ? (
      <AlphabetNavigator
        games={gamesForList}
        scrollContainerRef={
          viewMode === "table" ? hook.tableScrollRef : hook.scrollContainerRef
        }
        itemRefs={hook.itemRefs}
        ascending={hook.sortAscending}
        virtualizedGridRef={
          viewMode === "grid" && hook.scrollContainerRef.current
            ? (hook.scrollContainerRef.current as any).__virtualizedGridRef
            : undefined
        }
        virtualizedListRef={
          (viewMode === "detail" && hook.scrollContainerRef.current
            ? (hook.scrollContainerRef.current as any).__virtualizedListRef
            : undefined) ||
          (viewMode === "table" && hook.tableScrollRef.current
            ? (hook.scrollContainerRef.current as any).__virtualizedListRef
            : undefined)
        }
        viewMode={viewMode}
        coverSize={coverSize}
      />
    ) : null;

  return (
    <>
      {!usePersistentShell ? (
        <div
          className={
            contextRailLayout ? "tag-games-libraries-bar-host tag-games-libraries-bar-host--dock-only" : undefined
          }
        >
          <LibrariesBar
            libraries={[]}
            activeLibrary={null}
            onSelectLibrary={() => {}}
            loading={false}
            error={null}
            viewMode={viewMode}
            onViewModeChange={setLocalViewMode}
            showNewGamesToggle={canShowNewGamesToggle}
            showNewGames={showNewGames}
            onShowNewGamesChange={setShowNewGames}
            showNewGamesLabel={canShowNewGamesToggle ? t("tagGames.showNewGames") : undefined}
            showMainGamesToggle={viewMode === "grid"}
            mainGamesOnly={hook.mainGamesOnly}
            onMainGamesOnlyChange={hook.setMainGamesOnly}
          />
        </div>
      ) : null}
      <div
        className={`bg-[#1a1a1a] home-page-main-container tag-games-page-shell${contextRailLayout ? " tag-games-page-shell--context-rail" : ""}${contextRailMotionEnter ? " mhg-context-rail-motion-enter" : ""}`}
      >
        <main className="flex-1 home-page-content">
          <div className={`home-page-layout${contextRailLayout ? " tag-games-page-layout-min-h" : ""}`}>
            {contextRailLayout && tagKey ? (
              <div className="tag-games-context-layout">
                <aside className="tag-games-context-rail" aria-label={tagDisplayTitle}>
                  <button
                    type="button"
                    className="mhg-library-button mhg-library-active tag-games-context-rail-library"
                    data-mhg-library-key={tagKey}
                    style={
                      contextRailViewTransitions
                        ? { viewTransitionName: CONTEXT_RAIL_LIBRARY_VIEW_TRANSITION }
                        : undefined
                    }
                    onClick={() =>
                      navigateToLibraryRoot(navigate, tagKey, {
                        contextRailReturn: indexPeekSnapshot ?? undefined,
                      })
                    }
                  >
                    <span className="mhg-library-button-label">
                      {t(`libraries.${tagKey}`)}
                    </span>
                  </button>
                  <div
                    className="tag-games-context-rail-cover tag-list-item"
                    style={
                      {
                        position: "relative",
                        ["--tag-list-cover-size" as string]: `${coverSize}px`,
                        ...(contextRailViewTransitions
                          ? { viewTransitionName: CONTEXT_RAIL_COVER_VIEW_TRANSITION }
                          : {}),
                      } as CSSProperties
                    }
                  >
                    <Cover
                      title={tagDisplayTitle}
                      coverUrl={tagCoverUrl}
                      width={tagRailCoverWidth}
                      height={tagRailCoverHeight}
                      aspectRatio="16/9"
                      detail={true}
                      titlePosition="overlay"
                      showTitle={false}
                      showBorder={true}
                    />
                  </div>
                </aside>
                <div className="mhg-context-rail-bridge" aria-hidden="true" />
                {indexPeekSnapshot ? (
                  <ContextRailIndexPeek snapshot={indexPeekSnapshot} />
                ) : null}
                <div
                  ref={hook.scrollContainerRef}
                  className="tag-games-context-games"
                >
                  {gamesListContent}
                </div>
              </div>
            ) : (
              <>
                {gamesListContent}
                {alphabetNavigator}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
