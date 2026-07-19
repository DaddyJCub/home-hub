import { useCallback, useEffect, useRef, useState } from 'react'

// Voice capture for quick-add fields (E3). A thin wrapper over the Web Speech
// API, exposed as a progressive enhancement: `supported` is false where the API
// is missing (Firefox, some WebViews) so callers can hide the mic button
// entirely rather than show something that does nothing.

// The Web Speech API isn't in the standard TS lib; describe just what we use.
interface SpeechRecognitionResultLike {
  0: { transcript: string }
  isFinal: boolean
  length: number
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface UseSpeechInputOptions {
  /** Called with the recognised text when the user stops speaking. */
  onResult: (text: string) => void
  onError?: (message: string) => void
  lang?: string
}

export function useSpeechInput({ onResult, onError, lang = 'en-US' }: UseSpeechInputOptions) {
  const [supported] = useState(() => getRecognitionCtor() !== null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Keep the latest callbacks without re-creating the recognition instance.
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  onResultRef.current = onResult
  onErrorRef.current = onError

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    // Restarting cleanly avoids "already started" errors on a double tap.
    recognitionRef.current?.abort()

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript)
        .join(' ')
        .trim()
      if (transcript) onResultRef.current(transcript)
    }
    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed'
        ? 'Microphone access was blocked'
        : event.error === 'no-speech'
          ? "Didn't catch that — try again"
          : 'Voice input failed'
      onErrorRef.current?.(message)
    }
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }, [lang])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported, listening, start, stop }
}
