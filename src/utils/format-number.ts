// ----------------------------------------------------------------------

export type InputNumberValue = string | number | null | undefined;

type Options = Intl.NumberFormatOptions | undefined;

const LOCALE = { code: 'en-US', currency: 'PHP' };

function processInput(inputValue: InputNumberValue): number | null {
  if (inputValue == null || Number.isNaN(inputValue)) return null;
  return Number(inputValue);
}

// ----------------------------------------------------------------------

export function fNumber(inputValue: InputNumberValue, options?: Options) {
  const number = processInput(inputValue);
  if (number === null) return '';

  return new Intl.NumberFormat(LOCALE.code, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);
}

// ----------------------------------------------------------------------

export function fCurrency(inputValue: InputNumberValue, options?: Options) {
  const number = processInput(inputValue);
  if (number === null) return '';

  return new Intl.NumberFormat(LOCALE.code, {
    style: 'currency',
    currency: LOCALE.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);
}

// ----------------------------------------------------------------------

export function fData(inputValue: InputNumberValue) {
  const number = processInput(inputValue);
  if (number === null || number === 0) return '0 bytes';

  const units = ['bytes', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb'];
  const decimal = 2;
  const baseValue = 1024;

  const index = Math.floor(Math.log(number) / Math.log(baseValue));
  return `${parseFloat((number / baseValue ** index).toFixed(decimal))} ${units[index]}`;
}
