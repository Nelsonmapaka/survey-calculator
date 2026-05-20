function bankersRound(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return 0;
  const factor = Math.pow(10, decimals);
  const n = value * factor;
  const sign = n >= 0 ? 1 : -1;
  const absN = Math.abs(n);
  const integerPart = Math.floor(absN);
  const fractionalPart = absN - integerPart;
  let result;
  if (fractionalPart < 0.5) {
    result = integerPart;
  } else if (fractionalPart > 0.5) {
    result = integerPart + 1;
  } else {
    result = integerPart % 2 === 0 ? integerPart : integerPart + 1;
  }
  return (sign * result) / factor;
}

module.exports = bankersRound;
