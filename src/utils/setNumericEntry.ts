export interface NumericEntry {
  value: string;
  replaceOnInput: boolean;
}

export const formatSetNumber = (value: string): string => value.replace('.', ',');

export const createNumericEntry = (value: string): NumericEntry => ({
  value: formatSetNumber(value),
  replaceOnInput: true,
});

// Empty values remain supported. Keep decimal strings intact; never round them.
export const confirmNumericEntry = (value: string): string | null => {
  if (value === '') return '';
  if (!/^\d+(?:,\d*)?$/.test(value)) return null;
  const normalized = value.replace(',', '.').replace(/\.$/, '');
  return Number.isFinite(Number(normalized)) ? normalized : null;
};

export const editNumericEntry = (entry: NumericEntry, key: string): NumericEntry => {
  if (key === 'clear') return { value: '', replaceOnInput: false };
  if (key === 'backspace') return { value: entry.value.slice(0, -1), replaceOnInput: false };
  let value: string;
  if (/^\d$/.test(key)) {
    value = entry.replaceOnInput ? key : entry.value + key;
  } else if (key === ',' || key === '.') {
    if (!entry.replaceOnInput && entry.value.includes(',')) return entry;
    value = entry.replaceOnInput || entry.value === '' ? '0,' : entry.value + ',';
  } else {
    return entry;
  }
  return confirmNumericEntry(value) === null ? entry : { value, replaceOnInput: false };
};

export const adjustSetReps = (value: string, delta: -1 | 1): string => {
  const normalized = value.replace(',', '.');
  const valid = /^\d+(?:\.\d+)?$/.test(normalized) && Number.isFinite(Number(normalized));
  const [integer, fraction] = (valid ? normalized : '0').split('.');
  // Change only the whole part, so a fractional value never loses precision.
  const next = BigInt(integer) + BigInt(delta);
  return next < 0n ? '0' : `${next}${fraction === undefined ? '' : `.${fraction}`}`;
};
