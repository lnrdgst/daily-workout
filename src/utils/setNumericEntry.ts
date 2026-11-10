export type NumericEntryMode = 'decimal' | 'integer';

export interface NumericEntry {
  value: string;
  replaceOnInput: boolean;
}

export const formatSetNumber = (value: string): string => value.replace('.', ',');

export const numberToDecimalString = (value: number): string => {
  const text = String(value);
  if (!text.includes('e') || !Number.isFinite(value)) return text;
  // Expand the shortest round-trippable representation without rounding its digits.
  const [coefficient, exponent] = Math.abs(value).toString().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = whole + fraction;
  const position = whole.length + Number(exponent);
  const decimal = position <= 0 ? '0.' + '0'.repeat(-position) + digits
    : position >= digits.length ? digits.padEnd(position, '0')
    : digits.slice(0, position) + '.' + digits.slice(position);
  return value < 0 ? '-' + decimal : decimal;
};

export const createNumericEntry = (value: string): NumericEntry => ({
  value: formatSetNumber(value),
  replaceOnInput: true,
});

// Empty values remain supported. Keep decimal strings intact; never round them.
export const confirmNumericEntry = (value: string, mode: NumericEntryMode = 'decimal'): string | null => {
  if (value === '') return '';
  if (mode === 'integer') return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? value : null;
  if (!/^\d+(?:,\d*)?$/.test(value)) return null;
  const normalized = value.replace(',', '.').replace(/\.$/, '');
  return Number.isFinite(Number(normalized)) ? normalized : null;
};

export const editNumericEntry = (entry: NumericEntry, key: string, mode: NumericEntryMode = 'decimal'): NumericEntry => {
  if (key === 'clear') return { value: '', replaceOnInput: false };
  if (key === 'backspace') return { value: entry.value.slice(0, -1), replaceOnInput: false };
  let value: string;
  if (/^\d$/.test(key)) {
    value = entry.replaceOnInput ? key : entry.value + key;
  } else if (mode === 'decimal' && (key === ',' || key === '.')) {
    if (!entry.replaceOnInput && entry.value.includes(',')) return entry;
    value = entry.replaceOnInput || entry.value === '' ? '0,' : entry.value + ',';
  } else {
    return entry;
  }
  if (mode === 'decimal' && confirmNumericEntry(value) === null) return entry;
  return { value, replaceOnInput: false };
};

export const adjustSetReps = (value: string, delta: -1 | 1): string => {
  const normalized = value.replace(',', '.');
  const valid = /^\d+(?:\.\d+)?$/.test(normalized) && Number.isFinite(Number(normalized));
  const [integer, fraction] = (valid ? normalized : '0').split('.');
  // Change only the whole part, so a fractional value never loses precision.
  const next = BigInt(integer) + BigInt(delta);
  return next < 0n ? '0' : `${next}${fraction === undefined ? '' : `.${fraction}`}`;
};
