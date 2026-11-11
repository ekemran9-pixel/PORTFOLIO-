/**
 * Money primitives.
 *
 * Rules (see docs/ARCHITECTURE.md §Money):
 *  - Amounts are stored as integers in the currency's minor unit (halala, fils, paisa…).
 *  - Exchange rates are stored as integers scaled by 1,000,000 ("micro") and always mean
 *    "how many BDT for 1 unit of the currency".
 *  - No floating point arithmetic is used for stored values. Multiplication and division
 *    run on BigInt and round half-up (away from zero).
 */

export type CurrencyCode =
  | 'BDT'
  | 'SAR'
  | 'AED'
  | 'QAR'
  | 'KWD'
  | 'OMR'
  | 'BHD'
  | 'MYR'
  | 'SGD'
  | 'USD'
  | 'EUR'
  | 'GBP';

export interface CurrencyInfo {
  code: CurrencyCode;
  decimals: number;
  symbol: string;
  bn: string;
  en: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  BDT: { code: 'BDT', decimals: 2, symbol: '৳', bn: 'বাংলাদেশি টাকা', en: 'Bangladeshi Taka' },
  SAR: { code: 'SAR', decimals: 2, symbol: 'SAR', bn: 'সৌদি রিয়াল', en: 'Saudi Riyal' },
  AED: { code: 'AED', decimals: 2, symbol: 'AED', bn: 'আমিরাতি দিরহাম', en: 'UAE Dirham' },
  QAR: { code: 'QAR', decimals: 2, symbol: 'QAR', bn: 'কাতারি রিয়াল', en: 'Qatari Riyal' },
  KWD: { code: 'KWD', decimals: 3, symbol: 'KWD', bn: 'কুয়েতি দিনার', en: 'Kuwaiti Dinar' },
  OMR: { code: 'OMR', decimals: 3, symbol: 'OMR', bn: 'ওমানি রিয়াল', en: 'Omani Rial' },
  BHD: { code: 'BHD', decimals: 3, symbol: 'BHD', bn: 'বাহরাইনি দিনার', en: 'Bahraini Dinar' },
  MYR: { code: 'MYR', decimals: 2, symbol: 'RM', bn: 'মালয়েশিয়ান রিঙ্গিত', en: 'Malaysian Ringgit' },
  SGD: { code: 'SGD', decimals: 2, symbol: 'S$', bn: 'সিঙ্গাপুর ডলার', en: 'Singapore Dollar' },
  USD: { code: 'USD', decimals: 2, symbol: '$', bn: 'মার্কিন ডলার', en: 'US Dollar' },
  EUR: { code: 'EUR', decimals: 2, symbol: '€', bn: 'ইউরো', en: 'Euro' },
  GBP: { code: 'GBP', decimals: 2, symbol: '£', bn: 'ব্রিটিশ পাউন্ড', en: 'British Pound' },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export interface CountryInfo {
  code: string;
  bn: string;
  en: string;
  currency: CurrencyCode;
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'SA', bn: 'সৌদি আরব', en: 'Saudi Arabia', currency: 'SAR' },
  { code: 'AE', bn: 'সংযুক্ত আরব আমিরাত', en: 'UAE', currency: 'AED' },
  { code: 'QA', bn: 'কাতার', en: 'Qatar', currency: 'QAR' },
  { code: 'KW', bn: 'কুয়েত', en: 'Kuwait', currency: 'KWD' },
  { code: 'OM', bn: 'ওমান', en: 'Oman', currency: 'OMR' },
  { code: 'BH', bn: 'বাহরাইন', en: 'Bahrain', currency: 'BHD' },
  { code: 'MY', bn: 'মালয়েশিয়া', en: 'Malaysia', currency: 'MYR' },
  { code: 'SG', bn: 'সিঙ্গাপুর', en: 'Singapore', currency: 'SGD' },
  { code: 'US', bn: 'যুক্তরাষ্ট্র', en: 'United States', currency: 'USD' },
  { code: 'EU', bn: 'ইউরোপ (ইউরো অঞ্চল)', en: 'Europe (Eurozone)', currency: 'EUR' },
  { code: 'GB', bn: 'যুক্তরাজ্য', en: 'United Kingdom', currency: 'GBP' },
  { code: 'OT', bn: 'অন্য দেশ', en: 'Other country', currency: 'USD' },
];

export const RATE_SCALE = 1_000_000;

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBnDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Converts Bengali digits to ASCII and strips grouping commas/spaces. */
export function normalizeNumberInput(s: string): string {
  return s
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[,\s]/g, '')
    .trim();
}

function pow10(n: number): bigint {
  return 10n ** BigInt(n);
}

/** Rounded integer division, half away from zero. */
export function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new Error('division by zero');
  const neg = n < 0n !== d < 0n;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = (an * 2n + ad) / (ad * 2n);
  return neg ? -q : q;
}

/**
 * Parses a decimal string into an integer with `scaleDigits` implied decimals.
 * Extra decimals are rounded half-up. Returns null for anything that is not a
 * plain non-negative decimal number.
 */
export function parseScaled(input: string, scaleDigits: number): number | null {
  const s = normalizeNumberInput(input);
  if (!/^\d*(\.\d*)?$/.test(s) || s === '' || s === '.') return null;
  const [intPart, fracRaw = ''] = s.split('.');
  const frac = (fracRaw + '0'.repeat(scaleDigits + 1)).slice(0, scaleDigits + 1);
  const big = BigInt((intPart || '0') + frac);
  const rounded = divRound(big, 10n);
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(rounded);
}

/** "1,234.50" / "১২৩৪.৫" → minor units of the given currency. */
export function parseAmount(input: string, currency: CurrencyCode): number | null {
  return parseScaled(input, CURRENCIES[currency].decimals);
}

/** "32.40" → 32_400_000 (BDT per unit, micro). */
export function parseRate(input: string): number | null {
  const v = parseScaled(input, 6);
  return v === null || v <= 0 ? null : v;
}

export function minorToDecimalString(minor: number, currency: CurrencyCode): string {
  return scaledToString(minor, CURRENCIES[currency].decimals);
}

export function scaledToString(value: number, scaleDigits: number, trimZeros = false): string {
  const neg = value < 0;
  const abs = Math.abs(Math.trunc(value)).toString().padStart(scaleDigits + 1, '0');
  const int = abs.slice(0, abs.length - scaleDigits);
  let frac = scaleDigits > 0 ? abs.slice(abs.length - scaleDigits) : '';
  if (trimZeros) frac = frac.replace(/0+$/, '');
  return (neg ? '-' : '') + int + (frac ? '.' + frac : '');
}

export function rateToString(rateMicro: number): string {
  const s = scaledToString(rateMicro, 6, true);
  // Always show at least two decimals for readability: 32.4 → 32.40
  const [i, f = ''] = s.split('.');
  return i + '.' + f.padEnd(2, '0');
}

/** amount (any currency) → BDT minor (paisa) using a stored BDT-per-unit rate. */
export function toBdtMinor(amountMinor: number, currency: CurrencyCode, rateMicro: number): number {
  if (currency === 'BDT') return amountMinor;
  const dec = CURRENCIES[currency].decimals;
  const n = BigInt(amountMinor) * BigInt(rateMicro) * 100n;
  return Number(divRound(n, pow10(dec) * BigInt(RATE_SCALE)));
}

/** BDT minor (paisa) → amount in `currency` minor units using a BDT-per-unit rate. */
export function fromBdtMinor(bdtMinor: number, currency: CurrencyCode, rateMicro: number): number {
  if (currency === 'BDT') return bdtMinor;
  if (rateMicro <= 0) return 0;
  const dec = CURRENCIES[currency].decimals;
  const n = BigInt(bdtMinor) * pow10(dec) * BigInt(RATE_SCALE);
  return Number(divRound(n, BigInt(rateMicro) * 100n));
}

function groupIndian(int: string): string {
  // 1234567 → 12,34,567 (lakh / crore grouping used in Bangladesh)
  if (int.length <= 3) return int;
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return rest + ',' + last3;
}

function groupWestern(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export interface FormatOptions {
  /** Render digits in Bengali script. */
  bnDigits?: boolean;
  /** Hide the decimals when they are all zero. */
  compact?: boolean;
  /** Omit the currency symbol/code. */
  bare?: boolean;
}

export function formatMoney(minor: number, currency: CurrencyCode, opts: FormatOptions = {}): string {
  const info = CURRENCIES[currency];
  const neg = minor < 0;
  const raw = scaledToString(Math.abs(minor), info.decimals);
  const [int, frac = ''] = raw.split('.');
  const grouped = currency === 'BDT' ? groupIndian(int) : groupWestern(int);
  const showFrac = frac !== '' && !(opts.compact && /^0+$/.test(frac));
  let num = grouped + (showFrac ? '.' + frac : '');
  if (opts.bnDigits) num = toBnDigits(num);
  const sign = neg ? '−' : '';
  if (opts.bare) return sign + num;
  return currency === 'BDT' ? `${sign}${info.symbol}${num}` : `${sign}${num} ${info.code}`;
}

/** part / whole as basis points (1% = 100). Returns null when whole is 0. */
export function ratioBp(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Number(divRound(BigInt(part) * 10000n, BigInt(whole)));
}

export function formatPercentBp(bp: number | null, bnDigits = false): string {
  if (bp === null) return '—';
  const s = scaledToString(Math.round(bp / 10), 1) + '%';
  return bnDigits ? toBnDigits(s) : s;
}
