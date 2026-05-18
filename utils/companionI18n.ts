/**
 * Companion mode strings — EN + ES.
 *
 * Spanish-first is intentional: this app's first tester (Ivan's mother)
 * is Spanish-primary. English fallback for caregivers and tester relatives.
 *
 * Rules for strings:
 *   - Calm. Never urgent unless it's an emergency contact.
 *   - Short. Read aloud by TTS — sentences over ~12 words feel rushed.
 *   - Repetition-safe. Mom may hear the same line many times a day; it
 *     should never feel scolding or impatient.
 *   - Self-orienting. Today's date, the patient's name, where she is,
 *     who Ivan/Kerri are. Cognitive scaffolding, not novelty.
 */
import type { Language } from './companionStore';

export type I18nKey =
  | 'greeting_morning'
  | 'greeting_afternoon'
  | 'greeting_evening'
  | 'greeting_night'
  | 'today_is'
  | 'you_are_at'
  | 'tap_to_hear'
  | 'meds_section_title'
  | 'meds_none_today'
  | 'meds_count_taken'
  | 'meds_due_now'
  | 'meds_overdue'
  | 'meds_upcoming'
  | 'meds_taken_check'
  | 'meds_i_took_it'
  | 'meds_thank_you'
  | 'meds_with_food'
  | 'family_section_title'
  | 'family_no_photos'
  | 'help_section_title'
  | 'help_call_button'
  | 'help_calling'
  | 'help_no_contact'
  | 'setup_welcome'
  | 'setup_who_is_this'
  | 'setup_what_language'
  | 'setup_home_location'
  | 'setup_first_contact_prompt'
  | 'setup_add_medication'
  | 'setup_finish'
  | 'setup_pin_prompt'
  | 'setup_pin_repeat'
  | 'settings_locked'
  | 'settings_enter_pin'
  | 'settings_wrong_pin'
  | 'days_monday'
  | 'days_tuesday'
  | 'days_wednesday'
  | 'days_thursday'
  | 'days_friday'
  | 'days_saturday'
  | 'days_sunday'
  | 'months_january'
  | 'months_february'
  | 'months_march'
  | 'months_april'
  | 'months_may'
  | 'months_june'
  | 'months_july'
  | 'months_august'
  | 'months_september'
  | 'months_october'
  | 'months_november'
  | 'months_december';

const STRINGS: Record<Language, Record<I18nKey, string>> = {
  en: {
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening: 'Good evening',
    greeting_night: 'Good night',
    today_is: 'Today is',
    you_are_at: 'You are at',
    tap_to_hear: 'Tap to hear this',
    meds_section_title: 'Your medications',
    meds_none_today: 'No medications scheduled today.',
    meds_count_taken: '{taken} of {total} taken today',
    meds_due_now: 'Time to take this',
    meds_overdue: 'This was due earlier — take it when you can',
    meds_upcoming: 'Later today',
    meds_taken_check: 'Already taken — good job',
    meds_i_took_it: 'I took it',
    meds_thank_you: 'Thank you',
    meds_with_food: 'Take with food',
    family_section_title: 'Your family',
    family_no_photos: 'No family photos yet.',
    help_section_title: 'Call for help',
    help_call_button: 'Call {name}',
    help_calling: 'Calling…',
    help_no_contact: 'No contact set up yet. A caregiver can add one in Settings.',
    setup_welcome: "Welcome. Let's set up your phone so it can help you each day.",
    setup_who_is_this: 'What is your name?',
    setup_what_language: 'Which language do you prefer?',
    setup_home_location: 'Where is home? (For example: at home in Houston)',
    setup_first_contact_prompt: 'Who should we call first if you need help?',
    setup_add_medication: 'Add a medication',
    setup_finish: 'Done — start using the app',
    setup_pin_prompt: 'Pick a 4-digit code for the caregiver to change settings later.',
    setup_pin_repeat: 'Enter the code again to confirm.',
    settings_locked: 'Settings are protected.',
    settings_enter_pin: 'Enter the caregiver code:',
    settings_wrong_pin: 'That code did not match. Try again.',
    days_monday: 'Monday',
    days_tuesday: 'Tuesday',
    days_wednesday: 'Wednesday',
    days_thursday: 'Thursday',
    days_friday: 'Friday',
    days_saturday: 'Saturday',
    days_sunday: 'Sunday',
    months_january: 'January',
    months_february: 'February',
    months_march: 'March',
    months_april: 'April',
    months_may: 'May',
    months_june: 'June',
    months_july: 'July',
    months_august: 'August',
    months_september: 'September',
    months_october: 'October',
    months_november: 'November',
    months_december: 'December',
  },
  es: {
    greeting_morning: 'Buenos días',
    greeting_afternoon: 'Buenas tardes',
    greeting_evening: 'Buenas tardes',
    greeting_night: 'Buenas noches',
    today_is: 'Hoy es',
    you_are_at: 'Estás en',
    tap_to_hear: 'Toca para escuchar',
    meds_section_title: 'Tus medicinas',
    meds_none_today: 'No tienes medicinas programadas hoy.',
    meds_count_taken: '{taken} de {total} tomadas hoy',
    meds_due_now: 'Es hora de tomar esta',
    meds_overdue: 'Esta debía tomarse antes — tómala cuando puedas',
    meds_upcoming: 'Más tarde hoy',
    meds_taken_check: 'Ya tomada — muy bien',
    meds_i_took_it: 'Ya la tomé',
    meds_thank_you: 'Gracias',
    meds_with_food: 'Tómala con comida',
    family_section_title: 'Tu familia',
    family_no_photos: 'Aún no hay fotos de familia.',
    help_section_title: 'Llamar para ayuda',
    help_call_button: 'Llamar a {name}',
    help_calling: 'Llamando…',
    help_no_contact: 'Aún no hay contacto. Un cuidador puede agregar uno en Ajustes.',
    setup_welcome: 'Bienvenida. Vamos a preparar tu teléfono para que te ayude cada día.',
    setup_who_is_this: '¿Cómo te llamas?',
    setup_what_language: '¿Qué idioma prefieres?',
    setup_home_location: '¿Dónde es tu casa? (Por ejemplo: en mi casa en Houston)',
    setup_first_contact_prompt: '¿A quién debemos llamar primero si necesitas ayuda?',
    setup_add_medication: 'Agregar una medicina',
    setup_finish: 'Listo — empezar a usar la app',
    setup_pin_prompt: 'Elige un código de 4 dígitos para que el cuidador pueda cambiar los ajustes más tarde.',
    setup_pin_repeat: 'Introduce el código otra vez para confirmar.',
    settings_locked: 'Los ajustes están protegidos.',
    settings_enter_pin: 'Introduce el código del cuidador:',
    settings_wrong_pin: 'Ese código no coincide. Inténtalo de nuevo.',
    days_monday: 'lunes',
    days_tuesday: 'martes',
    days_wednesday: 'miércoles',
    days_thursday: 'jueves',
    days_friday: 'viernes',
    days_saturday: 'sábado',
    days_sunday: 'domingo',
    months_january: 'enero',
    months_february: 'febrero',
    months_march: 'marzo',
    months_april: 'abril',
    months_may: 'mayo',
    months_june: 'junio',
    months_july: 'julio',
    months_august: 'agosto',
    months_september: 'septiembre',
    months_october: 'octubre',
    months_november: 'noviembre',
    months_december: 'diciembre',
  },
};

export function t(lang: Language, key: I18nKey, vars: Record<string, string | number> = {}): string {
  let s = STRINGS[lang][key] || STRINGS.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(`{${k}}`, String(v));
  }
  return s;
}

const DAYS: I18nKey[] = [
  'days_sunday', 'days_monday', 'days_tuesday', 'days_wednesday',
  'days_thursday', 'days_friday', 'days_saturday',
];
const MONTHS: I18nKey[] = [
  'months_january', 'months_february', 'months_march', 'months_april',
  'months_may', 'months_june', 'months_july', 'months_august',
  'months_september', 'months_october', 'months_november', 'months_december',
];

export function formatLocalDate(lang: Language, date: Date = new Date()): string {
  const day = t(lang, DAYS[date.getDay()]);
  const month = t(lang, MONTHS[date.getMonth()]);
  const dayNum = date.getDate();
  const year = date.getFullYear();
  if (lang === 'es') return `${day}, ${dayNum} de ${month} de ${year}`;
  return `${day}, ${month} ${dayNum}, ${year}`;
}

export function greetingFor(lang: Language, date: Date = new Date()): I18nKey {
  const h = date.getHours();
  if (h < 12) return 'greeting_morning';
  if (h < 17) return 'greeting_afternoon';
  if (h < 21) return 'greeting_evening';
  return 'greeting_night';
}

export function ttsLocale(lang: Language): string {
  return lang === 'es' ? 'es-MX' : 'en-US';
}
