# Waiter Interpreter — Code Flow

The interpreter helps a staff member translate a message for a customer and translate the customer's response back. It is separate from the customer-facing virtual waitress.

## One translation, end to end

1. Staff opens `/interpreter`, rendered by `frontend/src/pages/Interpreter.tsx`.
2. The page loads the language list using `getInterpreterLanguages()` in `frontend/src/api/interpreter.ts`.
3. The waiter chooses their language and the customer's language.
4. The waiter enters text or uses optional browser speech input.
5. The page calls `translateInterpreterMessage()`, which sends `POST /api/ai/interpreter/translate`.
6. `backend/ai/routes.ts` checks the staff role, rate limit, request schema, message length, runtime availability, and timeout.
7. `InterpreterService.translate()` validates the language pair and message, loads a small restaurant glossary, and calls the translation provider.
8. The provider returns translated text and any uncertainty/safety metadata.
9. `assessSafety()` compares the source and translated text for safety-sensitive categories and numeric differences.
10. The service returns original text, translated text, language metadata, uncertainty reasons, and whether human verification is required.
11. The React page shows the result and any warning. The waiter remains responsible for verifying critical meaning.

## Main files

| File | Responsibility |
|---|---|
| `frontend/src/pages/Interpreter.tsx` | Page state, language choices, message inputs, translation history for the current page, copy and optional speech controls |
| `frontend/src/api/interpreter.ts` | Typed API requests/responses and fallback language list |
| `frontend/src/services/speechRecognition.ts` | Optional browser speech-to-text adapter |
| `frontend/src/services/speechSynthesis.ts` | Optional browser text-to-speech adapter |
| `backend/ai/routes.ts` | HTTP route, staff authorization, rate limiting, validation and timeout |
| `backend/ai/interpreter/languages.ts` | Curated supported language metadata |
| `backend/ai/interpreter/service.ts` | Translation orchestration and response construction |
| `backend/ai/interpreter/translationProvider.ts` | Adapts the general LLM provider to translation-specific instructions |
| `backend/ai/interpreter/glossary.ts` | Reads restaurant/menu terminology for translation context |
| `backend/ai/interpreter/safety.ts` | Flags critical wording and mismatched numbers |
| `backend/ai/runtime.ts` | Creates a separate interpreter provider/service when configured |

## Why the interpreter is separate

The interpreter service is intentionally not given the waitress tool registry or draft/action services. It translates text; it cannot search through arbitrary backend tools, prepare orders, confirm orders, or create reservations.

This separation matters because translated text is content to be reviewed, not authorization to perform an operation.

## Translation request and response

The request includes:

- `message`: source text;
- `sourceLanguage` and `targetLanguage`: selected language codes;
- `direction`: `waiter-to-customer` or `customer-to-waiter`.

The response includes:

- `sourceText` and `translatedText`;
- selected source and target language metadata;
- detected source language, if the provider supplies a supported value;
- `uncertain` and `uncertaintyReasons`;
- `safetySensitive`;
- `requiresHumanVerification` and `verificationReasons`.

Translations are not persisted by the backend. The visible translation entries live in the current page's React state and disappear when the page state is cleared/reloaded.

## Safety checks

The safety module is a heuristic guard, not a proof that a translation is correct. It looks for sensitive categories and compares numbers in source and translated text. The service also considers provider uncertainty and identical source/translation output.

A warning means the waiter should verify the meaning before acting. No warning does **not** guarantee correctness.

Always verify with restaurant staff or authoritative menu/allergen data before making claims about allergy safety, ingredients, prices, quantities, or reservation details. The current menu schema does not contain structured allergen data.

## Speech behavior

Text translation is the core workflow. Browser speech recognition and speech synthesis are optional convenience layers; they can be unsupported or unavailable depending on browser, language, permissions, and device. If speech is unavailable, use the text inputs and copy controls.

Do not assume that a browser voice exists for every language in the app's language list. The app's curated language list and the browser's available speech voices are different capabilities.

## Configuration

Interpreter setup is documented in [DEPLOYMENT.md](./DEPLOYMENT.md). The relevant settings use the `AI_INTERPRETER_*` and `AI_TRANSLATION_*` prefixes, with provider defaults inherited from the main AI configuration where configured.

## Debugging

- Language list unavailable: check `GET /api/ai/interpreter/languages` and the frontend fallback list.
- Translation endpoint returns 401/403: verify the user token and staff/admin role.
- Interpreter disabled: inspect `AI_ENABLED`, `AI_INTERPRETER_ENABLED`, and translation provider configuration.
- Provider timeout/error: inspect translation URL/model/key and backend logs without logging sensitive message contents.
- Warning not displayed: inspect the response fields from `InterpreterService` and how `Interpreter.tsx` maps them to the UI.
