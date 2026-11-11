import {
  divRound,
  formatMoney,
  formatPercentBp,
  fromBdtMinor,
  parseAmount,
  parseRate,
  rateToString,
  ratioBp,
  toBdtMinor,
} from '../src/domain/money';

describe('parsing', () => {
  it('parses plain, grouped and Bengali-digit amounts into minor units', () => {
    expect(parseAmount('4200', 'SAR')).toBe(420000);
    expect(parseAmount('4,200.50', 'SAR')).toBe(420050);
    expect(parseAmount('৬২,০০০', 'BDT')).toBe(6200000);
    expect(parseAmount('.5', 'SAR')).toBe(50);
    expect(parseAmount('1.250', 'KWD')).toBe(1250); // 3-decimal currency
  });
  it('rounds extra decimals half-up instead of truncating', () => {
    expect(parseAmount('10.005', 'SAR')).toBe(1001);
    expect(parseAmount('10.004', 'SAR')).toBe(1000);
  });
  it('rejects junk', () => {
    for (const bad of ['', '.', 'abc', '-5', '1.2.3', '1e3']) expect(parseAmount(bad, 'SAR')).toBeNull();
  });
  it('parses rates to micro precision and rejects zero', () => {
    expect(parseRate('32.40')).toBe(32_400_000);
    expect(parseRate('0')).toBeNull();
    expect(rateToString(32_400_000)).toBe('32.40');
    expect(rateToString(396_123_456)).toBe('396.123456');
  });
});

describe('conversion (the spreadsheet rows, 1 SAR = 32.40 BDT)', () => {
  const rate = 32_400_000;
  it('SAR → BDT matches the sheet', () => {
    expect(toBdtMinor(420000, 'SAR', rate)).toBe(13_608_000); // 4,200 SAR = ৳136,080
    expect(toBdtMinor(2000, 'SAR', rate)).toBe(64_800); // 20 SAR = ৳648
  });
  it('BDT → SAR matches the sheet', () => {
    expect(fromBdtMinor(6_200_000, 'SAR', rate)).toBe(191_358); // ৳62,000 = 1,913.58 SAR
  });
  it('has no floating point drift (0.1 + 0.2 problem)', () => {
    const a = parseAmount('0.10', 'SAR')!;
    const b = parseAmount('0.20', 'SAR')!;
    expect(a + b).toBe(parseAmount('0.30', 'SAR'));
  });
  it('handles 3-decimal currencies', () => {
    // 1.250 KWD at 396.50 = ৳495.625 → rounds half-up to ৳495.63
    expect(toBdtMinor(1250, 'KWD', 396_500_000)).toBe(49_563);
    expect(fromBdtMinor(49_563, 'KWD', 396_500_000)).toBe(1250);
  });
  it('BDT is identity', () => {
    expect(toBdtMinor(500, 'BDT', 1)).toBe(500);
    expect(fromBdtMinor(500, 'BDT', 1)).toBe(500);
  });
  it('divRound rounds half away from zero', () => {
    expect(divRound(5n, 2n)).toBe(3n);
    expect(divRound(-5n, 2n)).toBe(-3n);
    expect(divRound(4n, 3n)).toBe(1n);
  });
});

describe('formatting', () => {
  it('groups BDT in lakh/crore style and other currencies in thousands', () => {
    expect(formatMoney(13_608_000, 'BDT')).toBe('৳1,36,080.00');
    expect(formatMoney(13_608_000, 'BDT', { compact: true })).toBe('৳1,36,080');
    expect(formatMoney(123_456_789, 'SAR')).toBe('1,234,567.89 SAR');
  });
  it('renders Bengali digits and negatives', () => {
    expect(formatMoney(420000, 'SAR', { bnDigits: true })).toBe('৪,২০০.০০ SAR');
    expect(formatMoney(-6_200_000, 'BDT', { bnDigits: true, compact: true })).toBe('−৳৬২,০০০');
  });
  it('computes ratios in basis points', () => {
    expect(ratioBp(16642, 420000)).toBe(396); // 166.42 / 4200 = 3.96%
    expect(ratioBp(1, 0)).toBeNull();
    expect(formatPercentBp(396)).toBe('4.0%');
    expect(formatPercentBp(null)).toBe('—');
  });
});
