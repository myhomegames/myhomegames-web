import { API_BASE, API_TOKEN } from "../../config";
import StarRating from "../common/StarRating";
import DropdownMenu from "../common/DropdownMenu";
import AddToCollectionDropdown from "./AddToCollectionDropdown";
import AdditionalExecutablesDropdown from "./AdditionalExecutablesDropdown";
import Tooltip from "../common/Tooltip";
import AgeRatings from "./AgeRatings";
import type { GameItem, CollectionItem } from "../../types";

type ColumnVisibility = {
  title: boolean;
  releaseDate: boolean;
  year: boolean;
  stars: boolean;
  criticRating: boolean;
  ageRating: boolean;
};

type TableRowProps = {
  game: GameItem;
  index: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  allCollections?: CollectionItem[];
  columnVisibility: ColumnVisibility;
  handleRatingChange: (gameId: string, newStars: number) => void;
  formatRating: (value: number | null | undefined) => string | null;
  formatGameDate: (game: GameItem, t: any, i18n: any) => string | null;
  t: any;
  i18n: any;
  editGame: any;
  /** When true, render as div (table-row/table-cell) for valid HTML inside virtualized list */
  useDiv?: boolean;
};

export default function TableRow({
  game,
  index,
  itemRefs,
  onGameClick,
  onPlay,
  onGameUpdate,
  onGameDelete,
  allCollections = [],
  columnVisibility,
  handleRatingChange,
  formatRating,
  formatGameDate,
  t,
  i18n,
  editGame,
  useDiv = false,
}: TableRowProps) {
  const isEven = index % 2 === 0;
  const rowClass = isEven ? "even-row" : "odd-row";
  const RowTag = useDiv ? "div" : "tr";
  const CellTag = useDiv ? "div" : "td";
  const rowStyle = useDiv ? { display: "table-row" as const } : undefined;
  const cellStyle = useDiv ? { display: "table-cell" as const } : undefined;
  
  // Determine the first visible column
  const firstVisibleColumn = columnVisibility.title
    ? "title"
    : columnVisibility.releaseDate
    ? "releaseDate"
    : columnVisibility.stars
    ? "stars"
    : columnVisibility.year
    ? "year"
    : columnVisibility.criticRating
    ? "criticRating"
    : columnVisibility.ageRating
    ? "ageRating"
    : null;

  const PlayIcon = () => {
    // Only show play button if game has executables
    if (!game.executables || game.executables.length === 0) {
      return null;
    }

    const handlePlayClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onPlay) {
        onPlay(game);
      }
    };

    return (
      <button 
        className="first-cell-play-button" 
        aria-label="Play game"
        onClick={handlePlayClick}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 5v14l11-7z"
            fill="currentColor"
          />
        </svg>
      </button>
    );
  };

  return (
    <RowTag
      key={game.id}
      ref={(el) => {
        if (el && itemRefs?.current) {
          itemRefs.current.set(game.id, el as HTMLElement);
        }
      }}
      style={rowStyle}
      role={useDiv ? "row" : undefined}
    >
      <CellTag className="column-menu-cell" style={cellStyle} role={useDiv ? "cell" : undefined}></CellTag>
      {columnVisibility.title && (
        <CellTag className={`title-cell ${rowClass} ${firstVisibleColumn === "title" ? "first-visible-cell" : ""}`} style={cellStyle} role={useDiv ? "cell" : undefined}>
          {firstVisibleColumn === "title" && onPlay && <PlayIcon />}
          <Tooltip text={game.title} delay={1000}>
            <span 
              className={firstVisibleColumn === "title" ? "first-cell-text" : "title-cell-text"}
              onClick={() => onGameClick(game)}
            >
              {game.title}
            </span>
          </Tooltip>
        </CellTag>
      )}
      {columnVisibility.releaseDate && (
        <CellTag
          className={`date-cell ${rowClass} ${
            columnVisibility.stars || columnVisibility.year || columnVisibility.criticRating
              ? "has-border-right"
              : ""
          } ${firstVisibleColumn === "releaseDate" ? "first-visible-cell" : ""}`}
          style={cellStyle}
          role={useDiv ? "cell" : undefined}
        >
          {firstVisibleColumn === "releaseDate" && onPlay && <PlayIcon />}
          <span className={firstVisibleColumn === "releaseDate" ? "first-cell-text" : ""}>
            {formatGameDate(game, t, i18n) || "-"}
          </span>
        </CellTag>
      )}
      {columnVisibility.stars && (
        <CellTag className={`stars-cell ${rowClass} ${firstVisibleColumn === "stars" ? "first-visible-cell" : ""}`} style={cellStyle} role={useDiv ? "cell" : undefined}>
          {firstVisibleColumn === "stars" && onPlay && <PlayIcon />}
          <div className={firstVisibleColumn === "stars" ? "first-cell-text" : ""} style={{ display: 'flex', alignItems: 'center' }}>
            <StarRating 
              rating={game.stars ? (game.stars / 10) * 5 : 0} 
              starSize={14} 
              gap={3} 
              color="rgba(255, 255, 255, 0.4)" 
              noStroke={true}
              readOnly={!API_BASE || !API_TOKEN}
              onRatingChange={API_BASE && API_TOKEN ? (newStars) => handleRatingChange(game.id, newStars) : undefined}
            />
          </div>
        </CellTag>
      )}
      {columnVisibility.year && (
        <CellTag className={`year-cell ${rowClass} has-border-right ${firstVisibleColumn === "year" ? "first-visible-cell" : ""}`} style={cellStyle} role={useDiv ? "cell" : undefined}>
          {firstVisibleColumn === "year" && onPlay && <PlayIcon />}
          <span className={firstVisibleColumn === "year" ? "first-cell-text" : ""}>
            {game.year || "-"}
          </span>
        </CellTag>
      )}
      {columnVisibility.criticRating && (
        <CellTag className={`critic-rating-cell ${rowClass} has-border-right ${firstVisibleColumn === "criticRating" ? "first-visible-cell" : ""}`} style={cellStyle} role={useDiv ? "cell" : undefined}>
          {firstVisibleColumn === "criticRating" && onPlay && <PlayIcon />}
          <div className={firstVisibleColumn === "criticRating" ? "first-cell-text" : ""} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {(() => {
              const criticRating = formatRating(game.criticratings);
              const userRating = formatRating(game.userratings);
              
              if (criticRating === null && userRating === null) {
                return <span>-</span>;
              }
              
              return (
                <>
                  {criticRating !== null && (
                    <Tooltip text={t("gameDetail.criticRating")}>
                      <div 
                        className="text-white" 
                        style={{ 
                          opacity: 0.8,
                          fontFamily: 'var(--font-body-2-font-family)',
                          fontSize: 'var(--font-body-2-font-size)',
                          lineHeight: 'var(--font-body-2-line-height)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#FFD700"
                          stroke="#FFA500"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        {criticRating}
                      </div>
                    </Tooltip>
                  )}
                  {userRating !== null && (
                    <Tooltip text={t("gameDetail.userRating")}>
                      <div 
                        className="text-white" 
                        style={{ 
                          opacity: 0.8,
                          fontFamily: 'var(--font-body-2-font-family)',
                          fontSize: 'var(--font-body-2-font-size)',
                          lineHeight: 'var(--font-body-2-line-height)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#4CAF50"
                          stroke="#2E7D32"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {userRating}
                      </div>
                    </Tooltip>
                  )}
                </>
              );
            })()}
          </div>
        </CellTag>
      )}
      {columnVisibility.ageRating && (
        <CellTag className={`age-rating-cell ${rowClass} has-border-right ${firstVisibleColumn === "ageRating" ? "first-visible-cell" : ""}`} style={cellStyle} role={useDiv ? "cell" : undefined}>
          {firstVisibleColumn === "ageRating" && onPlay && <PlayIcon />}
          <div className={firstVisibleColumn === "ageRating" ? "first-cell-text" : ""}>
            {game.ageRatings && game.ageRatings.length > 0 ? (
              <AgeRatings ageRatings={game.ageRatings} />
            ) : (
              <span>-</span>
            )}
          </div>
        </CellTag>
      )}
      <CellTag className={`games-table-edit-cell ${rowClass}`} style={cellStyle} role={useDiv ? "cell" : undefined}>
        <div className="games-table-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              editGame.openEditModal(game);
            }}
            className="games-table-edit-button"
            aria-label="Edit"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <AddToCollectionDropdown
            game={game}
            allCollections={allCollections}
          />
          {game.executables && game.executables.length > 1 && onPlay && (
            <AdditionalExecutablesDropdown
              gameId={game.id}
              gameExecutables={game.executables}
              onPlayExecutable={(executableName: string) => {
                if (onPlay) {
                  (onPlay as any)(game, executableName);
                }
              }}
            />
          )}
          <DropdownMenu
            gameId={game.id}
            gameTitle={game.title}
            gameExecutables={game.executables}
            onAddToCollection={() => {}}
            onGameDelete={onGameDelete ? (gameId: string) => {
              const deletedGame = game.id === gameId ? game : null;
              if (deletedGame) {
                onGameDelete(deletedGame);
              }
            } : undefined}
            onGameUpdate={onGameUpdate ? (updatedGame) => {
              if (updatedGame.id === game.id) {
                onGameUpdate(updatedGame);
              }
            } : undefined}
            className="games-table-dropdown-menu"
          />
        </div>
      </CellTag>
    </RowTag>
  );
}
