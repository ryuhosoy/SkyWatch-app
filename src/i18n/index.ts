import { NativeModules, Platform } from 'react-native';
import { translations, type TranslationKey } from './translations';

export type AppLocale = 'ja' | 'en';

function detectDeviceLanguage(): string {
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      const appleLocale: string | undefined =
        settings?.AppleLocale ?? settings?.AppleLanguages?.[0];
      if (appleLocale) {
        return appleLocale.replace('_', '-').split('-')[0].toLowerCase();
      }
    } 

    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    return intlLocale.replace('_', '-').split('-')[0].toLowerCase();
  } catch {
    return 'en';
  }
}

/** 端末言語が日本語なら ja、それ以外は en */
export const locale: AppLocale = detectDeviceLanguage() === 'ja' ? 'ja' : 'en';

export const isJapanese = locale === 'ja';

type Vars = Record<string, string | number>;

export function t(key: TranslationKey, vars?: Vars): string {
  let text: string = translations[locale][key] ?? translations.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

const DIRECTION_KEYS: TranslationKey[] = [
  'dirN',
  'dirNE',
  'dirE',
  'dirSE',
  'dirS',
  'dirSW',
  'dirW',
  'dirNW',
];

export function headingDirection(heading: number | null): string {
  if (heading == null) return '';
  return t(DIRECTION_KEYS[Math.round(heading / 45) % 8]);
}

export function formatLocaleTime(date: Date): string {
  return date.toLocaleTimeString(isJapanese ? 'ja-JP' : 'en-US', { hour12: false });
}
