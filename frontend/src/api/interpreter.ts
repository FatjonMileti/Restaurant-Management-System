/**
 * Client for the staff-only waiter interpreter (`/api/ai/interpreter`).
 * Provider credentials never reach the browser. Translations are not persisted.
 */
import { requestAiJson } from './ai';

export interface InterpreterLanguage {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  speechLocale: string;
}

export interface InterpreterLanguagesResponse {
  enabled: boolean;
  languages: InterpreterLanguage[];
}

export type TranslationDirection = 'waiter-to-customer' | 'customer-to-waiter';

export interface InterpreterTranslationRequest {
  message: string;
  sourceLanguage: string;
  targetLanguage: string;
  direction: TranslationDirection;
}

export interface InterpreterTranslationResponse {
  translationId: string;
  direction: TranslationDirection;
  sourceText: string;
  translatedText: string;
  sourceLanguage: InterpreterLanguage;
  targetLanguage: InterpreterLanguage;
  detectedSourceLanguage: string | null;
  detectedSourceLanguageName: string | null;
  uncertain: boolean;
  uncertaintyReasons: string[];
  safetySensitive: boolean;
  requiresHumanVerification: boolean;
  verificationReasons: string[];
  createdAt: string;
}

export const getInterpreterLanguages = (): Promise<InterpreterLanguagesResponse> =>
  requestAiJson<InterpreterLanguagesResponse>('/interpreter/languages');

export const translateInterpreterMessage = (
  payload: InterpreterTranslationRequest,
  token?: string | null,
): Promise<InterpreterTranslationResponse> =>
  requestAiJson<InterpreterTranslationResponse>('/interpreter/translate', {
    method: 'POST',
    body: payload,
    token,
  });

/** Minimal fallback so the text workflow can still load if the list endpoint fails. */
export const FALLBACK_LANGUAGES: InterpreterLanguage[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    speechLocale: 'en-US',
  },
  {
    code: 'sq',
    name: 'Albanian',
    nativeName: 'Shqip',
    direction: 'ltr',
    speechLocale: 'sq-AL',
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    speechLocale: 'it-IT',
  },
];
