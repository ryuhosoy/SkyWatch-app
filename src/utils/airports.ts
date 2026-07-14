/** 日本・近隣地域（漢字・かな表記） */
import { isJapanese, t } from '../i18n';

const DOMESTIC_AIRPORT_NAMES: Record<string, string> = {
  RJTT: '東京・羽田',
  RJAA: '成田',
  RJBB: '関西',
  RJGG: '中部',
  RJFF: '福岡',
  RJCC: '新千歳',
  ROAH: '那覇',
  RJSS: '仙台',
  RJFK: '鹿児島',
  RJOA: '広島',
  RJOT: '高松',
  RJOK: '高知',
  RJFT: '熊本',
  RJFU: '福江',
  RJBE: '神戸',
  RJCH: '丘珠',
  RJAH: '百里',
  RJNK: '小松',
  RJFO: '大分',
  RJFM: '宮崎',
  RJDC: '岩国',
  RJSC: '山形',
  RJEC: '旭川',
  RJCM: '紋別',
  RJCB: '帯広',
  RJSA: '青森',
  RJSK: '秋田',
  RJOW: '岩国',
  RORS: '下地島',
  ROIG: '石垣',
  RJOO: '大阪・伊丹',
  RJNT: '富山',
  RJNS: '静岡',
  RJFS: '佐賀',
  RJSN: '新潟',
  RJOM: '松山',
  RJTC: '三沢',
  RJTL: '下総',
  RJTH: '八丈島',
  RJKB: '神戸',
  RJBD: '南紀白浜',
  RKSI: '仁川',
  RKSS: '金浦',
  RKPC: '済州',
  RCTP: '台北・桃園',
  RCSS: '台北・松山',
  VHHH: '香港',
  ZSPD: '上海・浦东',
  ZGGG: '広州',
  ZBAA: '北京・首都',
  WSSS: 'シンガポール',
};

const DOMESTIC_AIRPORT_NAMES_BY_IATA: Record<string, string> = {
  HND: '東京・羽田',
  NRT: '成田',
  KIX: '関西',
  NGO: '中部',
  FUK: '福岡',
  CTS: '新千歳',
  OKA: '那覇',
  SDJ: '仙台',
  KOJ: '鹿児島',
  HIJ: '広島',
  TAK: '高松',
  KCZ: '高知',
  KMJ: '熊本',
  UKB: '神戸',
  ITM: '大阪・伊丹',
  OIT: '大分',
  KMI: '宮崎',
  MYJ: '松山',
  ICN: '仁川',
  GMP: '金浦',
  CJU: '済州',
  TPE: '台北・桃園',
  TSA: '台北・松山',
  HKG: '香港',
  PVG: '上海・浦东',
  CAN: '広州',
  PEK: '北京・首都',
  SIN: 'シンガポール',
};

/** 海外空港 ICAO → カタカナ */
const OVERSEAS_KATAKANA_BY_ICAO: Record<string, string> = {
  KLAX: 'ロサンゼルス',
  KSFO: 'サンフランシスコ',
  KJFK: 'ニューヨーク・JFK',
  KEWR: 'ニューヨーク・ニューアーク',
  KLGA: 'ニューヨーク・ラガーディア',
  KORD: 'シカゴ',
  KATL: 'アトランタ',
  KDEN: 'デンバー',
  KDFW: 'ダラス',
  KIAH: 'ヒューストン',
  KMIA: 'マイアミ',
  KBOS: 'ボストン',
  KSEA: 'シアトル',
  KLAS: 'ラスベガス',
  KPHX: 'フェニックス',
  KMCO: 'オーランド',
  KDTW: 'デトロイト',
  KMSP: 'ミネアポリス',
  KPHL: 'フィラデルフィア',
  KCLT: 'シャーロット',
  KDCA: 'ワシントン・レーガン',
  KIAD: 'ワシントン・ダレス',
  KPDX: 'ポートランド',
  KSAN: 'サンディエゴ',
  KHNL: 'ホノルル',
  PANC: 'アンカレッジ',
  CYYZ: 'トロント',
  CYVR: 'バンクーバー',
  EGLL: 'ロンドン・ヒースロー',
  EGKK: 'ロンドン・ガトウィック',
  EGSS: 'ロンドン・スタンステッド',
  EGGW: 'ロンドン・ルートン',
  EGCC: 'マンチェスター',
  EGPH: 'エディンバラ',
  EGBB: 'バーミンガム',
  LFPG: 'パリ・シャルル・ド・ゴール',
  LFPO: 'パリ・オルリー',
  LFBO: 'トゥールーズ',
  LFMN: 'ニース',
  EDDF: 'フランクフルト',
  EDDM: 'ミュンヘン',
  EDDB: 'ベルリン',
  EDDL: 'デュッセルドルフ',
  EHAM: 'アムステルダム',
  LEMD: 'マドリード',
  LEBL: 'バルセロナ',
  LIRF: 'ローマ・フィウミチーノ',
  LIMC: 'ミラノ・マルペンサ',
  LIMF: 'トリノ',
  LSZH: 'チューリッヒ',
  EBBR: 'ブリュッセル',
  EIDW: 'ダブリン',
  LOWW: 'ウィーン',
  EKCH: 'コペンハーゲン',
  ENGM: 'オスロ',
  ESSA: 'ストックホルム',
  EFHK: 'ヘルシンキ',
  UUDD: 'モスクワ・シェレメーチェヴォ',
  LGAV: 'アテネ',
  LTFM: 'イスタンブール',
  LTBJ: 'イズミル',
  LEMH: 'マホン',
  LDSP: 'スプリト',
  LDDU: 'ドブロブニク',
  LIRN: 'ナポリ',
  LEPA: 'パルマ',
  LEBB: 'ビルバオ',
  LCLK: 'ラルナカ',
  LGRP: 'ロードス',
  LTAI: 'アンタルヤ',
  LUKK: 'ブカレスト',
  EICK: 'コーク',
  EGPF: 'グラスゴー',
  EGAA: 'ベルファスト',
  VTBS: 'バンコク・スワンナプーム',
  VTBD: 'バンコク・ドンムアン',
  RPLL: 'マニラ',
  WMKK: 'クアラルンプール',
  WIII: 'ジャカルタ',
  VIDP: 'デリー',
  VABB: 'ムンバイ',
  VECC: 'コルカタ',
  VOBL: 'バンガロール',
  OMDB: 'ドバイ',
  OMAA: 'アブダビ',
  OTHH: 'ドーハ',
  YSSY: 'シドニー',
  YMML: 'メルボルネ',
  YBBN: 'ブリスベン',
  NZAA: 'オークランド',
  PHNL: 'ホノルル',
  MMMX: 'メキシコシティ',
  SBGR: 'サンパウロ',
  SAEZ: 'ブエノスアイレス',
  FACT: 'ケープタウン',
  FAOR: 'ヨハネスブルグ',
};

/** 海外空港 IATA → カタカナ */
const OVERSEAS_KATAKANA_BY_IATA: Record<string, string> = {
  LAX: 'ロサンゼルス',
  SFO: 'サンフランシスコ',
  JFK: 'ニューヨーク・JFK',
  EWR: 'ニューヨーク・ニューアーク',
  LGA: 'ニューヨーク・ラガーディア',
  ORD: 'シカゴ',
  ATL: 'アトランタ',
  DEN: 'デンバー',
  DFW: 'ダラス',
  IAH: 'ヒューストン',
  MIA: 'マイアミ',
  BOS: 'ボストン',
  SEA: 'シアトル',
  LAS: 'ラスベガス',
  PHX: 'フェニックス',
  MCO: 'オーランド',
  DTW: 'デトロイト',
  MSP: 'ミネアポリス',
  PHL: 'フィラデルフィア',
  CLT: 'シャーロット',
  DCA: 'ワシントン・レーガン',
  IAD: 'ワシントン・ダレス',
  HNL: 'ホノルル',
  YYZ: 'トロント',
  YVR: 'バンクーバー',
  LHR: 'ロンドン・ヒースロー',
  LGW: 'ロンドン・ガトウィック',
  STN: 'ロンドン・スタンステッド',
  LTN: 'ロンドン・ルートン',
  MAN: 'マンチェスター',
  EDI: 'エディンバラ',
  BHX: 'バーミンガム',
  CDG: 'パリ・シャルル・ド・ゴール',
  ORY: 'パリ・オルリー',
  FRA: 'フランクフルト',
  MUC: 'ミュンヘン',
  BER: 'ベルリン',
  DUS: 'デュッセルドルフ',
  AMS: 'アムステルダム',
  MAD: 'マドリード',
  BCN: 'バルセロナ',
  FCO: 'ローマ・フィウミチーノ',
  MXP: 'ミラノ・マルペンサ',
  TRN: 'トリノ',
  ZRH: 'チューリッヒ',
  BRU: 'ブリュッセル',
  DUB: 'ダブリン',
  VIE: 'ウィーン',
  CPH: 'コペンハーゲン',
  OSL: 'オスロ',
  ARN: 'ストックホルム',
  HEL: 'ヘルシンキ',
  SVO: 'モスクワ・シェレメーチェヴォ',
  ATH: 'アテネ',
  IST: 'イスタンブール',
  ADB: 'イズミル',
  SPU: 'スプリト',
  DBV: 'ドブロブニク',
  NAP: 'ナポリ',
  PMI: 'パルマ',
  BIO: 'ビルバオ',
  LCA: 'ラルナカ',
  RHO: 'ロードス',
  AYT: 'アンタルヤ',
  RMO: 'ブカレスト',
  BKK: 'バンコク',
  MNL: 'マニラ',
  KUL: 'クアラルンプール',
  CGK: 'ジャカルタ',
  DEL: 'デリー',
  BOM: 'ムンバイ',
  DXB: 'ドバイ',
  AUH: 'アブダビ',
  DOH: 'ドーハ',
  SYD: 'シドニー',
  MEL: 'メルボルネ',
  BNE: 'ブリスベン',
  AKL: 'オークランド',
  MEX: 'メキシコシティ',
  GRU: 'サンパウロ',
  EZE: 'ブエノスアイレス',
  CPT: 'ケープタウン',
  JNB: 'ヨハネスブルグ',
  JAX: 'ジャクソンビル',
  SJO: 'サンホセ',
  TTN: 'トレントン',
  PUY: 'プーラ',
  ORK: 'コーク',
  IOM: 'マン島',
  LPL: 'リバプール',
};

/** 都市名（英語）→ カタカナ（空港マップにない場合の補完） */
const CITY_KATAKANA: Record<string, string> = {
  London: 'ロンドン',
  Manchester: 'マンチェスター',
  Birmingham: 'バーミンガム',
  Edinburgh: 'エディンバラ',
  Glasgow: 'グラスゴー',
  Paris: 'パリ',
  Frankfurt: 'フランクフルト',
  Munich: 'ミュンヘン',
  Berlin: 'ベルリン',
  Amsterdam: 'アムステルダム',
  Madrid: 'マドリード',
  Barcelona: 'バルセロナ',
  Rome: 'ローマ',
  Milan: 'ミラノ',
  Turin: 'トリノ',
  Zurich: 'チューリッヒ',
  Brussels: 'ブリュッセル',
  Dublin: 'ダブリン',
  Vienna: 'ウィーン',
  Copenhagen: 'コペンハーゲン',
  Oslo: 'オスロ',
  Stockholm: 'ストックホルム',
  Helsinki: 'ヘルシンキ',
  Moscow: 'モスクワ',
  Athens: 'アテネ',
  Istanbul: 'イスタンブール',
  Izmir: 'イズミル',
  Bucharest: 'ブカレスト',
  Split: 'スプリト',
  Dubrovnik: 'ドブロブニク',
  Rhodes: 'ロードス',
  Antalya: 'アンタルヤ',
  'Los Angeles': 'ロサンゼルス',
  'San Francisco': 'サンフランシスコ',
  'New York': 'ニューヨーク',
  Chicago: 'シカゴ',
  Boston: 'ボストン',
  Washington: 'ワシントン',
  Atlanta: 'アトランタ',
  Dallas: 'ダラス',
  Houston: 'ヒューストン',
  Miami: 'マイアミ',
  Seattle: 'シアトル',
  Denver: 'デンバー',
  Phoenix: 'フェニックス',
  Orlando: 'オーランド',
  Detroit: 'デトロイト',
  Philadelphia: 'フィラデルフィア',
  Honolulu: 'ホノルル',
  Toronto: 'トロント',
  Vancouver: 'バンクーバー',
  Sydney: 'シドニー',
  Melbourne: 'メルボルネ',
  Brisbane: 'ブリスベン',
  Auckland: 'オークランド',
  Bangkok: 'バンコク',
  Manila: 'マニラ',
  'Kuala Lumpur': 'クアラルンプール',
  Jakarta: 'ジャカルタ',
  Delhi: 'デリー',
  Mumbai: 'ムンバイ',
  Dubai: 'ドバイ',
  Doha: 'ドーハ',
  'Mexico City': 'メキシコシティ',
  'São Paulo': 'サンパウロ',
  'Buenos Aires': 'ブエノスアイレス',
  'Cape Town': 'ケープタウン',
  Johannesburg: 'ヨハネスブルグ',
  Jacksonville: 'ジャクソンビル',
  'San Jose': 'サンホセ',
  Trenton: 'トレントン',
  Pula: 'プーラ',
  Cork: 'コーク',
  Liverpool: 'リバプール',
  Menorca: 'マホン',
  Naples: 'ナポリ',
  Palma: 'パルマ',
  Larnaca: 'ラルナカ',
  Nice: 'ニース',
  Toulouse: 'トゥールーズ',
};

export interface AirportDisplayOptions {
  iata?: string | null;
  municipality?: string | null;
  englishName?: string | null;
  countryIso?: string | null;
}

export interface AirportDisplay {
  code: string;
  primary: string;
  secondary: string | null;
  label: string;
}

function shortenEnglishName(name: string): string {
  return name
    .replace(/ International Airport$/i, '')
    .replace(/ Airport$/i, '')
    .trim();
}

function resolveDomesticName(icao: string, iata?: string | null): string | null {
  const fromIcao = DOMESTIC_AIRPORT_NAMES[icao];
  if (fromIcao) return fromIcao;

  const iataKey = iata?.toUpperCase();
  if (iataKey && DOMESTIC_AIRPORT_NAMES_BY_IATA[iataKey]) {
    return DOMESTIC_AIRPORT_NAMES_BY_IATA[iataKey];
  }

  return null;
}

function lookupCityKatakana(text: string): string | null {
  const direct = CITY_KATAKANA[text];
  if (direct) return direct;

  const lower = text.toLowerCase();
  for (const [key, kana] of Object.entries(CITY_KATAKANA)) {
    if (lower.includes(key.toLowerCase())) {
      return kana;
    }
  }

  return null;
}

function resolveOverseasKatakana(
  icao: string,
  iata?: string | null,
  municipality?: string | null,
  englishName?: string | null,
): string | null {
  const fromIcao = OVERSEAS_KATAKANA_BY_ICAO[icao];
  if (fromIcao) return fromIcao;

  const iataKey = iata?.toUpperCase();
  if (iataKey && OVERSEAS_KATAKANA_BY_IATA[iataKey]) {
    return OVERSEAS_KATAKANA_BY_IATA[iataKey];
  }

  if (municipality) {
    const city = lookupCityKatakana(municipality.trim());
    if (city) return city;
  }

  if (englishName) {
    const short = shortenEnglishName(englishName);
    const fromName = lookupCityKatakana(short);
    if (fromName) return fromName;
  }

  return null;
}

function isJapanAirport(icao: string, countryIso?: string | null): boolean {
  if (countryIso === 'JP') return true;
  return icao.startsWith('RJ') || icao.startsWith('RO');
}

export function formatAirportDisplay(
  code: string | null,
  options?: AirportDisplayOptions,
): AirportDisplay {
  if (!code) {
    const unknown = t('unknown');
    return { code: unknown, primary: unknown, secondary: null, label: unknown };
  }

  const icao = code.toUpperCase();
  const iata = options?.iata?.toUpperCase() ?? null;

  // English users: prefer English airport/city names from adsbdb
  if (!isJapanese) {
    const fromEnglish = options?.englishName
      ? shortenEnglishName(options.englishName)
      : null;
    const englishPrimary = fromEnglish || options?.municipality || iata || icao;
    const secondary =
      iata && iata !== englishPrimary
        ? iata
        : icao !== englishPrimary
          ? icao
          : null;
    return {
      code: icao,
      primary: englishPrimary,
      secondary,
      label: englishPrimary,
    };
  }

  const domesticName =
    isJapanAirport(icao, options?.countryIso) ? resolveDomesticName(icao, iata) : null;
  const domesticFallback = resolveDomesticName(icao, iata);
  const primaryName =
    domesticName ??
    domesticFallback ??
    resolveOverseasKatakana(icao, iata, options?.municipality, options?.englishName);

  if (primaryName) {
    const secondary = iata && iata !== primaryName ? iata : icao;
    return {
      code: icao,
      primary: primaryName,
      secondary: secondary !== primaryName ? secondary : null,
      label: primaryName,
    };
  }

  if (iata) {
    return {
      code: icao,
      primary: iata,
      secondary: icao,
      label: `${iata}（${icao}）`,
    };
  }

  return {
    code: icao,
    primary: icao,
    secondary: null,
    label: icao,
  };
}
