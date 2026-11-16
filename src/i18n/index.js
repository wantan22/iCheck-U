// i18n hook. Dictionaries: en.js (keys), ms.js, zh.js, ta.js. Lookup lives in translate.js.
import { useCallback } from 'react';
import { useStore } from '../store/useStore.js';
import { translate, LANGUAGES } from './translate.js';

export { translate, LANGUAGES };

export function useT() {
  const lang = useStore((s) => s.settings.lang);
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}

/** Non-hook access, e.g. inside callbacks. */
export const t = (key, vars) => translate(useStore.getState().settings.lang, key, vars);
