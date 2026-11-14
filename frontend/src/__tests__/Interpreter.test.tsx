import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Interpreter from '../pages/Interpreter';
import { useAuthStore } from '../store/authStore';
import {
  getInterpreterLanguages,
  translateInterpreterMessage,
} from '../api/interpreter';
import { browserSpeechRecognition, SpeechRecognitionError } from '../services/speechRecognition';
import { browserSpeechSynthesis } from '../services/speechSynthesis';

jest.mock('../api/interpreter', () => {
  const actual = jest.requireActual('../api/interpreter');
  return {
    ...actual,
    getInterpreterLanguages: jest.fn(),
    translateInterpreterMessage: jest.fn(),
  };
});

jest.mock('../services/speechRecognition', () => {
  const actual = jest.requireActual('../services/speechRecognition');
  return {
    ...actual,
    browserSpeechRecognition: {
      isSupported: jest.fn(() => true),
      start: jest.fn(),
      cancel: jest.fn(),
    },
  };
});

jest.mock('../services/speechSynthesis', () => {
  const actual = jest.requireActual('../services/speechSynthesis');
  return {
    ...actual,
    browserSpeechSynthesis: {
      isSupported: jest.fn(() => true),
      speak: jest.fn(),
      cancel: jest.fn(),
    },
  };
});

const languagesMock = getInterpreterLanguages as jest.MockedFunction<
  typeof getInterpreterLanguages
>;
const translateMock = translateInterpreterMessage as jest.MockedFunction<
  typeof translateInterpreterMessage
>;
const recognitionStart = browserSpeechRecognition.start as jest.Mock;
const recognitionCancel = browserSpeechRecognition.cancel as jest.Mock;
const recognitionSupported = browserSpeechRecognition.isSupported as jest.Mock;
const synthesisSpeak = browserSpeechSynthesis.speak as jest.Mock;
const synthesisCancel = browserSpeechSynthesis.cancel as jest.Mock;
const synthesisSupported = browserSpeechSynthesis.isSupported as jest.Mock;

jest.setTimeout(20000);

const italian = {
  code: 'it',
  name: 'Italian',
  nativeName: 'Italiano',
  direction: 'ltr' as const,
  speechLocale: 'it-IT',
};
const albanian = {
  code: 'sq',
  name: 'Albanian',
  nativeName: 'Shqip',
  direction: 'ltr' as const,
  speechLocale: 'sq-AL',
};

const languagesResponse = {
  enabled: true,
  languages: [albanian, italian],
};

const translationResponse = (overrides: Record<string, unknown> = {}) => ({
  translationId: 'tr-1',
  direction: 'waiter-to-customer' as const,
  sourceText: 'Mirëdita',
  translatedText: 'Buongiorno',
  sourceLanguage: albanian,
  targetLanguage: italian,
  detectedSourceLanguage: 'sq',
  detectedSourceLanguageName: 'Albanian',
  uncertain: false,
  uncertaintyReasons: [],
  safetySensitive: false,
  requiresHumanVerification: false,
  verificationReasons: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

const signIn = () => {
  useAuthStore.setState({
    user: {
      _id: 'staff-1',
      name: 'Sam',
      email: 'sam@example.com',
      role: 'staff',
      token: 'token-123',
    },
  });
};

const renderInterpreter = () =>
  render(
    <MemoryRouter>
      <Interpreter />
    </MemoryRouter>,
  );

const chooseWaiterLanguage = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /waiter language/i }));
  const option = await screen.findByRole('option', { name });
  await user.click(option);
};

describe('Waiter interpreter page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null });
    signIn();
    languagesMock.mockResolvedValue(languagesResponse);
    recognitionSupported.mockReturnValue(true);
    synthesisSupported.mockReturnValue(true);
    recognitionStart.mockResolvedValue('Mirëdita');
    recognitionCancel.mockReset();
    synthesisSpeak.mockResolvedValue(undefined);
    synthesisCancel.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it('loads language options and lets the waiter change or swap languages', async () => {
    const user = userEvent.setup();
    renderInterpreter();

    const waiterSelect = await screen.findByRole('combobox', { name: /waiter language/i });
    const customerSelect = screen.getByRole('combobox', { name: /customer language/i });
    await waitFor(() => expect(waiterSelect).toHaveTextContent('Albanian'));

    await user.click(screen.getByRole('button', { name: /swap waiter and customer languages/i }));
    expect(waiterSelect).toHaveTextContent('Italian');
    expect(customerSelect).toHaveTextContent('Albanian');

    await chooseWaiterLanguage(user, /^Albanian/);
    expect(waiterSelect).toHaveTextContent('Albanian');
  });

  it('translates a waiter message to the customer language and keeps the original visible', async () => {
    translateMock.mockResolvedValue(translationResponse() as any);
    const user = userEvent.setup();
    renderInterpreter();

    const input = await screen.findByRole('textbox', { name: /waiter message/i });
    await user.type(input, 'Mirëdita');
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));

    expect(await screen.findByText('Buongiorno')).toBeInTheDocument();
    expect(screen.getByText('Mirëdita')).toBeInTheDocument();
    expect(screen.getByText(/original · albanian/i)).toBeInTheDocument();
    expect(screen.getByText(/translation · italian/i)).toBeInTheDocument();
    expect(translateMock).toHaveBeenCalledWith(
      {
        message: 'Mirëdita',
        sourceLanguage: 'sq',
        targetLanguage: 'it',
        direction: 'waiter-to-customer',
      },
      'token-123',
    );
  });

  it('translates a customer response back to the waiter language', async () => {
    translateMock.mockResolvedValue(
      translationResponse({
        direction: 'customer-to-waiter',
        sourceText: 'Buongiorno',
        translatedText: 'Mirëdita',
        sourceLanguage: italian,
        targetLanguage: albanian,
      }) as any,
    );
    const user = userEvent.setup();
    renderInterpreter();

    await user.type(
      await screen.findByRole('textbox', { name: /customer message/i }),
      'Buongiorno',
    );
    await user.click(screen.getByRole('button', { name: /translate customer message/i }));

    expect(await screen.findByText('Mirëdita')).toBeInTheDocument();
    expect(screen.getByText('Buongiorno')).toBeInTheDocument();
    expect(translateMock).toHaveBeenCalledWith(
      {
        message: 'Buongiorno',
        sourceLanguage: 'it',
        targetLanguage: 'sq',
        direction: 'customer-to-waiter',
      },
      'token-123',
    );
  });

  it('shows a loading state while the provider is working', async () => {
    let resolveTranslation: (value: any) => void = () => undefined;
    translateMock.mockReturnValue(
      new Promise((resolve) => {
        resolveTranslation = resolve;
      }),
    );
    const user = userEvent.setup();
    renderInterpreter();

    await user.type(await screen.findByRole('textbox', { name: /waiter message/i }), 'Mirëdita');
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));

    expect((await screen.findAllByText(/translating…/i)).length).toBeGreaterThan(0);
    await act(async () => {
      resolveTranslation(translationResponse());
    });
    expect(await screen.findByText('Buongiorno')).toBeInTheDocument();
  });

  it('shows an error and retries without duplicating the original message', async () => {
    translateMock
      .mockRejectedValueOnce(new Error('The translation service is busy.'))
      .mockResolvedValueOnce(translationResponse() as any);
    const user = userEvent.setup();
    renderInterpreter();

    await user.type(await screen.findByRole('textbox', { name: /waiter message/i }), 'Mirëdita');
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));

    expect(await screen.findByText('The translation service is busy.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^retry$/i }));

    expect(await screen.findByText('Buongiorno')).toBeInTheDocument();
    expect(translateMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText('Mirëdita')).toHaveLength(1);
  });

  it('edits the original text and requests a new translation', async () => {
    const user = userEvent.setup();
    translateMock.mockResolvedValue(translationResponse() as any);
    renderInterpreter();

    await user.type(await screen.findByRole('textbox', { name: /waiter message/i }), 'Mirëdita');
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));
    expect(await screen.findByText('Buongiorno')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit original/i }));
    const input = screen.getByRole('textbox', { name: /waiter message/i });
    expect(input).toHaveValue('Mirëdita');

    await user.clear(input);
    await user.type(input, 'Faleminderit');
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));
    expect(translateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: 'Faleminderit' }),
      'token-123',
    );
  });

  it('copies the original and translated text separately', async () => {
    translateMock.mockResolvedValue(translationResponse() as any);
    const user = userEvent.setup();
    const writeText = jest.spyOn(navigator.clipboard, 'writeText');
    renderInterpreter();

    await user.type(await screen.findByRole('textbox', { name: /waiter message/i }), 'Mirëdita');
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));
    await screen.findByText('Buongiorno');

    await user.click(screen.getByRole('button', { name: /copy original translation 1/i }));
    expect(writeText).toHaveBeenCalledWith('Mirëdita');
    expect(screen.getByRole('button', { name: /copy original translation 1/i })).toHaveTextContent(
      'Copied',
    );

    await user.click(screen.getByRole('button', { name: /copy translation 1/i }));
    expect(writeText).toHaveBeenCalledWith('Buongiorno');
  });

  it('surfaces uncertainty and safety-sensitive translation warnings', async () => {
    translateMock.mockResolvedValue(
      translationResponse({
        sourceText: 'I am allergic to nuts, no peanuts.',
        translatedText: 'Jam alergjik ndaj arrave, pa kikirikë.',
        sourceLanguage: {
          code: 'en',
          name: 'English',
          nativeName: 'English',
          direction: 'ltr',
          speechLocale: 'en-US',
        },
        uncertain: true,
        uncertaintyReasons: ['The provider reported uncertainty.'],
        safetySensitive: true,
        requiresHumanVerification: true,
        verificationReasons: [
          'The message mentions allergies, dietary needs or ingredients.',
        ],
      }) as any,
    );
    const user = userEvent.setup();
    renderInterpreter();

    await user.type(
      await screen.findByRole('textbox', { name: /waiter message/i }),
      'I am allergic to nuts, no peanuts.',
    );
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));

    expect(
      await screen.findByText(/check this translation before showing or acting/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the message mentions allergies, dietary needs or ingredients/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Needs verification')).toBeInTheDocument();
    expect(
      screen.getByText(/a translated allergy or dietary statement does not prove a dish is safe/i),
    ).toBeInTheDocument();
  });

  it('keeps the text workflow usable when speech recognition and synthesis are unsupported', async () => {
    recognitionSupported.mockReturnValue(false);
    synthesisSupported.mockReturnValue(false);
    translateMock.mockResolvedValue(translationResponse() as any);
    const user = userEvent.setup();
    renderInterpreter();

    expect(
      await screen.findByText(/speech recognition is not available in this browser/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/speech playback is not available/i)).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: /dictate/i })) {
      expect(button).toBeDisabled();
    }

    await user.type(await screen.findByRole('textbox', { name: /waiter message/i }), 'Mirëdita');
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));
    expect(await screen.findByText('Buongiorno')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /listen to translation 1/i })).toBeDisabled();
  });

  it('handles denied microphone permission and leaves text input available', async () => {
    recognitionStart.mockRejectedValue(
      new SpeechRecognitionError(
        'not-allowed',
        'Microphone permission was denied. Allow microphone access or type the message instead.',
      ),
    );
    const user = userEvent.setup();
    renderInterpreter();

    await user.click(await screen.findByRole('button', { name: /dictate waiter message/i }));

    expect(
      await screen.findByText(/microphone permission was denied/i),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /waiter message/i }), 'Typed instead');
    expect(screen.getByRole('textbox', { name: /waiter message/i })).toHaveValue('Typed instead');
  });

  it('only speaks a translation after an explicit Listen action and can stop playback', async () => {
    let resolveSpeech: () => void = () => undefined;
    synthesisSpeak.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSpeech = resolve;
      }),
    );
    translateMock.mockResolvedValue(translationResponse() as any);
    const user = userEvent.setup();
    renderInterpreter();

    await user.type(await screen.findByRole('textbox', { name: /waiter message/i }), 'Mirëdita');
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));
    await screen.findByText('Buongiorno');
    expect(synthesisSpeak).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /listen to translation 1/i }));
    expect(synthesisSpeak).toHaveBeenCalledWith('Buongiorno', 'it-IT');
    expect(
      screen.getByRole('button', { name: /stop speaking translation 1/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /stop speaking translation 1/i }));
    expect(synthesisCancel).toHaveBeenCalled();
    await act(async () => {
      resolveSpeech();
    });
  });

  it('starts a new conversation without clearing the selected languages', async () => {
    translateMock.mockResolvedValue(translationResponse() as any);
    const user = userEvent.setup();
    renderInterpreter();

    await user.type(await screen.findByRole('textbox', { name: /waiter message/i }), 'Mirëdita');
    await user.click(screen.getByRole('button', { name: /translate waiter message/i }));
    await screen.findByText('Buongiorno');

    await user.click(screen.getByRole('button', { name: /new conversation/i }));
    expect(screen.queryByText('Buongiorno')).not.toBeInTheDocument();
    expect(screen.getByText(/no translations yet/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /waiter language/i })).toHaveTextContent(
      'Albanian',
    );
  });
});
