import { useState, useRef, useEffect, useCallback } from 'react';

export type SpeechLanguage = 'hi-IN' | 'en-IN';

interface VoiceInputOptions {
  language?: SpeechLanguage;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMsg: string) => void;
}

export function useVoiceInput(defaultLanguage: SpeechLanguage = 'hi-IN') {
  const [language, setLanguage] = useState<SpeechLanguage>(defaultLanguage);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [activeField, setActiveField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onResultCallbackRef = useRef<((text: string) => void) | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore already stopped
      }
    }
    setIsListening(false);
    setActiveField(null);
    setInterimTranscript('');
  }, [isListening]);

  const startListening = useCallback(
    (fieldName: string, onTextRecognized: (text: string) => void) => {
      if (!isSupported) {
        setErrorMessage('Voice input is not supported in this browser. Please use Google Chrome or Edge.');
        return;
      }

      if (isListening) {
        stopListening();
        if (activeField === fieldName) {
          return;
        }
      }

      setErrorMessage(null);
      setInterimTranscript('');
      setActiveField(fieldName);
      onResultCallbackRef.current = onTextRecognized;

      try {
        const SpeechRecognitionClass =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();

        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interim += transcript;
            }
          }

          setInterimTranscript(interim);

          if (finalTranscript.trim() && onResultCallbackRef.current) {
            onResultCallbackRef.current(finalTranscript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access was denied. Please allow microphone in browser settings.');
          } else if (event.error === 'no-speech') {
            // normal silence timeout
          } else {
            setErrorMessage(`Speech recognition error: ${event.error}`);
          }
          setIsListening(false);
          setActiveField(null);
          setInterimTranscript('');
        };

        recognition.onend = () => {
          setIsListening(false);
          setActiveField(null);
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not start speech recognition');
        setIsListening(false);
        setActiveField(null);
      }
    },
    [isSupported, isListening, activeField, language, stopListening]
  );

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // cleanup
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    language,
    setLanguage,
    activeField,
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
  };
}
