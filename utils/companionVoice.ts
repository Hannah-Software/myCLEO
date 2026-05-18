/**
 * Companion-mode text-to-speech helper. Wraps expo-speech so callers
 * don't need to think about queue/dedup/locale handling.
 *
 * Goals:
 *  - Speak naturally in the patient's language (es-MX or en-US default).
 *  - Never overlap: a new call cancels the previous utterance.
 *  - Cheap to call from card components on tap.
 */
import * as Speech from 'expo-speech';
import type { Language } from './companionStore';
import { ttsLocale } from './companionI18n';

let lastSpoken = '';
let lastSpokenAt = 0;

export function speak(text: string, lang: Language) {
  if (!text || !text.trim()) return;
  // Dedupe rapid double-taps so we don't queue two of the same utterance.
  const now = Date.now();
  if (text === lastSpoken && now - lastSpokenAt < 1500) return;
  lastSpoken = text;
  lastSpokenAt = now;
  try {
    Speech.stop();
  } catch {
    /* ignore — first call has nothing to stop */
  }
  Speech.speak(text, {
    language: ttsLocale(lang),
    rate: 0.9,       // slightly slower than default — easier to follow
    pitch: 1.0,
  });
}

export function stop() {
  try {
    Speech.stop();
  } catch {
    /* ignore */
  }
}
