import crypto from 'crypto';
import { aiValidationError, providerResponseError } from '../errors.js';
import { loadRestaurantGlossary } from './glossary.js';
import { findInterpreterLanguage } from './languages.js';
import { assessSafety } from './safety.js';
import type {
  InterpreterLanguageInfo,
  InterpreterTranslationInput,
  InterpreterTranslationResult,
  RestaurantGlossary,
  TranslationProvider,
} from './types.js';

interface InterpreterServiceOptions {
  provider: TranslationProvider;
  maxInputChars: number;
  maxGlossaryItems: number;
  /** Injectable for tests/ops; defaults to live RxDB-backed terminology. */
  loadGlossary?: (maxItems: number) => Promise<RestaurantGlossary>;
}

const toLanguageInfo = (value: {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  speechLocale: string;
}): InterpreterLanguageInfo => ({
  code: value.code,
  name: value.name,
  nativeName: value.nativeName,
  direction: value.direction,
  speechLocale: value.speechLocale,
});

const unique = (values: string[], max = 8): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= max) break;
  }
  return result;
};

/**
 * Text translation for the staff-facing waiter interpreter.
 *
 * This service has no access to the order/reservation tool registry, draft
 * service, RAG ingestion or write endpoints. It validates both languages and
 * bounds input/output before returning anything to the client.
 */
export class InterpreterService {
  private readonly provider: TranslationProvider;
  private readonly maxInputChars: number;
  private readonly maxGlossaryItems: number;
  private readonly loadGlossary: (maxItems: number) => Promise<RestaurantGlossary>;

  constructor(options: InterpreterServiceOptions) {
    this.provider = options.provider;
    this.maxInputChars = options.maxInputChars;
    this.maxGlossaryItems = options.maxGlossaryItems;
    this.loadGlossary = options.loadGlossary ?? loadRestaurantGlossary;
  }

  async translate(input: InterpreterTranslationInput): Promise<InterpreterTranslationResult> {
    if (input.direction !== 'waiter-to-customer' && input.direction !== 'customer-to-waiter') {
      throw aiValidationError('Invalid translation direction.');
    }

    const text = typeof input.text === 'string' ? input.text.trim() : '';
    if (!text) throw aiValidationError('Message must not be empty.');
    if (text.length > this.maxInputChars) {
      throw aiValidationError(`Message must be at most ${this.maxInputChars} characters.`);
    }

    const sourceLanguage = findInterpreterLanguage(input.sourceLanguage);
    if (!sourceLanguage) throw aiValidationError('Unsupported source language code.');

    const targetLanguage = findInterpreterLanguage(input.targetLanguage);
    if (!targetLanguage) throw aiValidationError('Unsupported target language code.');

    if (sourceLanguage.code === targetLanguage.code) {
      throw aiValidationError('Source and target languages must be different.');
    }

    let glossary: RestaurantGlossary;
    try {
      glossary = await this.loadGlossary(this.maxGlossaryItems);
    } catch {
      glossary = { restaurantName: '', entries: [], unavailable: true };
    }

    const providerOutput = await this.provider.translate({
      text,
      sourceLanguage,
      targetLanguage,
      direction: input.direction,
      glossary,
      signal: input.signal,
    });

    const translatedText = providerOutput.translatedText.trim();
    if (!translatedText) throw providerResponseError();

    // A translation should not grow without bound. This also rejects provider
    // output that looks like an essay or a prompt injection response.
    const maxOutputChars = Math.max(1000, Math.min(24000, text.length * 4 + 200));
    if (translatedText.length > maxOutputChars) throw providerResponseError();

    const safety = assessSafety(text, translatedText);
    const providerReasons = providerOutput.uncertaintyReasons;
    const unchanged = translatedText.toLowerCase() === text.toLowerCase();
    const numericMismatch = safety.numericMismatch;

    const uncertaintyReasons = unique([
      ...providerReasons,
      ...(numericMismatch
        ? [
            'Numbers in the translation may not match the original price, quantity, date or time.',
          ]
        : []),
      ...(unchanged
        ? ['The translation is identical to the original text; confirm the language pair and meaning.']
        : []),
    ]);

    const safetySensitive =
      providerOutput.safetySensitive || safety.categories.length > 0 || numericMismatch;
    const uncertain = providerOutput.uncertain || numericMismatch || unchanged;

    const verificationReasons = unique([
      ...safety.reasons,
      ...providerReasons,
      ...(unchanged
        ? ['The translation is identical to the original text; confirm the language pair and meaning.']
        : []),
      ...(safetySensitive
        ? [
            'Verify allergy, dietary, price, quantity and reservation details with the restaurant before acting on this translation.',
          ]
        : []),
      ...(uncertain && safety.reasons.length === 0 && providerReasons.length === 0
        ? ['The provider reported uncertainty. Ask the customer to clarify.']
        : []),
    ]);

    const detected = findInterpreterLanguage(providerOutput.detectedSourceLanguage);

    return {
      translationId: crypto.randomUUID(),
      direction: input.direction,
      sourceText: text,
      translatedText,
      sourceLanguage: toLanguageInfo(sourceLanguage),
      targetLanguage: toLanguageInfo(targetLanguage),
      detectedSourceLanguage: detected?.code ?? null,
      detectedSourceLanguageName: detected?.name ?? null,
      uncertain,
      uncertaintyReasons,
      safetySensitive,
      requiresHumanVerification: safetySensitive || uncertain,
      verificationReasons,
      createdAt: new Date().toISOString(),
    };
  }
}
