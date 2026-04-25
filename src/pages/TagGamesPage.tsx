import { useState, useEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useParams, useSearchParams, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLoading } from "../contexts/LoadingContext";
import { useSkin } from "../contexts/SkinContext";
import { useSettings } from "../contexts/SettingsContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import { useTagLists } from "../contexts/TagListsContext";
import { useGamesListPage, sortGamesList } from "../hooks/useGamesListPage";
import { useIgdbGamesForSeriesFranchise } from "../hooks/useIgdbGamesForSeriesFranchise";
import { useIgdbGamesForTag, type IgdbTagKey } from "../hooks/useIgdbGamesForTag";
import GamesListPageContent from "../components/games/GamesListPageContent";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import LibrariesBar from "../components/layout/LibrariesBar";
import MainGamesToggle from "../components/ui/MainGamesToggle";
import NewGamesToggle from "../components/ui/NewGamesToggle";
import type { ViewMode } from "../types";
import type { GameItem, CollectionItem } from "../types";
import type { FilterField } from "../components/filters/types";
import type { TagKey } from "../utils/tagPages";
import type { MainAppOutletContext } from "../layouts/MainAppLayout";
import { buildCoverUrl } from "../utils/api";
import { isMainGameType } from "../utils/igdbGameType";

type TagGamesPageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  allCollections?: CollectionItem[];
  tagField: FilterField;
  paramName: string;
  storageKey: string;
  tagKey?: TagKey;
  onIgdbGameClick?: (igdbId: number) => void;
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
  onIgdbGameClick,
}: TagGamesPageProps) {
  const { t } = useTranslation();
  const outletContext = useOutletContext<MainAppOutletContext | null>();
  const { activeSkinWeb } = useSkin();
  const { games: libraryGames } = useLibraryGames();
  const { twitchLoginEnabled } = useSettings();
  const { tagLabels } = useTagLists();
  const [searchParams] = useSearchParams();
  const { isLoading, setLoading } = useLoading();
  const params = useParams<Record<string, string>>();
  const rawParam = params[paramName];
  const tagValue = useMemo(
    () => (rawParam ? decodeURIComponent(rawParam) : null),
    [rawParam]
  );
  const scopedStorageKey = useMemo(
    () => `${storageKey}_${tagValue ?? "__all__"}`,
    [storageKey, tagValue]
  );
  const libraryGameIds = useMemo(
    () => libraryGames.map((g) => (typeof g.id === "number" ? g.id : parseInt(String(g.id), 10))).filter((id) => !Number.isNaN(id)),
    [libraryGames]
  );

  const isSeriesOrFranchise = tagKey === "series" || tagKey === "franchise";
  const isIgdbTag = tagKey === "themes" || tagKey === "platforms" || tagKey === "gameModes" || tagKey === "playerPerspectives" || tagKey === "gameEngines" || tagKey === "developers" || tagKey === "publishers" || tagKey === "categories";
  const tagNameFromUrl = searchParams.get("name");
  const tagNameFromLabels = useMemo(() => {
    if (!tagValue || !tagKey || !isIgdbTag) return null;
    const key = tagKey as keyof typeof tagLabels;
    const map = tagLabels[key];
    return map && typeof map.get === "function" ? map.get(tagValue) ?? null : null;
  }, [tagValue, tagKey, isIgdbTag, tagLabels]);
  const igdbTagNameForFetch = tagNameFromUrl ?? tagNameFromLabels ?? undefined;

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(`viewMode_${scopedStorageKey}`);
    return (saved as ViewMode) || "grid";
  });
  const [showNewGames, setShowNewGames] = useState<boolean>(() => {
    const saved = localStorage.getItem(`showNewGames_${scopedStorageKey}`);
    if (saved === "false") return false;
    if (saved === "true") return true;
    return false;
  });
  const [mainGamesOnly, setMainGamesOnly] = useState<boolean>(() => {
    return localStorage.getItem(`mainGamesOnly_${scopedStorageKey}`) === "true";
  });
  const coverSize = (() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  })();

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
    localStorage.setItem(`viewMode_${scopedStorageKey}`, viewMode);
  }, [viewMode, scopedStorageKey]);

  useEffect(() => {
    localStorage.setItem(`showNewGames_${scopedStorageKey}`, String(showNewGames));
  }, [showNewGames, scopedStorageKey]);

  useEffect(() => {
    localStorage.setItem(`mainGamesOnly_${scopedStorageKey}`, String(mainGamesOnly));
  }, [mainGamesOnly, scopedStorageKey]);

  useEffect(() => {
    const savedViewMode = localStorage.getItem(`viewMode_${scopedStorageKey}`);
    setViewMode((savedViewMode as ViewMode) || "grid");

    const savedNewGames = localStorage.getItem(`showNewGames_${scopedStorageKey}`);
    if (savedNewGames === "true") setShowNewGames(true);
    else if (savedNewGames === "false") setShowNewGames(false);
    else setShowNewGames(false);

    setMainGamesOnly(localStorage.getItem(`mainGamesOnly_${scopedStorageKey}`) === "true");
  }, [scopedStorageKey]);

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
  const isEffectiveIgdbTag = effectiveTagKey !== null && effectiveTagKey !== "series" && effectiveTagKey !== "franchise";
  const effectiveTagNameForFetch = useMemo(() => {
    if (!effectiveTagKey || !effectiveTagValueResolved || !isEffectiveIgdbTag) return undefined;
    const key = effectiveTagKey as keyof typeof tagLabels;
    const map = tagLabels[key];
    return map && typeof map.get === "function" ? map.get(String(effectiveTagValueResolved)) ?? undefined : undefined;
  }, [effectiveTagKey, effectiveTagValueResolved, isEffectiveIgdbTag, tagLabels]);

  const { igdbGames, loading: igdbLoading } = useIgdbGamesForSeriesFranchise(
    isEffectiveSeriesOrFranchise && twitchLoginEnabled ? effectiveTagKey as "series" | "franchise" : null,
    effectiveTagValueResolved,
    libraryGameIds,
    true
  );
  const { igdbGames: igdbTagGames, loading: igdbTagLoading, tagName: igdbTagName } = useIgdbGamesForTag(
    isEffectiveIgdbTag && twitchLoginEnabled ? (effectiveTagKey as IgdbTagKey) : null,
    effectiveTagValueResolved,
    libraryGameIds,
    true,
    effectiveTagNameForFetch ?? (effectiveTagKey === tagKey ? igdbTagNameForFetch : undefined)
  );

  const mergedGamesForSeriesFranchise = useMemo(() => {
    if (!isEffectiveSeriesOrFranchise || !twitchLoginEnabled) return null;
    const libraryGamesInSeries = hook.filteredAndSortedGames;
    const libraryById = new Map(libraryGamesInSeries.map((g) => [String(g.id), g]));
    const seenIds = new Set<string>();
    const merged: GameItem[] = [];
    for (const ig of igdbGames) {
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
          isIgdbOnly: true,
        });
      }
    }
    for (const lib of libraryGamesInSeries) {
      if (!seenIds.has(String(lib.id))) {
        merged.push(lib);
      }
    }
    return sortGamesList(merged, hook.sortField, hook.sortAscending);
  }, [isEffectiveSeriesOrFranchise, twitchLoginEnabled, hook.filteredAndSortedGames, igdbGames, hook.sortField, hook.sortAscending]);

  const mergedGamesForIgdbTag = useMemo(() => {
    if (!isEffectiveIgdbTag || !twitchLoginEnabled) return null;
    const libraryGamesFiltered = hook.filteredAndSortedGames;
    const libraryById = new Map(libraryGamesFiltered.map((g) => [String(g.id), g]));
    const seenIds = new Set<string>();
    const merged: GameItem[] = [];
    for (const ig of igdbTagGames) {
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
          isIgdbOnly: true,
        });
      }
    }
    for (const lib of libraryGamesFiltered) {
      if (!seenIds.has(String(lib.id))) {
        merged.push(lib);
      }
    }
    return sortGamesList(merged, hook.sortField, hook.sortAscending);
  }, [isEffectiveIgdbTag, twitchLoginEnabled, hook.filteredAndSortedGames, igdbTagGames, hook.sortField, hook.sortAscending]);

  const mergedGamesOverride = mergedGamesForSeriesFranchise ?? mergedGamesForIgdbTag;
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
    (isSeriesOrFranchise || isIgdbTag) && !!twitchLoginEnabled && hook.filterField !== "all";
  const usePersistentTopBarTagToggles = activeSkinWeb.persistentLibraryShell;
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
    setLoading(libraryGamesLoading);
  }, [libraryGamesLoading, setLoading]);

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

  return (
    <>
      <LibrariesBar
        libraries={[]}
        activeLibrary={null}
        onSelectLibrary={() => {}}
        loading={false}
        error={null}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showNewGamesToggle={!usePersistentTopBarTagToggles && canShowNewGamesToggle}
        showNewGames={showNewGames}
        onShowNewGamesChange={setShowNewGames}
        showNewGamesLabel={canShowNewGamesToggle ? t("tagGames.showNewGames") : undefined}
        showMainGamesToggle={!usePersistentTopBarTagToggles && viewMode === "grid"}
        mainGamesOnly={hook.mainGamesOnly}
        onMainGamesOnlyChange={hook.setMainGamesOnly}
      />
      <div className="bg-[#1a1a1a] home-page-main-container">
        <main className="flex-1 home-page-content">
          <div className="home-page-layout">
            <GamesListPageContent
              hook={hook}
              viewMode={viewMode}
              coverSize={coverSize}
              isLoading={isLoading || igdbLoading || igdbTagLoading}
              isReady={hook.isReady}
              allCollections={allCollections}
              onGameClick={onGameClick}
              onGamesLoaded={handleGamesLoaded}
              onPlay={onPlay}
              buildCoverUrlFn={buildCoverUrlFn}
              gamesOverride={effectiveGamesOverride}
              onIgdbGameClick={onIgdbGameClick}
              selectedFilterValueLabel={isIgdbTag && selectedValueMatchesTag ? (igdbTagName ?? undefined) : undefined}
            />
            {hook.sortField === "title" && hook.isReady && !activeSkinWeb.disableAlphabetNavigator && (
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
                    ? (hook.tableScrollRef.current as any).__virtualizedListRef
                    : undefined)
                }
                viewMode={viewMode}
                coverSize={coverSize}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
}
