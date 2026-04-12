/**
 * Plex skin — concatenated CSS for runtime injection (swap with custom uploads).
 * Source files live in this folder tree; keep order stable (globals → app → shared → rest).
 */

import css_0_base_globals_css from "./base/globals.css?raw";
import css_1_app_App_css from "./app/App.css?raw";
import css_2_components_common_virtualized_common_css from "./components/common/virtualized-common.css?raw";
import css_3_components_collections_EditCollectionLikeModal_css from "./components/collections/EditCollectionLikeModal.css?raw";
import css_4_components_common_AddGame_css from "./components/common/AddGame.css?raw";
import css_5_components_common_BackgroundManager_css from "./components/common/BackgroundManager.css?raw";
import css_6_components_common_DropdownMenu_css from "./components/common/DropdownMenu.css?raw";
import css_7_components_common_InlineTagList_css from "./components/common/InlineTagList.css?raw";
import css_8_components_common_LaunchModal_css from "./components/common/LaunchModal.css?raw";
import css_9_components_common_ScrollableGamesSection_css from "./components/common/ScrollableGamesSection.css?raw";
import css_10_components_common_ScrollableGamesSectionNav_css from "./components/common/ScrollableGamesSectionNav.css?raw";
import css_11_components_common_StarRating_css from "./components/common/StarRating.css?raw";
import css_12_components_common_Summary_css from "./components/common/Summary.css?raw";
import css_13_components_common_TagEditor_css from "./components/common/TagEditor.css?raw";
import css_14_components_common_Tooltip_css from "./components/common/Tooltip.css?raw";
import css_15_components_filters_FilterPopup_css from "./components/filters/FilterPopup.css?raw";
import css_16_components_games_AddToCollectionDropdown_css from "./components/games/AddToCollectionDropdown.css?raw";
import css_17_components_games_AddToCollectionModal_css from "./components/games/AddToCollectionModal.css?raw";
import css_18_components_games_AdditionalExecutablesDropdown_css from "./components/games/AdditionalExecutablesDropdown.css?raw";
import css_19_components_games_AgeRatings_css from "./components/games/AgeRatings.css?raw";
import css_20_components_games_Cover_css from "./components/games/Cover.css?raw";
import css_21_components_games_EditGameModal_css from "./components/games/EditGameModal.css?raw";
import css_22_components_games_GameDetail_css from "./components/games/GameDetail.css?raw";
import css_23_components_games_GameInfoBlock_css from "./components/games/GameInfoBlock.css?raw";
import css_24_components_games_GameSearchModal_css from "./components/games/GameSearchModal.css?raw";
import css_25_components_games_GamesList_css from "./components/games/GamesList.css?raw";
import css_26_components_games_GamesListDetail_css from "./components/games/GamesListDetail.css?raw";
import css_27_components_games_GamesListPageContent_css from "./components/games/GamesListPageContent.css?raw";
import css_28_components_games_GamesListTable_css from "./components/games/GamesListTable.css?raw";
import css_29_components_games_GamesListToolbar_css from "./components/games/GamesListToolbar.css?raw";
import css_30_components_games_ManageInstallationModal_css from "./components/games/ManageInstallationModal.css?raw";
import css_31_components_games_MediaGallery_css from "./components/games/MediaGallery.css?raw";
import css_32_components_games_SimilarGamesList_css from "./components/games/SimilarGamesList.css?raw";
import css_33_components_games_TableRow_css from "./components/games/TableRow.css?raw";
import css_34_components_games_VirtualizedGamesList_css from "./components/games/VirtualizedGamesList.css?raw";
import css_35_components_games_VirtualizedGamesListDetail_css from "./components/games/VirtualizedGamesListDetail.css?raw";
import css_36_components_games_VirtualizedGamesListTable_css from "./components/games/VirtualizedGamesListTable.css?raw";
import css_37_components_games_WebsitesList_css from "./components/games/WebsitesList.css?raw";
import css_38_components_games_edit_EditGameMediaTab_css from "./components/games/edit/EditGameMediaTab.css?raw";
import css_39_components_games_edit_FranchiseSeriesEditor_css from "./components/games/edit/FranchiseSeriesEditor.css?raw";
import css_40_components_layout_LibrariesBar_css from "./components/layout/LibrariesBar.css?raw";
import css_41_components_layout_ProfileDropdown_css from "./components/layout/ProfileDropdown.css?raw";
import css_42_components_layout_UpdateNotification_css from "./components/layout/UpdateNotification.css?raw";
import css_43_components_lists_CollectionsList_css from "./components/lists/CollectionsList.css?raw";
import css_44_components_lists_TagList_css from "./components/lists/TagList.css?raw";
import css_45_components_lists_VirtualizedCollectionsList_css from "./components/lists/VirtualizedCollectionsList.css?raw";
import css_46_components_search_SearchBar_css from "./components/search/SearchBar.css?raw";
import css_47_components_search_SearchResultsList_css from "./components/search/SearchResultsList.css?raw";
import css_48_components_tags_EditTagModal_css from "./components/tags/EditTagModal.css?raw";
import css_49_components_toolbar_SortPopup_css from "./components/toolbar/SortPopup.css?raw";
import css_50_components_ui_AlphabetNavigator_css from "./components/ui/AlphabetNavigator.css?raw";
import css_51_components_ui_BackgroundToggle_css from "./components/ui/BackgroundToggle.css?raw";
import css_52_components_ui_CoverSizeSlider_css from "./components/ui/CoverSizeSlider.css?raw";
import css_53_components_ui_MainGamesToggle_css from "./components/ui/MainGamesToggle.css?raw";
import css_54_components_ui_NewGamesToggle_css from "./components/ui/NewGamesToggle.css?raw";
import css_55_components_ui_ViewModeSelector_css from "./components/ui/ViewModeSelector.css?raw";
import css_56_pages_AddGamePage_css from "./pages/AddGamePage.css?raw";
import css_57_pages_HomePage_css from "./pages/HomePage.css?raw";
import css_58_pages_IGDBGameDetailPage_css from "./pages/IGDBGameDetailPage.css?raw";
import css_59_pages_LibraryItemDetail_css from "./pages/LibraryItemDetail.css?raw";
import css_60_pages_LoginPage_css from "./pages/LoginPage.css?raw";
import css_61_pages_ProfilePage_css from "./pages/ProfilePage.css?raw";
import css_62_pages_SearchResultsPage_css from "./pages/SearchResultsPage.css?raw";
import css_63_pages_SettingsPage_css from "./pages/SettingsPage.css?raw";

export const PLEX_SKIN_CSS = [
  css_0_base_globals_css,
  css_1_app_App_css,
  css_2_components_common_virtualized_common_css,
  css_3_components_collections_EditCollectionLikeModal_css,
  css_4_components_common_AddGame_css,
  css_5_components_common_BackgroundManager_css,
  css_6_components_common_DropdownMenu_css,
  css_7_components_common_InlineTagList_css,
  css_8_components_common_LaunchModal_css,
  css_9_components_common_ScrollableGamesSection_css,
  css_10_components_common_ScrollableGamesSectionNav_css,
  css_11_components_common_StarRating_css,
  css_12_components_common_Summary_css,
  css_13_components_common_TagEditor_css,
  css_14_components_common_Tooltip_css,
  css_15_components_filters_FilterPopup_css,
  css_16_components_games_AddToCollectionDropdown_css,
  css_17_components_games_AddToCollectionModal_css,
  css_18_components_games_AdditionalExecutablesDropdown_css,
  css_19_components_games_AgeRatings_css,
  css_20_components_games_Cover_css,
  css_21_components_games_EditGameModal_css,
  css_22_components_games_GameDetail_css,
  css_23_components_games_GameInfoBlock_css,
  css_24_components_games_GameSearchModal_css,
  css_25_components_games_GamesList_css,
  css_26_components_games_GamesListDetail_css,
  css_27_components_games_GamesListPageContent_css,
  css_28_components_games_GamesListTable_css,
  css_29_components_games_GamesListToolbar_css,
  css_30_components_games_ManageInstallationModal_css,
  css_31_components_games_MediaGallery_css,
  css_32_components_games_SimilarGamesList_css,
  css_33_components_games_TableRow_css,
  css_34_components_games_VirtualizedGamesList_css,
  css_35_components_games_VirtualizedGamesListDetail_css,
  css_36_components_games_VirtualizedGamesListTable_css,
  css_37_components_games_WebsitesList_css,
  css_38_components_games_edit_EditGameMediaTab_css,
  css_39_components_games_edit_FranchiseSeriesEditor_css,
  css_40_components_layout_LibrariesBar_css,
  css_41_components_layout_ProfileDropdown_css,
  css_42_components_layout_UpdateNotification_css,
  css_43_components_lists_CollectionsList_css,
  css_44_components_lists_TagList_css,
  css_45_components_lists_VirtualizedCollectionsList_css,
  css_46_components_search_SearchBar_css,
  css_47_components_search_SearchResultsList_css,
  css_48_components_tags_EditTagModal_css,
  css_49_components_toolbar_SortPopup_css,
  css_50_components_ui_AlphabetNavigator_css,
  css_51_components_ui_BackgroundToggle_css,
  css_52_components_ui_CoverSizeSlider_css,
  css_53_components_ui_MainGamesToggle_css,
  css_54_components_ui_NewGamesToggle_css,
  css_55_components_ui_ViewModeSelector_css,
  css_56_pages_AddGamePage_css,
  css_57_pages_HomePage_css,
  css_58_pages_IGDBGameDetailPage_css,
  css_59_pages_LibraryItemDetail_css,
  css_60_pages_LoginPage_css,
  css_61_pages_ProfilePage_css,
  css_62_pages_SearchResultsPage_css,
  css_63_pages_SettingsPage_css
].join("\n\n");
