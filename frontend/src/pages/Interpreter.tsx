import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import PageHeader from '../components/PageHeader';
import {
  FALLBACK_LANGUAGES,
  getInterpreterLanguages,
  InterpreterLanguage,
  InterpreterTranslationResponse,
  translateInterpreterMessage,
  TranslationDirection,
} from '../api/interpreter';
import { errMessage } from '../api/ai';
import { useAuth } from '../store/authStore';
import {
  browserSpeechRecognition,
  SpeechRecognitionError,
} from '../services/speechRecognition';
import { browserSpeechSynthesis } from '../services/speechSynthesis';

const MAX_MESSAGE_CHARS = 2000;

interface TranslationEntry {
  id: string;
  translationId?: string;
  direction: TranslationDirection;
  sourceText: string;
  sourceLanguage: InterpreterLanguage;
  targetLanguage: InterpreterLanguage;
  createdAt: string;
  status: 'pending' | 'success' | 'error';
  translatedText?: string;
  error?: string;
  detectedSourceLanguage?: string | null;
  detectedSourceLanguageName?: string | null;
  uncertain?: boolean;
  uncertaintyReasons?: string[];
  safetySensitive?: boolean;
  requiresHumanVerification?: boolean;
  verificationReasons?: string[];
}

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const directionLabel = (direction: TranslationDirection): string =>
  direction === 'waiter-to-customer' ? 'Waiter → customer' : 'Customer → waiter';

const copyToClipboard = async (value: string): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the legacy path (e.g. non-secure localhost contexts).
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};

const entryFromResponse = (
  id: string,
  response: InterpreterTranslationResponse,
): TranslationEntry => ({
  id,
  translationId: response.translationId,
  direction: response.direction,
  sourceText: response.sourceText,
  sourceLanguage: response.sourceLanguage,
  targetLanguage: response.targetLanguage,
  createdAt: response.createdAt,
  status: 'success',
  translatedText: response.translatedText,
  detectedSourceLanguage: response.detectedSourceLanguage,
  detectedSourceLanguageName: response.detectedSourceLanguageName,
  uncertain: response.uncertain,
  uncertaintyReasons: response.uncertaintyReasons,
  safetySensitive: response.safetySensitive,
  requiresHumanVerification: response.requiresHumanVerification,
  verificationReasons: response.verificationReasons,
});

/** Staff-facing, text-first interpreter for waiter/customer conversations. */
export default function Interpreter() {
  const { user } = useAuth();
  const token = user?.token ?? null;

  const [languages, setLanguages] = useState<InterpreterLanguage[]>(FALLBACK_LANGUAGES);
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null);
  const [languageError, setLanguageError] = useState('');
  const [waiterLanguageCode, setWaiterLanguageCode] = useState('sq');
  const [customerLanguageCode, setCustomerLanguageCode] = useState('it');

  const [waiterInput, setWaiterInput] = useState('');
  const [customerInput, setCustomerInput] = useState('');
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [activeRequest, setActiveRequest] = useState<TranslationDirection | null>(null);
  const [formError, setFormError] = useState('');

  const [recording, setRecording] = useState<TranslationDirection | null>(null);
  const [speechError, setSpeechError] = useState('');
  const [speakingEntryId, setSpeakingEntryId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [copyError, setCopyError] = useState('');

  const waiterInputRef = useRef<HTMLTextAreaElement>(null);
  const customerInputRef = useRef<HTMLTextAreaElement>(null);

  const recognitionSupported = useMemo(() => browserSpeechRecognition.isSupported(), []);
  const synthesisSupported = useMemo(() => browserSpeechSynthesis.isSupported(), []);

  const languageByCode = useMemo(
    () => new Map(languages.map((language) => [language.code, language])),
    [languages],
  );
  const waiterLanguage = languageByCode.get(waiterLanguageCode) ?? languages[0];
  const customerLanguage = languageByCode.get(customerLanguageCode) ?? languages[1] ?? languages[0];

  useEffect(() => {
    let cancelled = false;
    getInterpreterLanguages()
      .then((response) => {
        if (cancelled) return;
        const next = response.languages.length > 0 ? response.languages : FALLBACK_LANGUAGES;
        setLanguages(next);
        setServerEnabled(response.enabled);
        setWaiterLanguageCode((current) =>
          next.some((language) => language.code === current) ? current : next[0]?.code ?? 'en',
        );
        setCustomerLanguageCode((current) =>
          next.some((language) => language.code === current)
            ? current
            : next.find((language) => language.code !== next[0]?.code)?.code ??
              next[0]?.code ??
              'it',
        );
      })
      .catch(() => {
        if (cancelled) return;
        setLanguageError(
          'Could not load the language list from the server. Basic language options are shown; translations may fail until the server is reachable.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      browserSpeechRecognition.cancel();
      browserSpeechSynthesis.cancel();
    },
    [],
  );

  const runTranslation = useCallback(
    async (params: {
      entryId?: string;
      text: string;
      direction: TranslationDirection;
      sourceLanguage: InterpreterLanguage;
      targetLanguage: InterpreterLanguage;
    }) => {
      const entryId = params.entryId ?? newId();
      setActiveRequest(params.direction);
      setFormError('');
      setSpeechError('');
      setEntries((previous) => {
        const pendingEntry: TranslationEntry = {
          id: entryId,
          direction: params.direction,
          sourceText: params.text,
          sourceLanguage: params.sourceLanguage,
          targetLanguage: params.targetLanguage,
          createdAt: new Date().toISOString(),
          status: 'pending',
        };
        if (params.entryId) {
          return previous.map((entry) => (entry.id === entryId ? pendingEntry : entry));
        }
        return [...previous, pendingEntry];
      });

      try {
        const response = await translateInterpreterMessage(
          {
            message: params.text,
            sourceLanguage: params.sourceLanguage.code,
            targetLanguage: params.targetLanguage.code,
            direction: params.direction,
          },
          token,
        );
        setEntries((previous) =>
          previous.map((entry) =>
            entry.id === entryId ? entryFromResponse(entryId, response) : entry,
          ),
        );
      } catch (error) {
        setEntries((previous) =>
          previous.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  status: 'error',
                  error: errMessage(error),
                }
              : entry,
          ),
        );
      } finally {
        setActiveRequest(null);
      }
    },
    [token],
  );

  const languagePairFor = useCallback(
    (direction: TranslationDirection) => {
      const waiter = waiterLanguage ?? FALLBACK_LANGUAGES[1];
      const customer = customerLanguage ?? FALLBACK_LANGUAGES[2];
      return direction === 'waiter-to-customer'
        ? { sourceLanguage: waiter, targetLanguage: customer }
        : { sourceLanguage: customer, targetLanguage: waiter };
    },
    [customerLanguage, waiterLanguage],
  );

  const handleTranslate = useCallback(
    (direction: TranslationDirection) => {
      if (activeRequest || recording || serverEnabled === false) return;
      const text = (direction === 'waiter-to-customer' ? waiterInput : customerInput).trim();
      if (!text) {
        setFormError('Enter a message to translate.');
        return;
      }
      if (text.length > MAX_MESSAGE_CHARS) {
        setFormError(`Messages must be at most ${MAX_MESSAGE_CHARS} characters.`);
        return;
      }
      const { sourceLanguage, targetLanguage } = languagePairFor(direction);
      if (!sourceLanguage || !targetLanguage) {
        setFormError('Select both languages before translating.');
        return;
      }
      if (sourceLanguage.code === targetLanguage.code) {
        setFormError('Select two different languages before translating.');
        return;
      }
      if (direction === 'waiter-to-customer') setWaiterInput('');
      else setCustomerInput('');
      void runTranslation({ text, direction, sourceLanguage, targetLanguage });
    },
    [
      activeRequest,
      customerInput,
      languagePairFor,
      recording,
      runTranslation,
      serverEnabled,
      waiterInput,
    ],
  );

  const handleRetry = useCallback(
    (entry: TranslationEntry) => {
      if (activeRequest || recording) return;
      void runTranslation({
        entryId: entry.id,
        text: entry.sourceText,
        direction: entry.direction,
        sourceLanguage: entry.sourceLanguage,
        targetLanguage: entry.targetLanguage,
      });
    },
    [activeRequest, recording, runTranslation],
  );

  const handleEdit = useCallback((entry: TranslationEntry) => {
    if (entry.direction === 'waiter-to-customer') {
      setWaiterLanguageCode(entry.sourceLanguage.code);
      setCustomerLanguageCode(entry.targetLanguage.code);
      setWaiterInput(entry.sourceText);
      window.setTimeout(() => waiterInputRef.current?.focus(), 0);
    } else {
      setCustomerLanguageCode(entry.sourceLanguage.code);
      setWaiterLanguageCode(entry.targetLanguage.code);
      setCustomerInput(entry.sourceText);
      window.setTimeout(() => customerInputRef.current?.focus(), 0);
    }
    setFormError('');
  }, []);

  const handleSwapLanguages = useCallback(() => {
    setWaiterLanguageCode(customerLanguage?.code ?? waiterLanguageCode);
    setCustomerLanguageCode(waiterLanguage?.code ?? customerLanguageCode);
  }, [customerLanguage, customerLanguageCode, waiterLanguage, waiterLanguageCode]);

  const handleDictate = useCallback(
    async (direction: TranslationDirection) => {
      if (recording || activeRequest) return;
      if (!recognitionSupported) {
        setSpeechError(
          'Speech recognition is not available in this browser. Type the message instead.',
        );
        return;
      }
      const language =
        direction === 'waiter-to-customer' ? waiterLanguage : customerLanguage;
      if (!language) {
        setSpeechError('Select a language before dictating.');
        return;
      }
      setSpeechError('');
      setRecording(direction);
      try {
        const transcript = await browserSpeechRecognition.start(language.speechLocale);
        if (direction === 'waiter-to-customer') setWaiterInput(transcript);
        else setCustomerInput(transcript);
      } catch (error) {
        if (error instanceof SpeechRecognitionError && error.code === 'cancelled') return;
        setSpeechError(errMessage(error));
      } finally {
        setRecording(null);
      }
    },
    [
      activeRequest,
      customerLanguage,
      recognitionSupported,
      recording,
      waiterLanguage,
    ],
  );

  const handleCancelRecording = useCallback(() => {
    browserSpeechRecognition.cancel();
    setRecording(null);
  }, []);

  const handleCopy = useCallback(async (key: string, value: string) => {
    setCopyError('');
    const copied = await copyToClipboard(value);
    if (!copied) {
      setCopyError('Could not copy to the clipboard. Select the text and copy it manually.');
      return;
    }
    setCopyStatus(key);
    window.setTimeout(() => setCopyStatus((current) => (current === key ? '' : current)), 1800);
  }, []);

  const handleSpeak = useCallback(
    async (entry: TranslationEntry) => {
      if (!entry.translatedText) return;
      if (speakingEntryId === entry.id) {
        browserSpeechSynthesis.cancel();
        setSpeakingEntryId(null);
        return;
      }
      setSpeechError('');
      browserSpeechSynthesis.cancel();
      setSpeakingEntryId(entry.id);
      try {
        await browserSpeechSynthesis.speak(
          entry.translatedText,
          entry.targetLanguage.speechLocale,
        );
      } catch (error) {
        setSpeechError(errMessage(error));
      } finally {
        setSpeakingEntryId((current) => (current === entry.id ? null : current));
      }
    },
    [speakingEntryId],
  );

  const startNewConversation = useCallback(() => {
    browserSpeechRecognition.cancel();
    browserSpeechSynthesis.cancel();
    setEntries([]);
    setWaiterInput('');
    setCustomerInput('');
    setFormError('');
    setSpeechError('');
    setCopyError('');
    setCopyStatus('');
    setRecording(null);
    setSpeakingEntryId(null);
    setActiveRequest(null);
    waiterInputRef.current?.focus();
  }, []);

  const busy = activeRequest !== null || recording !== null;
  const disabled = serverEnabled === false || busy;

  const renderComposer = (direction: TranslationDirection) => {
    const waiterSide = direction === 'waiter-to-customer';
    const source = waiterSide ? waiterLanguage : customerLanguage;
    const target = waiterSide ? customerLanguage : waiterLanguage;
    const value = waiterSide ? waiterInput : customerInput;
    const setValue = waiterSide ? setWaiterInput : setCustomerInput;
    const inputRef = waiterSide ? waiterInputRef : customerInputRef;
    const inputId = waiterSide ? 'waiter-message' : 'customer-message';
    const sourceName = source?.name ?? 'language';
    const targetName = target?.name ?? 'language';
    const isRecording = recording === direction;

    return (
      <Box
        component="section"
        aria-label={
          waiterSide ? 'Waiter to customer translation' : 'Customer to waiter translation'
        }
        className="bg-white border border-gray-200 rounded-xl p-4"
      >
        <Typography className="!font-semibold">
          {waiterSide ? 'Say to the customer' : 'Customer said'}
        </Typography>
        <Typography variant="body2" className="!text-gray-600 mb-2">
          {sourceName} → {targetName}
          {source?.nativeName && source.nativeName !== source.name
            ? ` · ${source.nativeName}`
            : ''}
        </Typography>

        <TextField
          inputRef={inputRef}
          id={inputId}
          label={
            waiterSide
              ? `Waiter message (${sourceName})`
              : `Customer message (${sourceName})`
          }
          placeholder={
            waiterSide
              ? 'Type what you want to say to the customer…'
              : 'Type what the customer said…'
          }
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              handleTranslate(direction);
            }
          }}
          multiline
          minRows={3}
          maxRows={6}
          fullWidth
          disabled={busy}
          slotProps={{
            htmlInput: {
              maxLength: MAX_MESSAGE_CHARS,
              'aria-describedby': `${inputId}-hint`,
            },
          }}
        />
        <Typography id={`${inputId}-hint`} variant="caption" className="!text-gray-500 block mt-1">
          {value.length}/{MAX_MESSAGE_CHARS} characters. Ctrl+Enter (or ⌘+Enter) translates.
        </Typography>

        <Box className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="contained"
            className="!bg-[#e94560] hover:!bg-[#d63d54] !normal-case"
            onClick={() => handleTranslate(direction)}
            disabled={disabled || value.trim().length === 0}
            aria-label={waiterSide ? 'Translate waiter message' : 'Translate customer message'}
          >
            {isRecording ? 'Listening…' : 'Translate'}
          </Button>
          {isRecording ? (
            <Button
              type="button"
              onClick={handleCancelRecording}
              className="!normal-case"
              aria-label="Cancel speech recording"
            >
              Cancel recording
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void handleDictate(direction)}
              disabled={!recognitionSupported || disabled}
              className="!normal-case"
              aria-label={
                waiterSide ? 'Dictate waiter message' : 'Dictate customer message'
              }
            >
              Dictate
            </Button>
          )}
          {value && (
            <Button
              type="button"
              onClick={() => setValue('')}
              disabled={busy}
              className="!normal-case"
            >
              Clear text
            </Button>
          )}
        </Box>
        {isRecording && (
          <Typography role="status" variant="body2" className="!text-gray-600 mt-2">
            Listening. Speak once, then review the transcript before translating.
          </Typography>
        )}
        {activeRequest === direction && (
          <Box className="flex items-center gap-2 mt-2" role="status">
            <CircularProgress size={16} />
            <Typography variant="body2" className="!text-gray-600">
              Translating…
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box className="flex flex-col">
      <PageHeader
        title="Waiter interpreter"
        action={
          <Button
            onClick={startNewConversation}
            className="!normal-case"
            disabled={entries.length === 0 && !waiterInput && !customerInput}
          >
            New conversation
          </Button>
        }
      />

      <Typography variant="body2" className="!text-gray-600 mb-2">
        Translate between you and a customer. The original text stays visible, nothing is submitted
        to the kitchen or reservation system, and this conversation is not saved after you leave the
        page.
      </Typography>

      <Alert severity="warning" className="!mb-3">
        Treat translations as assistance, not proof. Always verify allergy, dietary,
        cross-contamination, price, quantity and reservation details with the customer and the
        restaurant before acting.
      </Alert>

      {serverEnabled === false && (
        <Alert severity="info" className="!mb-3">
          The waiter interpreter is not enabled on the server. Ask an administrator to configure
          the AI translation provider.
        </Alert>
      )}
      {languageError && (
        <Alert severity="warning" className="!mb-3" onClose={() => setLanguageError('')}>
          {languageError}
        </Alert>
      )}
      {serverEnabled !== false && !languageError && languages.length > 1 && (
        <Typography variant="caption" className="!text-gray-500 mb-2 block">
          Language options are curated by the app. Translation quality and coverage for each
          language pair depend on the configured provider and are not guaranteed.
        </Typography>
      )}

      <Box
        component="section"
        aria-label="Language selection"
        className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3"
      >
        <Box className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <TextField
            select
            id="waiter-language"
            label="Waiter language"
            value={waiterLanguageCode}
            onChange={(event) => setWaiterLanguageCode(event.target.value)}
            fullWidth
            size="small"
          >
            {languages.map((language) => (
              <MenuItem key={language.code} value={language.code}>
                {language.name} — {language.nativeName}
              </MenuItem>
            ))}
          </TextField>
          <Button
            type="button"
            onClick={handleSwapLanguages}
            className="!normal-case"
            aria-label="Swap waiter and customer languages"
            disabled={busy}
          >
            Swap
          </Button>
          <TextField
            select
            id="customer-language"
            label="Customer language"
            value={customerLanguageCode}
            onChange={(event) => setCustomerLanguageCode(event.target.value)}
            fullWidth
            size="small"
          >
            {languages.map((language) => (
              <MenuItem key={language.code} value={language.code}>
                {language.name} — {language.nativeName}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

      {formError && (
        <Alert severity="error" className="!mb-3" onClose={() => setFormError('')}>
          {formError}
        </Alert>
      )}
      {speechError && (
        <Alert severity="warning" className="!mb-3" onClose={() => setSpeechError('')}>
          {speechError}
        </Alert>
      )}
      {!recognitionSupported && (
        <Typography variant="caption" className="!text-gray-500 mb-2 block">
          Speech recognition is not available in this browser. The text interpreter works normally.
        </Typography>
      )}
      {!synthesisSupported && (
        <Typography variant="caption" className="!text-gray-500 mb-2 block">
          Speech playback is not available in this browser. Translated text remains available.
        </Typography>
      )}

      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {renderComposer('waiter-to-customer')}
        {renderComposer('customer-to-waiter')}
      </Box>

      <Box
        component="section"
        aria-label="Translation history"
        className="mt-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {entries.length === 0 ? (
          <Box className="text-center py-8 border border-dashed border-gray-300 rounded-xl">
            <Typography className="!font-semibold">No translations yet</Typography>
            <Typography variant="body2" className="!text-gray-600">
              Type a message above, or dictate one, then translate. Both the original and the
              translation will stay visible here.
            </Typography>
          </Box>
        ) : (
          <Box className="space-y-3">
            {entries.map((entry, index) => {
              const originalKey = `${entry.id}:original`;
              const translatedKey = `${entry.id}:translated`;
              return (
                <Box
                  component="article"
                  key={entry.id}
                  aria-label={`Translation ${index + 1}`}
                  className={`rounded-xl border p-4 ${
                    entry.status === 'error'
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Box className="flex flex-wrap items-center gap-2 mb-2">
                    <Chip size="small" label={directionLabel(entry.direction)} />
                    <Typography variant="caption" className="!text-gray-500">
                      {entry.sourceLanguage.name} → {entry.targetLanguage.name} ·{' '}
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </Typography>
                    {entry.status === 'success' && entry.requiresHumanVerification && (
                      <Chip size="small" color="warning" label="Needs verification" />
                    )}
                    {entry.status === 'pending' && (
                      <Chip size="small" color="info" label="Translating" />
                    )}
                    {entry.status === 'error' && (
                      <Chip size="small" color="error" label="Translation failed" />
                    )}
                  </Box>

                  <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Box>
                      <Box className="flex items-center justify-between gap-2">
                        <Typography variant="caption" className="!font-semibold !uppercase !text-gray-500">
                          Original · {entry.sourceLanguage.name}
                        </Typography>
                        <Box className="flex gap-1">
                          {entry.status === 'success' && (
                            <Button
                              size="small"
                              className="!normal-case"
                              onClick={() => handleEdit(entry)}
                              disabled={busy}
                              aria-label={`Edit original translation ${index + 1}`}
                            >
                              Edit original
                            </Button>
                          )}
                          <Button
                            size="small"
                            className="!normal-case"
                            onClick={() => void handleCopy(originalKey, entry.sourceText)}
                            aria-label={`Copy original translation ${index + 1}`}
                          >
                            {copyStatus === originalKey ? 'Copied' : 'Copy original'}
                          </Button>
                        </Box>
                      </Box>
                      <Typography
                        className="whitespace-pre-wrap break-words !text-[0.95rem]"
                        dir={entry.sourceLanguage.direction}
                      >
                        {entry.sourceText}
                      </Typography>
                    </Box>

                    <Box>
                      <Box className="flex items-center justify-between gap-2">
                        <Typography variant="caption" className="!font-semibold !uppercase !text-gray-500">
                          Translation · {entry.targetLanguage.name}
                        </Typography>
                        {entry.status === 'success' && entry.translatedText && (
                          <Box className="flex gap-1">
                            <Button
                              size="small"
                              className="!normal-case"
                              onClick={() =>
                                void handleCopy(translatedKey, entry.translatedText ?? '')
                              }
                              aria-label={`Copy translation ${index + 1}`}
                            >
                              {copyStatus === translatedKey ? 'Copied' : 'Copy translation'}
                            </Button>
                            <Button
                              size="small"
                              className="!normal-case"
                              onClick={() => void handleSpeak(entry)}
                              disabled={!synthesisSupported}
                              aria-label={
                                speakingEntryId === entry.id
                                  ? `Stop speaking translation ${index + 1}`
                                  : `Listen to translation ${index + 1}`
                              }
                            >
                              {speakingEntryId === entry.id ? 'Stop' : 'Listen'}
                            </Button>
                          </Box>
                        )}
                      </Box>

                      {entry.status === 'pending' && (
                        <Box className="flex items-center gap-2" role="status">
                          <CircularProgress size={16} />
                          <Typography variant="body2" className="!text-gray-600">
                            Translating…
                          </Typography>
                        </Box>
                      )}

                      {entry.status === 'error' && (
                        <Box>
                          <Typography variant="body2" className="!text-red-700">
                            {entry.error}
                          </Typography>
                          <Box className="flex gap-2 mt-2">
                            <Button
                              size="small"
                              variant="outlined"
                              className="!normal-case"
                              onClick={() => handleRetry(entry)}
                              disabled={busy}
                            >
                              Retry
                            </Button>
                            <Button
                              size="small"
                              className="!normal-case"
                              onClick={() => handleEdit(entry)}
                              disabled={busy}
                            >
                              Edit original
                            </Button>
                          </Box>
                        </Box>
                      )}

                      {entry.status === 'success' && (
                        <>
                          <Typography
                            className="whitespace-pre-wrap break-words !text-[0.95rem]"
                            dir={entry.targetLanguage.direction}
                          >
                            {entry.translatedText}
                          </Typography>
                          {entry.detectedSourceLanguageName && (
                            <Typography variant="caption" className="!text-gray-500 block mt-1">
                              Detected source: {entry.detectedSourceLanguageName}
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
                  </Box>

                  {entry.status === 'success' && entry.requiresHumanVerification && (
                    <Alert severity="warning" className="!mt-3" role="alert">
                      <Typography variant="body2" className="!font-semibold">
                        Check this translation before showing or acting on it
                      </Typography>
                      {(entry.verificationReasons?.length ?? 0) > 0 && (
                        <ul className="list-disc pl-5 mt-1">
                          {entry.verificationReasons!.map((reason) => (
                            <li key={reason}>
                              <Typography variant="body2">{reason}</Typography>
                            </li>
                          ))}
                        </ul>
                      )}
                      {entry.safetySensitive && (
                        <Typography variant="body2" className="mt-1">
                          A translated allergy or dietary statement does not prove a dish is safe.
                        </Typography>
                      )}
                    </Alert>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {copyError && (
        <Alert severity="warning" className="!mt-3" onClose={() => setCopyError('')}>
          {copyError}
        </Alert>
      )}

      <Typography variant="caption" className="!text-gray-500 mt-3 block">
        Text sent for translation is processed by the configured AI provider. This page does not
        save conversations or audio. Do not rely on a translation for allergy safety; verify with
        restaurant staff.
      </Typography>
    </Box>
  );
}

// Keep the helper exported for focused component tests without duplicating the
// display convention in test files.
export { directionLabel };
