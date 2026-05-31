let voiceAlertsEnabled = true
let currentLanguage = 'en'
const lastSpoken = {}

export function setVoiceAlertsEnabled(enabled) {
  voiceAlertsEnabled = !!enabled
}

export function setVoiceLanguage(lang) {
  if (['en', 'ta', 'hi'].includes(lang)) {
    currentLanguage = lang
  }
}

export function speakAlert(type, text) {
  if (!voiceAlertsEnabled) return

  const now = Date.now()
  // 60 seconds deduplication check (Step 4)
  if (lastSpoken[type] && (now - lastSpoken[type] < 60000)) {
    return
  }

  lastSpoken[type] = now

  if ('speechSynthesis' in window) {
    // 1. Cancel overlapping or stale speech (Step 8)
    window.speechSynthesis.cancel()

    // 2. Initialize Speech Synthesis Utterance
    const utterance = new SpeechSynthesisUtterance(text)

    // 3. Choose dynamic matching voice based on prepared language code (Step 7)
    let langCode = 'en-US'
    if (currentLanguage === 'ta') langCode = 'ta-IN'
    else if (currentLanguage === 'hi') langCode = 'hi-IN'
    else langCode = 'en-IN'

    utterance.lang = langCode
    utterance.rate = 1.0 // Natural pace speed
    utterance.volume = 1.0 // Full volume alerts

    const voices = window.speechSynthesis.getVoices()
    const matchingVoice = voices.find((v) => v.lang.includes(langCode))
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    // 4. Speak message
    window.speechSynthesis.speak(utterance)
  }
}
