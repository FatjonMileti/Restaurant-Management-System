import type { InterpreterLanguage } from './languages.js';

export type TranslationDirection = 'waiter-to-customer' | 'customer-to-waiter';

export interface GlossaryEntry {
  /** Official name or term exactly as stored by the restaurant. */
  term: string;
  category?: string;
  description?: string;
}

export interface RestaurantGlossary {
  restaurantName: string;
  entries: GlossaryEntry[];
  /** True when live restaurant data could not be loaded. */
  unavailable?: boolean;
}

export interface TranslationProviderRequest {
  text: string;
  sourceLanguage: InterpreterLanguage;
  targetLanguage: InterpreterLanguage;
  direction: TranslationDirection;
  glossary: RestaurantGlossary;
  signal?: AbortSignal;
}

export interface TranslationProviderOutput {
  translatedText: string;
  detectedSourceLanguage: string | null;
  uncertain: boolean;
  uncertaintyReasons: string[];
  safetySensitive: boolean;
}

/** Provider-neutral translation contract, separate from business tools. */
export interface TranslationProvider {
  readonly name: string;
  translate(request: TranslationProviderRequest): Promise<TranslationProviderOutput>;
}

export interface InterpreterTranslationInput {
  text: string;
  sourceLanguage: unknown;
  targetLanguage: unknown;
  direction: TranslationDirection;
  signal?: AbortSignal;
}

export interface InterpreterLanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  speechLocale: string;
}

export interface InterpreterTranslationResult {
  translationId: string;
  direction: TranslationDirection;
  sourceText: string;
  translatedText: string;
  sourceLanguage: InterpreterLanguageInfo;
  targetLanguage: InterpreterLanguageInfo;
  detectedSourceLanguage: string | null;
  detectedSourceLanguageName: string | null;
  uncertain: boolean;
  uncertaintyReasons: string[];
  safetySensitive: boolean;
  requiresHumanVerification: boolean;
  verificationReasons: string[];
  createdAt: string;
}
