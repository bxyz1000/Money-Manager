import {
  MoneyError,
  assertValidPaise,
  formatPaiseAsINR,
  parseAmountToPaise,
  paiseToDecimalRupees,
  rupeesToPaise,
  subtractPaise,
  sumPaise,
} from '../money';

describe('parseAmountToPaise', () => {
  it('parses plain rupee amounts', () => {
    expect(parseAmountToPaise('1234')).toBe(123400);
    expect(parseAmountToPaise('0')).toBe(0);
  });

  it('parses two-decimal amounts', () => {
    expect(parseAmountToPaise('1234.56')).toBe(123456);
    expect(parseAmountToPaise('0.01')).toBe(1);
  });

  it('pads a single decimal place without rounding', () => {
    expect(parseAmountToPaise('10.5')).toBe(1050);
  });

  it('accepts thousands separators and the rupee symbol', () => {
    expect(parseAmountToPaise('1,234.56')).toBe(123456);
    expect(parseAmountToPaise('₹12,34,567.89')).toBe(123456789);
    expect(parseAmountToPaise('  ₹ 50 ')).toBe(5000);
  });

  it('preserves an explicit negative sign', () => {
    expect(parseAmountToPaise('-10.50')).toBe(-1050);
    expect(parseAmountToPaise('-₹2')).toBe(-200);
  });

  it('rejects more than two decimal places instead of rounding', () => {
    expect(() => parseAmountToPaise('10.555')).toThrow(MoneyError);
  });

  it('rejects empty, malformed, and numeric inputs', () => {
    expect(() => parseAmountToPaise('')).toThrow(MoneyError);
    expect(() => parseAmountToPaise('   ')).toThrow(MoneyError);
    expect(() => parseAmountToPaise('abc')).toThrow(MoneyError);
    expect(() => parseAmountToPaise('12.34.56')).toThrow(MoneyError);
    expect(() => parseAmountToPaise(12.5 as unknown as string)).toThrow(MoneyError);
  });
});

describe('rupeesToPaise', () => {
  it('converts whole rupees', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(0)).toBe(0);
  });

  it('rejects fractional rupees (forces an explicit decision)', () => {
    expect(() => rupeesToPaise(10.5)).toThrow(MoneyError);
  });
});

describe('formatPaiseAsINR', () => {
  it('formats basic amounts', () => {
    expect(formatPaiseAsINR(0)).toBe('₹0.00');
    expect(formatPaiseAsINR(5)).toBe('₹0.05');
    expect(formatPaiseAsINR(123456)).toBe('₹1,234.56');
  });

  it('uses Indian digit grouping', () => {
    expect(formatPaiseAsINR(10000000)).toBe('₹1,00,000.00');
    expect(formatPaiseAsINR(1234567)).toBe('₹12,345.67');
    expect(formatPaiseAsINR(123456789)).toBe('₹12,34,567.89');
    expect(formatPaiseAsINR(100000000000)).toBe('₹1,00,00,00,000.00');
  });

  it('formats negative amounts with a leading minus', () => {
    expect(formatPaiseAsINR(-50)).toBe('-₹0.50');
    expect(formatPaiseAsINR(-123456789)).toBe('-₹12,34,567.89');
  });

  it('rejects non-integer input', () => {
    expect(() => formatPaiseAsINR(10.5)).toThrow(MoneyError);
  });
});

describe('sumPaise / subtractPaise', () => {
  it('sums exactly with no float drift', () => {
    // The classic float trap: 0.1 + 0.2 !== 0.3 in floats.
    const a = parseAmountToPaise('0.10');
    const b = parseAmountToPaise('0.20');
    expect(sumPaise(a, b)).toBe(30); // 0.1 + 0.2 === 0.3 in paise, always.
  });

  it('handles large multi-value sums', () => {
    const values = [parseAmountToPaise('1,00,000'), rupeesToPaise(250), 999999];
    expect(sumPaise(...values)).toBe(10000000 + 25000 + 999999);
  });

  it('subtracts exactly', () => {
    expect(subtractPaise(123456, 234)).toBe(123222);
  });

  it('supports negatives for net calculations', () => {
    expect(subtractPaise(sumPaise(1000, 250), 3000)).toBe(-1750);
  });

  it('throws on unsafe integer overflow', () => {
    const big = Number.MAX_SAFE_INTEGER;
    expect(() => sumPaise(big, big)).toThrow(MoneyError);
    expect(() => subtractPaise(-big, big - 1)).toThrow(MoneyError);
  });
});

describe('assertValidPaise / paiseToDecimalRupees', () => {
  it('assertValidPaise accepts safe integers and rejects everything else', () => {
    expect(() => assertValidPaise(100)).not.toThrow();
    expect(() => assertValidPaise(-100)).not.toThrow();
    expect(() => assertValidPaise(Number.NaN)).toThrow(MoneyError);
    expect(() => assertValidPaise(Number.POSITIVE_INFINITY)).toThrow(MoneyError);
    expect(() => assertValidPaise(1.5)).toThrow(MoneyError);
  });

  it('paiseToDecimalRupees converts for display only', () => {
    expect(paiseToDecimalRupees(123456)).toBeCloseTo(1234.56, 10);
  });
});
