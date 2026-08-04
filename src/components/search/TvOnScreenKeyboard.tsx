import { useTranslation } from "react-i18next";

type TvOnScreenKeyboardProps = {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSpace: () => void;
};

const ROWS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export default function TvOnScreenKeyboard({
  onChar,
  onBackspace,
  onClear,
  onSpace,
}: TvOnScreenKeyboardProps) {
  const { t } = useTranslation();

  return (
    <div
      className="tv-search-keyboard"
      role="group"
      aria-label={t("search.keyboard", "Keyboard")}
    >
      {ROWS.map((row) => (
        <div key={row.join("")} className="tv-search-keyboard-row">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              className="tv-search-keyboard-key"
              data-mhg-tv-focus
              onClick={() => onChar(key.toLowerCase())}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="tv-search-keyboard-row tv-search-keyboard-row--actions">
        <button
          type="button"
          className="tv-search-keyboard-key tv-search-keyboard-key--wide"
          data-mhg-tv-focus
          onClick={onBackspace}
          aria-label={t("search.backspace", "Backspace")}
        >
          ⌫
        </button>
        <button
          type="button"
          className="tv-search-keyboard-key tv-search-keyboard-key--space"
          data-mhg-tv-focus
          onClick={onSpace}
        >
          {t("search.space", "Space")}
        </button>
        <button
          type="button"
          className="tv-search-keyboard-key tv-search-keyboard-key--wide"
          data-mhg-tv-focus
          onClick={onClear}
          aria-label={t("search.clear", "Clear")}
        >
          {t("search.clear", "Clear")}
        </button>
      </div>
    </div>
  );
}
