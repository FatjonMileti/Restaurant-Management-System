/**
 * Optional browser speech-recognition adapter.
 *
 * Text translation never depends on this module. Recognition starts only after
 * an explicit user action, stops its microphone after one utterance, and keeps
 * no audio or transcript beyond the text returned to the caller.
 */

export type SpeechRecognitionErrorCode =
  | 'unsupported'
  | 'not-allowed'
  | 'audio-capture'
  | 'no-speech'
  | 'network'
  | 'cancelled'
  | 'unknown';

export class SpeechRecognitionError extends Error {
  readonly code: SpeechRecognitionErrorCode;

  constructor(code: SpeechRecognitionErrorCode, message: string) {
    super(message);
    this.name = 'SpeechRecognitionError';
    this.code = code;
  }
}

export interface SpeechRecognitionAdapter {
  isSupported(): boolean;
  /** Resolve with one final transcript; reject with a typed error. */
  start(locale: string): Promise<string>;
  /** Abort an in-flight recording and release the microphone. */
  cancel(): void;
}

interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: RecognitionAlternative;
}

interface RecognitionResultList {
  readonly length: number;
  readonly [index: number]: RecognitionResult;
}

interface RecognitionEvent {
  readonly resultIndex: number;
  readonly results: RecognitionResultList;
}

interface RecognitionErrorEvent {
  readonly error?: string;
}

interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionConstructor = new () => BrowserRecognition;

const readConstructor = (): RecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const candidate =
    (window as unknown as { SpeechRecognition?: RecognitionConstructor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor })
      .webkitSpeechRecognition;
  return candidate ?? null;
};

const mapError = (error?: string): SpeechRecognitionError => {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return new SpeechRecognitionError(
        'not-allowed',
        'Microphone permission was denied. Allow microphone access or type the message instead.',
      );
    case 'audio-capture':
      return new SpeechRecognitionError(
        'audio-capture',
        'No microphone was found. Check your device or type the message instead.',
      );
    case 'no-speech':
      return new SpeechRecognitionError(
        'no-speech',
        'No speech was detected. Try again or type the message.',
      );
    case 'network':
      return new SpeechRecognitionError(
        'network',
        'Speech recognition needs a network connection right now. Type the message instead.',
      );
    case 'aborted':
      return new SpeechRecognitionError('cancelled', 'Speech recognition was cancelled.');
    default:
      return new SpeechRecognitionError(
        'unknown',
        'Speech recognition could not complete. Type the message instead.',
      );
  }
};

let activeRecognition: BrowserRecognition | null = null;

export const browserSpeechRecognition: SpeechRecognitionAdapter = {
  isSupported() {
    return readConstructor() !== null;
  },

  start(locale: string) {
    const Recognition = readConstructor();
    if (!Recognition) {
      return Promise.reject(
        new SpeechRecognitionError(
          'unsupported',
          'Speech recognition is not available in this browser. Type the message instead.',
        ),
      );
    }

    return new Promise<string>((resolve, reject) => {
      const recognition = new Recognition();
      activeRecognition = recognition;
      let transcript = '';
      let settled = false;

      const finish = (error?: SpeechRecognitionError, text?: string) => {
        if (settled) return;
        settled = true;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        if (activeRecognition === recognition) activeRecognition = null;
        try {
          recognition.abort();
        } catch {
          // The browser may already have released the microphone.
        }
        if (error) reject(error);
        else resolve(text ?? '');
      };

      recognition.lang = locale;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (!result?.isFinal) continue;
          const alternative = result[0];
          if (alternative?.transcript) {
            transcript = `${transcript} ${alternative.transcript}`.trim();
          }
        }
      };

      recognition.onerror = (event) => {
        finish(mapError(event.error));
      };

      recognition.onend = () => {
        if (transcript) finish(undefined, transcript);
        else finish(mapError('no-speech'));
      };

      try {
        recognition.start();
      } catch {
        finish(
          new SpeechRecognitionError(
            'unknown',
            'Speech recognition could not start. Type the message instead.',
          ),
        );
      }
    });
  },

  cancel() {
    if (!activeRecognition) return;
    try {
      activeRecognition.abort();
    } catch {
      // The browser may already have released the microphone.
    }
  },
};
