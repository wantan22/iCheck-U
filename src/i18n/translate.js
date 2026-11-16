// Pure translation lookup (no React, no store) so any module can use it.
// English strings are the keys (see en.js); each language file maps key -> translation.
import ms, { msPatterns } from './ms.js';
import zh, { zhPatterns } from './zh.js';
import ta, { taPatterns } from './ta.js';

export const LANGUAGES = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'ms', label: 'Bahasa Malaysia', short: 'BM' },
  { id: 'zh', label: '中文', short: '中文' },
  { id: 'ta', label: 'தமிழ்', short: 'தமிழ்' },
];

const DICTS = { ms, zh, ta };
const PATTERNS = { ms: msPatterns, zh: zhPatterns, ta: taPatterns };

function lookup(lang, key) {
  const dict = DICTS[lang];
  if (!dict) return key;
  if (dict[key]) return dict[key];
  for (const [re, rep] of PATTERNS[lang] || []) if (re.test(key)) return key.replace(re, rep);
  return key;
}

export function translate(lang, key, vars) {
  if (key == null) return '';
  let s = lookup(lang, String(key));
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? lookup(lang, String(vars[k])) : ''));
  return s;
}
