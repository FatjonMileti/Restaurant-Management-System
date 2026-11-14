/**
 * Optional browser text-to-speech adapter.
 *
 * Playback is always explicitly requested by the waiter. The adapter is a thin
 * replaceable wrapper so the UI can degrade to text when speech is unavailable.
 */

export class SpeechSynthesisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpeechSynthesisError';
  }
}

export interface SpeechSynthesisAdapter {
  isSupported(): boolean;
  /** Speak once; resolves when playback ends and rejects on synthesis errors. */
  speak(text: string, locale: string): Promise<void>;
  cancel(): void;
}

let activeFinish: (() => void) | null = null;

const supported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

const findVoice = (locale: string): SpeechSynthesisVoice | undefined => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const normalized = locale.toLowerCase();
  const language = normalized.split('-')[0];
  return (
    voices.find((voice) => voice.lang.toLowerCase() === normalized) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${language}-`)) ??
    voices.find((voice) => voice.lang.toLowerCase() === language)
  );
};

export const browserSpeechSynthesis: SpeechSynthesisAdapter = {
  isSupported() {
    return supported();
  },

  speak(text: string, locale: string) {
    if (!supported()) {
      return Promise.reject(
        new SpeechSynthesisError('Speech playback is not available in this browser.'),
      );
    }
    if (!text.trim()) {
      return Promise.reject(new SpeechSynthesisError('There is no translated text to speak.'));
    }

    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      const voice = findVoice(locale);
      if (voice) utterance.voice = voice;

      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (activeFinish === settleActive) activeFinish = null;
        utterance.onend = null;
        utterance.onerror = null;
        if (error) reject(error);
        else resolve();
      };
      const settleActive = () => finish();
      activeFinish = settleActive;

      utterance.onend = () => finish();
      utterance.onerror = () => {
        finish(
          new SpeechSynthesisError(
            'Speech playback failed. Check the browser voice settings or read the translation instead.',
          ),
        );
      };

      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        finish(
          new SpeechSynthesisError(
            'Speech playback could not start. Read the translation instead.',
          ),
        );
      }
    });
  },

  cancel() {
    // Resolve any pending speak() promise so callers do not await forever when
    // the browser does not emit an end/error event after cancellation.
    activeFinish?.();
    if (!supported()) return;
    window.speechSynthesis.cancel();
  },
};
