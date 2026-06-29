import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../config';
import { buildApiHeaders, buildApiUrl } from '../utils/api';

// Cache for resolved translations (key: `${text}-${targetLang}`)
const translationCache = new Map<string, string>();

// Queue translations sequentially to respect rate limiting
const translationQueue: Array<{
  text: string;
  targetLang: string;
  cacheKey: string;
  format: AutoTranslateFormat;
  resolve: (value: string) => void;
}> = [];

let isProcessingQueue = false;
const QUEUE_DELAY = 500; // 500ms between requests to avoid rate limiting

const LANGUAGE_MAP: Record<string, string> = {
  it: 'it',
  fr: 'fr',
  es: 'es',
  de: 'de',
  pt: 'pt',
  ja: 'ja',
  zh: 'zh',
  en: 'en',
};

function normalizeUiLanguage(language: string | undefined): string {
  if (!language) return 'en';
  return language.trim().split('-')[0].toLowerCase();
}

function mapTargetLanguage(language: string): string {
  const base = normalizeUiLanguage(language);
  return LANGUAGE_MAP[base] || base;
}

type AutoTranslateFormat = 'title' | 'prose';

type AutoTranslateOptions = {
  disabled?: boolean;
  /** `title`: sentence-case for short labels. `prose`: keep translator capitalization (summaries). */
  format?: AutoTranslateFormat;
};

function finalizeTranslatedText(text: string, format: AutoTranslateFormat): string {
  if (format === 'prose') {
    return text.trim();
  }
  return formatTranslation(text);
}

function translationCacheKey(text: string, uiLanguage: string, format: AutoTranslateFormat): string {
  return `${text}-${uiLanguage}-${format}`;
}

/**
 * Auto-translate when no locale string is available.
 * @param text - Source text
 * @param translationKey - i18n key to check first
 * @returns Translated or original text
 */
export function useAutoTranslate(
  text: string,
  translationKey: string,
  options: AutoTranslateOptions = {}
): string {
  const { t, i18n } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string>(text);
  const requestGenerationRef = useRef(0);
  const format: AutoTranslateFormat = options.format ?? 'title';

  useEffect(() => {
    const generation = ++requestGenerationRef.current;

    if (options.disabled) {
      setTranslatedText(text);
      return;
    }

    const existingTranslation = t(translationKey, { defaultValue: '$$$$MISSING$$$$' });
    if (
      existingTranslation !== '$$$$MISSING$$$$' &&
      existingTranslation !== translationKey &&
      existingTranslation !== text
    ) {
      setTranslatedText(existingTranslation);
      return;
    }

    const uiLanguage = normalizeUiLanguage(i18n.resolvedLanguage || i18n.language);
    if (uiLanguage === 'en') {
      setTranslatedText(finalizeTranslatedText(text, format));
      return;
    }

    const cacheKey = translationCacheKey(text, uiLanguage, format);
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey)!);
      return;
    }

    void translateQueuedText(text, uiLanguage, cacheKey, format).then((translated) => {
      if (requestGenerationRef.current !== generation) return;
      setTranslatedText(translated);
    });
  }, [text, translationKey, t, i18n.language, i18n.resolvedLanguage, options.disabled, format]);

  return translatedText;
}

export type AutoTranslateBatchItem = {
  id: string;
  text: string;
  translationKey: string;
};

type AutoTranslateBatchOptions = {
  disabled?: boolean;
};

/**
 * Translate multiple titles in one HTTP call.
 * Returns a map id -> title (translated or formatted).
 */
export function useAutoTranslateBatch(
  items: AutoTranslateBatchItem[],
  options: AutoTranslateBatchOptions = {}
): Record<string, string> {
  const { t, i18n } = useTranslation();
  const [results, setResults] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    items.forEach((item) => {
      initial[item.id] = formatTranslation(item.text);
    });
    return initial;
  });
  const batchKeyRef = useRef<string>('');

  useEffect(() => {
    if (options.disabled || items.length === 0) {
      const fallback: Record<string, string> = {};
      items.forEach((item) => {
        fallback[item.id] = formatTranslation(item.text);
      });
      setResults(fallback);
      return;
    }

    const uiLanguage = normalizeUiLanguage(i18n.resolvedLanguage || i18n.language);
    const next: Record<string, string> = {};
    const toTranslate: AutoTranslateBatchItem[] = [];

    for (const item of items) {
      const existing = t(item.translationKey, { defaultValue: '$$$$MISSING$$$$' });
      if (existing !== '$$$$MISSING$$$$' && existing !== item.translationKey && existing !== item.text) {
        next[item.id] = existing;
        continue;
      }
      if (uiLanguage === 'en') {
        next[item.id] = formatTranslation(item.text);
        continue;
      }
      const cacheKey = translationCacheKey(item.text, uiLanguage, 'title');
      if (translationCache.has(cacheKey)) {
        next[item.id] = translationCache.get(cacheKey)!;
        continue;
      }
      toTranslate.push(item);
    }

    if (toTranslate.length === 0) {
      setResults(next);
      return;
    }

    const targetLang = mapTargetLanguage(uiLanguage);
    if (!targetLang || targetLang === 'en') {
      toTranslate.forEach((item) => { next[item.id] = formatTranslation(item.text); });
      setResults(next);
      return;
    }

    const batchKey = `${uiLanguage}:${items.map((i) => i.id).sort().join(',')}`;
    if (batchKeyRef.current === batchKey) {
      setResults(next);
      return;
    }
    batchKeyRef.current = batchKey;

    setResults(next);

    tryGoogleTranslateBatch(
      toTranslate.map((item) => item.text),
      targetLang
    ).then((translatedList) => {
      const updates: Record<string, string> = {};
      toTranslate.forEach((item, index) => {
        const raw = translatedList[index];
        const formatted = raw ? formatTranslation(raw) : formatTranslation(item.text);
        const cacheKey = translationCacheKey(item.text, uiLanguage, 'title');
        translationCache.set(cacheKey, formatted);
        updates[item.id] = formatted;
      });
      setResults((prev) => ({ ...prev, ...updates }));
    }).catch(() => {
      const fallback: Record<string, string> = {};
      toTranslate.forEach((item) => { fallback[item.id] = formatTranslation(item.text); });
      setResults((prev) => ({ ...prev, ...fallback }));
    });
  }, [items, t, i18n.language, i18n.resolvedLanguage, options.disabled]);

  return results;
}

function formatTranslation(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const normalized = text.replace(/-/g, ' ').trim();
  if (!normalized) return normalized;

  const lower = normalized.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const BATCH_SEP = '\n';

function parseGoogleTranslateResponse(data: unknown): string | null {
  if (!Array.isArray(data) || !data[0] || !Array.isArray(data[0])) return null;
  const translatedParts = data[0]
    .map((part: unknown[]) => part && part[0])
    .filter(Boolean);
  return translatedParts.length > 0 ? translatedParts.join('') : null;
}

async function tryServerTranslate(text: string, targetLang: string): Promise<string | null> {
  if (!API_BASE) return null;
  try {
    const url = buildApiUrl(API_BASE, '/translate');
    const response = await fetch(url, {
      method: 'POST',
      headers: buildApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text, targetLang, sourceLang: 'en' }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.translated === 'string' && data.translated.trim() ? data.translated : null;
  } catch {
    return null;
  }
}

async function tryGoogleTranslate(text: string, targetLang: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return parseGoogleTranslateResponse(data);
  } catch {
    return null;
  }
}

async function translateText(text: string, targetLang: string): Promise<string | null> {
  const mapped = mapTargetLanguage(targetLang);
  if (!mapped || mapped === 'en') return text;
  const fromServer = await tryServerTranslate(text, mapped);
  if (fromServer) return fromServer;
  return tryGoogleTranslate(text, mapped);
}

function translateQueuedText(
  text: string,
  targetLang: string,
  cacheKey: string,
  format: AutoTranslateFormat,
): Promise<string> {
  return new Promise((resolve) => {
    translationQueue.push({ text, targetLang, cacheKey, format, resolve });
    void processTranslationQueue();
  });
}

async function tryGoogleTranslateBatch(texts: string[], targetLang: string): Promise<(string | null)[]> {
  if (texts.length === 0) return [];
  if (texts.length === 1) {
    const single = await translateText(texts[0], targetLang);
    return [single];
  }
  try {
    const combined = texts.join(BATCH_SEP);
    const translated = await translateText(combined, targetLang);
    if (!translated) return texts.map(() => null);
    const parts = translated.split(BATCH_SEP).map((s) => s.trim());
    if (parts.length !== texts.length) return texts.map(() => null);
    return parts;
  } catch {
    return texts.map(() => null);
  }
}

async function processTranslationQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (translationQueue.length > 0) {
      const item = translationQueue.shift();
      if (!item) break;

      if (translationQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, QUEUE_DELAY));
      }

      const targetLang = mapTargetLanguage(item.targetLang);
      if (!targetLang || targetLang === 'en') {
        item.resolve(item.text);
        continue;
      }

      let retries = 3;
      let resolved = false;

      while (retries > 0 && !resolved) {
        try {
          const translated = await translateText(item.text, targetLang);
          if (translated) {
            const formatted = finalizeTranslatedText(translated, item.format);
            translationCache.set(item.cacheKey, formatted);
            item.resolve(formatted);
            resolved = true;
          } else {
            item.resolve(finalizeTranslatedText(item.text, item.format));
            resolved = true;
          }
        } catch {
          retries--;
          if (retries > 0) {
            const backoffDelay = Math.pow(2, 3 - retries) * 1000;
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          }
        }
      }

      if (!resolved) {
        item.resolve(finalizeTranslatedText(item.text, item.format));
      }
    }
  } finally {
    isProcessingQueue = false;
    if (translationQueue.length > 0) {
      void processTranslationQueue();
    }
  }
}
