/**
 * Curated language options for the waiter interpreter.
 *
 * The list is intentionally explicit: language codes are validated before any
 * provider call and the UI never has to invent codes. It does NOT assert that a
 * configured translation model is fluent in every pair. Provider coverage must
 * be verified operationally and is documented as a limitation.
 */
export interface InterpreterLanguage {
  /** ISO 639-1 code used by the API. */
  code: string;
  /** English display name. */
  name: string;
  /** Endonym shown to waiters. */
  nativeName: string;
  /** Text direction for rendering. */
  direction: 'ltr' | 'rtl';
  /** BCP-47 locale hint for browser speech APIs, not a provider guarantee. */
  speechLocale: string;
}

const language = (
  code: string,
  name: string,
  nativeName: string,
  speechLocale: string,
  direction: 'ltr' | 'rtl' = 'ltr',
): InterpreterLanguage => ({ code, name, nativeName, direction, speechLocale });

export const INTERPRETER_LANGUAGES: readonly InterpreterLanguage[] = [
  language('en', 'English', 'English', 'en-US'),
  language('sq', 'Albanian', 'Shqip', 'sq-AL'),
  language('it', 'Italian', 'Italiano', 'it-IT'),
  language('de', 'German', 'Deutsch', 'de-DE'),
  language('fr', 'French', 'Français', 'fr-FR'),
  language('es', 'Spanish', 'Español', 'es-ES'),
  language('pt', 'Portuguese', 'Português', 'pt-PT'),
  language('el', 'Greek', 'Ελληνικά', 'el-GR'),
  language('tr', 'Turkish', 'Türkçe', 'tr-TR'),
  language('ar', 'Arabic', 'العربية', 'ar-SA', 'rtl'),
  language('he', 'Hebrew', 'עברית', 'he-IL', 'rtl'),
  language('fa', 'Persian', 'فارسی', 'fa-IR', 'rtl'),
  language('ur', 'Urdu', 'اردو', 'ur-PK', 'rtl'),
  language('sr', 'Serbian', 'Српски', 'sr-RS'),
  language('hr', 'Croatian', 'Hrvatski', 'hr-HR'),
  language('bs', 'Bosnian', 'Bosanski', 'bs-BA'),
  language('mk', 'Macedonian', 'Македонски', 'mk-MK'),
  language('sl', 'Slovenian', 'Slovenščina', 'sl-SI'),
  language('ro', 'Romanian', 'Română', 'ro-RO'),
  language('bg', 'Bulgarian', 'Български', 'bg-BG'),
  language('pl', 'Polish', 'Polski', 'pl-PL'),
  language('nl', 'Dutch', 'Nederlands', 'nl-NL'),
  language('ru', 'Russian', 'Русский', 'ru-RU'),
  language('uk', 'Ukrainian', 'Українська', 'uk-UA'),
  language('cs', 'Czech', 'Čeština', 'cs-CZ'),
  language('hu', 'Hungarian', 'Magyar', 'hu-HU'),
  language('sv', 'Swedish', 'Svenska', 'sv-SE'),
  language('da', 'Danish', 'Dansk', 'da-DK'),
  language('fi', 'Finnish', 'Suomi', 'fi-FI'),
  language('no', 'Norwegian', 'Norsk', 'no-NO'),
  language('zh', 'Chinese (Simplified)', '中文（简体）', 'zh-CN'),
  language('ja', 'Japanese', '日本語', 'ja-JP'),
  language('ko', 'Korean', '한국어', 'ko-KR'),
  language('hi', 'Hindi', 'हिन्दी', 'hi-IN'),
  language('id', 'Indonesian', 'Bahasa Indonesia', 'id-ID'),
  language('vi', 'Vietnamese', 'Tiếng Việt', 'vi-VN'),
  language('th', 'Thai', 'ไทย', 'th-TH'),
  language('tl', 'Filipino', 'Filipino', 'tl-PH'),
  language('sw', 'Swahili', 'Kiswahili', 'sw-KE'),
];

const byCode = new Map(INTERPRETER_LANGUAGES.map((entry) => [entry.code, entry]));

export const normalizeLanguageCode = (value: string): string => value.trim().toLowerCase();

/** Return the curated language or null for an unsupported/invalid code. */
export const findInterpreterLanguage = (value: unknown): InterpreterLanguage | null => {
  if (typeof value !== 'string') return null;
  return byCode.get(normalizeLanguageCode(value)) ?? null;
};

export const listInterpreterLanguages = (): InterpreterLanguage[] =>
  [...INTERPRETER_LANGUAGES].sort((a, b) => a.name.localeCompare(b.name));
