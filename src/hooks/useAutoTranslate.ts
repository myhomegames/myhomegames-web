import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Cache per le traduzioni già ottenute (chiave: `${text}-${targetLang}`)
const translationCache = new Map<string, string>();

// Coda per gestire le traduzioni in modo sequenziale e rispettare il rate limiting
const translationQueue: Array<{
  text: string;
  targetLang: string;
  cacheKey: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}> = [];

let isProcessingQueue = false;
const QUEUE_DELAY = 500; // 500ms tra le richieste per evitare rate limiting

// Mappa dei codici lingua per LibreTranslate
const LANGUAGE_MAP: Record<string, string> = {
  'it': 'it',
  'fr': 'fr',
  'es': 'es',
  'de': 'de',
  'pt': 'pt',
  'ja': 'ja',
  'zh': 'zh',
  'en': 'en',
};

/**
 * Hook per tradurre automaticamente un testo quando non c'è traduzione disponibile
 * @param text - Testo da tradurre
 * @param translationKey - Chiave di traduzione da controllare
 * @returns Testo tradotto o originale
 */
type AutoTranslateOptions = {
  disabled?: boolean;
};

export function useAutoTranslate(
  text: string,
  translationKey: string,
  options: AutoTranslateOptions = {}
): string {
  const { t, i18n } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string>(text);
  const isTranslatingRef = useRef(false);

  useEffect(() => {
    if (options.disabled) {
      setTranslatedText(text);
      return;
    }

    // Controlla se esiste già una traduzione nei file di localizzazione
    // Se la chiave non esiste, t() restituisce la chiave stessa
    const existingTranslation = t(translationKey, { defaultValue: '$$$$MISSING$$$$' });
    
    // Se esiste una traduzione (non è il marker di mancante e non è uguale alla chiave), usala
    if (existingTranslation !== '$$$$MISSING$$$$' && existingTranslation !== translationKey && existingTranslation !== text) {
      setTranslatedText(existingTranslation);
      return;
    }

    // Se la lingua corrente è inglese, non tradurre
    if (i18n.language === 'en') {
      setTranslatedText(formatTranslation(text));
      return;
    }

    // Controlla se abbiamo già tradotto questo testo nella cache
    const cacheKey = `${text}-${i18n.language}`;
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey)!);
      return;
    }

    // Se stiamo già traducendo, non fare una nuova richiesta
    if (isTranslatingRef.current) {
      return;
    }

    // Traduci usando Google Translate API con coda per gestire il rate limiting
    isTranslatingRef.current = true;
    
    const translateText = async (): Promise<string> => {
      return new Promise((resolve, reject) => {
        translationQueue.push({
          text,
          targetLang: i18n.language,
          cacheKey,
          resolve,
          reject,
        });
        
        processTranslationQueue();
      });
    };

    translateText()
      .then((translated) => {
        setTranslatedText(translated);
        isTranslatingRef.current = false;
      })
      .catch((error) => {
        console.error(`Error translating "${text}":`, error);
        setTranslatedText(text);
        isTranslatingRef.current = false;
      });
  }, [text, translationKey, t, i18n.language, options.disabled]);

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
 * Traduce più titoli con una sola chiamata HTTP.
 * Restituisce una mappa id -> titolo (tradotto o formattato).
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

    const next: Record<string, string> = {};
    const toTranslate: AutoTranslateBatchItem[] = [];

    for (const item of items) {
      const existing = t(item.translationKey, { defaultValue: '$$$$MISSING$$$$' });
      if (existing !== '$$$$MISSING$$$$' && existing !== item.translationKey && existing !== item.text) {
        next[item.id] = existing;
        continue;
      }
      if (i18n.language === 'en') {
        next[item.id] = formatTranslation(item.text);
        continue;
      }
      const cacheKey = `${item.text}-${i18n.language}`;
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

    const targetLang = LANGUAGE_MAP[i18n.language] || i18n.language;
    if (!targetLang || targetLang === 'en') {
      toTranslate.forEach((item) => { next[item.id] = formatTranslation(item.text); });
      setResults(next);
      return;
    }

    const batchKey = `${i18n.language}:${items.map((i) => i.id).sort().join(',')}`;
    if (batchKeyRef.current === batchKey) {
      setResults(next);
      return;
    }
    batchKeyRef.current = batchKey;

    // Mostra subito i titoli già risolti (i18n/cache)
    setResults(next);

    tryGoogleTranslateBatch(
      toTranslate.map((item) => item.text),
      targetLang
    ).then((translatedList) => {
      const updates: Record<string, string> = {};
      toTranslate.forEach((item, index) => {
        const raw = translatedList[index];
        const formatted = raw ? formatTranslation(raw) : formatTranslation(item.text);
        const cacheKey = `${item.text}-${i18n.language}`;
        translationCache.set(cacheKey, formatted);
        updates[item.id] = formatted;
      });
      setResults((prev) => ({ ...prev, ...updates }));
    }).catch(() => {
      const fallback: Record<string, string> = {};
      toTranslate.forEach((item) => { fallback[item.id] = formatTranslation(item.text); });
      setResults((prev) => ({ ...prev, ...fallback }));
    });
  }, [items, t, i18n.language, options.disabled]);

  return results;
}

/**
 * Formatta la traduzione in \"sentence case\":
 * tutto minuscolo tranne la prima lettera della frase.
 */
function formatTranslation(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Rimuovi trattini e sostituiscili con spazi
  const normalized = text.replace(/-/g, ' ').trim();
  if (!normalized) return normalized;

  const lower = normalized.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const BATCH_SEP = '\n';

/**
 * Usa Google Translate API (endpoint pubblico non ufficiale)
 */
async function tryGoogleTranslate(text: string, targetLang: string): Promise<string | null> {
  try {
    // Usa l'endpoint pubblico di Google Translate
    // Nota: questo è un endpoint non ufficiale ma funzionante
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Google Translate restituisce un array complesso, estraiamo il testo tradotto
    // Formato: [[["traduzione", "originale", null, null, 0]], null, "en"]
    if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
      const translatedParts = data[0]
        .map((part: any[]) => part && part[0])
        .filter(Boolean);
      
      if (translatedParts.length > 0) {
        return translatedParts.join('');
      }
    }
    
    return null;
  } catch (error: any) {
    return null;
  }
}

/**
 * Traduce più testi con una sola chiamata HTTP (join con separatore, poi split).
 */
async function tryGoogleTranslateBatch(texts: string[], targetLang: string): Promise<(string | null)[]> {
  if (texts.length === 0) return [];
  if (texts.length === 1) {
    const t = await tryGoogleTranslate(texts[0], targetLang);
    return [t];
  }
  try {
    const combined = texts.join(BATCH_SEP);
    const translated = await tryGoogleTranslate(combined, targetLang);
    if (!translated) return texts.map(() => null);
    const parts = translated.split(BATCH_SEP).map((s) => s.trim());
    if (parts.length !== texts.length) return texts.map(() => null);
    return parts;
  } catch {
    return texts.map(() => null);
  }
}

/**
 * Processa la coda di traduzioni in modo sequenziale per rispettare il rate limiting
 */
async function processTranslationQueue() {
  if (isProcessingQueue || translationQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (translationQueue.length > 0) {
    const item = translationQueue.shift();
    if (!item) break;

    try {
      // Aspetta prima di processare la prossima richiesta
      if (translationQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY));
      }

      // Usa Google Translate API (endpoint pubblico)
      const targetLang = LANGUAGE_MAP[item.targetLang] || item.targetLang;
      
      // Se la lingua non è supportata, usa il testo originale
      if (!targetLang || targetLang === 'en') {
        item.resolve(item.text);
        return;
      }

      let retries = 3;
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          const translated = await tryGoogleTranslate(item.text, targetLang);
          
          if (translated) {
            // Formatta la traduzione: capitalizza ogni parola e rimuovi trattini
            const formatted = formatTranslation(translated);
            
            // Salva nella cache
            translationCache.set(item.cacheKey, formatted);
            item.resolve(formatted);
            break;
          } else {
            // Se la traduzione fallisce, usa il testo originale
            item.resolve(item.text);
            break;
          }
        } catch (error: any) {
          lastError = error;
          retries--;
          if (retries > 0) {
            const backoffDelay = Math.pow(2, 3 - retries) * 1000; // Backoff esponenziale
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }
      }

      if (retries === 0 && lastError) {
        item.resolve(item.text); // Usa il testo originale in caso di errore
      }
    } catch (error: any) {
      console.error(`[useAutoTranslate] Error processing translation queue:`, error);
      item.resolve(item.text); // Usa il testo originale in caso di errore
    }
  }

  isProcessingQueue = false;
}
