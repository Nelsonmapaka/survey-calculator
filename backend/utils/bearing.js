const bankersRound = require('./bankersRounding');

function dmsToDecimal(degrees, minutes, seconds) {
  const dec = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  return degrees >= 0 ? dec : -dec;
}

function decimalToDMS(decimal) {
  const sign = decimal >= 0 ? 1 : -1;
  const abs = Math.abs(decimal);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = bankersRound((abs - d - m / 60) * 3600, 2);
  return { degrees: d * sign, minutes: m, seconds: s };
}

function decimalToDMSString(decimal) {
  const { degrees, minutes, seconds } = decimalToDMS(decimal);
  return `${degrees}°${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"`;
}

function calculateJoin(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const bearingRad = Math.atan2(dy, dx);
  let bearingDeg = (bearingRad * 180 / Math.PI);
  bearingDeg = ((bearingDeg % 360) + 360) % 360;
  return {
    distance: bankersRound(distance, 3),
    bearingDeg: bankersRound(bearingDeg, 6),
    bearingDMS: decimalToDMSString(bearingDeg),
    dx: bankersRound(dx, 3),
    dy: bankersRound(dy, 3),
  };
}

function calculatePolar(x1, y1, bearingDeg, distance) {
  const bearingRad = bearingDeg * Math.PI / 180;
  const x2 = x1 + distance * Math.cos(bearingRad);
  const y2 = y1 + distance * Math.sin(bearingRad);
  return {
    x: bankersRound(x2, 3),
    y: bankersRound(y2, 3),
  };
}

function calculateAreaShoelace(points) {
  if (points.length < 3) return 0;
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += points[i].x * points[j].y;
    sum -= points[j].x * points[i].y;
  }
  const area = Math.abs(sum) / 2;
  const areaSqm = bankersRound(area, 3);
  let result = { areaSqm };
  if (area > 10000) {
    result.areaHa = bankersRound(area / 10000, 3);
    result.display = `${result.areaHa} ha`;
  } else {
    result.display = `${areaSqm} m²`;
  }
  return result;
}

module.exports = {
  dmsToDecimal,
  decimalToDMS,
  decimalToDMSString,
  calculateJoin,
  calculatePolar,
  calculateAreaShoelace,
};
