import type { GameItem, IGDBGame } from "../types";
import type { TFunction } from "i18next";
import type { i18n as I18nType } from "i18next";

/**
 * Capitalizes the first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a game's release date according to locale
 * @param game - The game item with year, month, and day properties
 * @param t - Translation function from react-i18next
 * @param i18nInstance - i18n instance from react-i18next (optional, will try to get from t if not provided)
 * @returns Formatted date string or year only, or null if no date available
 */
export function formatGameDate(game: GameItem, t: TFunction, i18nInstance?: I18nType): string | null {
  if (game.year === null || game.year === undefined) {
    return null;
  }

  if (
    game.day !== null &&
    game.day !== undefined &&
    game.month !== null &&
    game.month !== undefined
  ) {
    const monthName = t(`months.${game.month}`, { defaultValue: game.month.toString() });
    // Try to get language from i18n instance, or from t.language, or default to 'en'
    const language = (i18nInstance?.language || (t as any).language || 'en') as string;
    
    // Japanese format: "1994年11月30日"
    if (language.startsWith('ja')) {
      return `${game.year}年${game.month}月${game.day}日`;
    }
    
    // Chinese format: "1994年11月30日"
    if (language.startsWith('zh')) {
      return `${game.year}年${game.month}月${game.day}日`;
    }
    
    // German format: "30. November 1994" (month is capitalized, day has period)
    if (language.startsWith('de')) {
      return `${game.day}. ${capitalize(monthName)} ${game.year}`;
    }
    
    // Spanish format: "30 de noviembre de 1994"
    if (language.startsWith('es')) {
      return `${game.day} de ${monthName} de ${game.year}`;
    }
    
    // Portuguese format: "30 de novembro de 1994"
    if (language.startsWith('pt')) {
      return `${game.day} de ${monthName} de ${game.year}`;
    }
    
    // Italian and French format: "30 novembre 1994" (month lowercase)
    if (language.startsWith('it') || language.startsWith('fr')) {
      return `${game.day} ${monthName} ${game.year}`;
    }
    
    // English format: "November 30, 1994" (month capitalized at the beginning)
    const capitalizedMonth = capitalize(monthName);
    return `${capitalizedMonth} ${game.day}, ${game.year}`;
  }

  return game.year.toString();
}

/**
 * Formats an IGDB game's release date according to locale
 * @param game - The IGDB game with releaseDateFull or releaseDate properties
 * @param t - Translation function from react-i18next
 * @param i18nInstance - i18n instance from react-i18next (optional, will try to get from t if not provided)
 * @returns Formatted date string or year only, or null if no date available
 */
export function formatIGDBGameDate(game: IGDBGame, t: TFunction, i18nInstance?: I18nType): string | null {
  if (game.releaseDateFull) {
    const { day, month, year } = game.releaseDateFull;
    if (day !== null && day !== undefined && month !== null && month !== undefined) {
      const monthName = t(`months.${month}`, { defaultValue: month.toString() });
      // Try to get language from i18n instance, or from t.language, or default to 'en'
      const language = (i18nInstance?.language || (t as any).language || 'en') as string;
      
      // Japanese format: "1994年11月30日"
      if (language.startsWith('ja')) {
        return `${year}年${month}月${day}日`;
      }
      
      // Chinese format: "1994年11月30日"
      if (language.startsWith('zh')) {
        return `${year}年${month}月${day}日`;
      }
      
      // German format: "30. November 1994" (month is capitalized, day has period)
      if (language.startsWith('de')) {
        return `${day}. ${capitalize(monthName)} ${year}`;
      }
      
      // Spanish format: "30 de noviembre de 1994"
      if (language.startsWith('es')) {
        return `${day} de ${monthName} de ${year}`;
      }
      
      // Portuguese format: "30 de novembro de 1994"
      if (language.startsWith('pt')) {
        return `${day} de ${monthName} de ${year}`;
      }
      
      // Italian and French format: "30 novembre 1994" (month lowercase)
      if (language.startsWith('it') || language.startsWith('fr')) {
        return `${day} ${monthName} ${year}`;
      }
      
      // English format: "November 30, 1994" (month capitalized at the beginning)
      const capitalizedMonth = capitalize(monthName);
      return `${capitalizedMonth} ${day}, ${year}`;
    }
    if (year !== null && year !== undefined) {
      return year.toString();
    }
  }
  
  if (game.releaseDate) {
    // If only timestamp is available, try to extract year
    const date = new Date(game.releaseDate * 1000);
    if (!isNaN(date.getTime())) {
      return date.getFullYear().toString();
    }
  }
  
  return null;
}

