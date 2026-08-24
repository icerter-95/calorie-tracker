/**
 * Web Speech API helper. Recognition must be started from a user gesture
 * (iOS Safari / PWA). Returns null when the API is missing or blocked.
 */

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>
}

type SpeechCtor = new () => SpeechRecognitionLike

function getSpeechCtor(): SpeechCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechCtor
    webkitSpeechRecognition?: SpeechCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function isSpeechRecognitionAvailable(): boolean {
  return getSpeechCtor() != null
}

export function startSpeechRecognition(handlers: {
  onResult: (text: string) => void
  onEnd: () => void
  onError: (message: string) => void
}): { stop: () => void } | null {
  const Ctor = getSpeechCtor()
  if (!Ctor) return null

  const rec = new Ctor()
  rec.lang = navigator.language || 'en-US'
  rec.interimResults = true
  rec.continuous = false

  rec.onresult = (event) => {
    let text = ''
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0]?.transcript ?? ''
    }
    handlers.onResult(text.trim())
  }

  rec.onerror = (event) => {
    const code = event.error || ''
    if (code === 'aborted' || code === 'no-speech') {
      handlers.onEnd()
      return
    }
    if (code === 'not-allowed') {
      handlers.onError('Microphone permission was denied.')
    } else {
      handlers.onError('Could not transcribe speech. Type the meal instead.')
    }
    handlers.onEnd()
  }

  rec.onend = () => handlers.onEnd()

  try {
    rec.start()
  } catch {
    handlers.onError('Could not start the microphone.')
    return null
  }

  return {
    stop: () => {
      try {
        rec.stop()
      } catch {
        // already stopped
      }
    },
  }
}
