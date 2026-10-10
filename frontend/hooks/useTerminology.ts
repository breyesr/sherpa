import { useState, useCallback } from 'react';
import { dictionary, Language } from '../lib/dictionary';

// In a real app this might come from a user preferences context or next-intl
// Defaulting to EN for now, easily swappable
export function useTerminology(defaultLang: Language = 'en') {
  const [lang, setLang] = useState<Language>(defaultLang);

  const t = useCallback((key: string, fallback?: string): string => {
    if (dictionary[key] && dictionary[key][lang]) {
      return dictionary[key][lang];
    }
    // Return explicit fallback, or just title-case the key if no fallback
    return fallback || key.replace(/_/g, ' ').replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
  }, [lang]);

  return { t, lang, setLang };
}
